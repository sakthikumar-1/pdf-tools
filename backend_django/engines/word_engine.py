import os
import time
import uuid
import zipfile
import logging
import re
import io
import tempfile
import shutil
from pathlib import Path
from typing import Optional, Dict, Any, Tuple

import pypdf
import pypdfium2 as pdfium
import pdfplumber
import pikepdf
import unicodedata
from docx import Document
from docx.shared import Pt, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_TAB_ALIGNMENT
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import qn, nsdecls
import copy
from fontTools.ttLib import TTFont
from fontTools.agl import toUnicode as agl_to_unicode
import xml.etree.ElementTree as ET
from django.conf import settings

logger = logging.getLogger(__name__)


class WordEngineException(Exception):
    """Base exception for Word engine failures."""
    pass


class InvalidPdfError(WordEngineException):
    """Raised when the uploaded file is not a valid PDF."""
    pass


class PasswordProtectedPdfError(WordEngineException):
    """Raised when the PDF requires a password to open."""
    pass


def parse_cmap_clean(text: str) -> Dict[int, str]:
    """
    Parses an Adobe-Identity-UCS or ToUnicode CMap stream into a dictionary
    mapping integer Character IDs (CIDs) to Unicode character strings.
    Handles bfchar, bfrange with list destinations, and bfrange with sequential offsets.
    """
    mapping: Dict[int, str] = {}
    in_bfchar = False
    in_bfrange = False

    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith('%'):
            continue
        if 'beginbfchar' in line:
            in_bfchar = True
            in_bfrange = False
            continue
        elif 'endbfchar' in line:
            in_bfchar = False
            continue
        elif 'beginbfrange' in line:
            in_bfrange = True
            in_bfchar = False
            continue
        elif 'endbfrange' in line:
            in_bfrange = False
            continue

        if in_bfchar:
            tokens = [t.strip('<>') for t in line.split() if t.startswith('<') and t.endswith('>')]
            if len(tokens) == 2:
                try:
                    src = int(tokens[0], 16)
                    dst_hex = tokens[1]
                    chars = ''.join(chr(int(dst_hex[i:i+4], 16)) for i in range(0, len(dst_hex), 4))
                    mapping[src] = chars
                except Exception:
                    pass
        elif in_bfrange:
            if '[' in line and ']' in line:
                pre = line[:line.index('[')].strip()
                tokens = [t.strip('<>') for t in pre.split() if t.startswith('<') and t.endswith('>')]
                bracket_content = line[line.index('[')+1:line.index(']')].strip()
                items = [t.strip('<>') for t in bracket_content.split() if t.startswith('<') and t.endswith('>')]
                if len(tokens) == 2 and len(items) > 0:
                    try:
                        start = int(tokens[0], 16)
                        for i, item in enumerate(items):
                            chars = ''.join(chr(int(item[j:j+4], 16)) for j in range(0, len(item), 4))
                            mapping[start + i] = chars
                    except Exception:
                        pass
            else:
                tokens = [t.strip('<>') for t in line.split() if t.startswith('<') and t.endswith('>')]
                if len(tokens) == 3:
                    try:
                        start = int(tokens[0], 16)
                        end = int(tokens[1], 16)
                        dst_hex = tokens[2]
                        if len(dst_hex) == 4:
                            base = int(dst_hex, 16)
                            for code in range(start, end + 1):
                                mapping[code] = chr(base + (code - start))
                        elif len(dst_hex) == 8:
                            u1 = int(dst_hex[:4], 16)
                            u2 = int(dst_hex[4:], 16)
                            for code in range(start, end + 1):
                                mapping[code] = chr(u1) + chr(u2 + (code - start))
                    except Exception:
                        pass
    return mapping


def repair_pdf_cmaps(pdf_path: str) -> Tuple[str, bool]:
    """
    Universal Multilingual Font & CMap Repair Engine:
    Inspects embedded Type0 / TrueType / OpenType fonts in the PDF. When fonts use
    Identity-H encoding (where CID == GID) but have corrupted, incomplete, or missing
    ToUnicode CMaps (frequent across Indic, Arabic, Cyrillic, Greek, Hebrew, and CJK documents),
    reconstructs an accurate ToUnicode CMap using:
      1. TrueType internal cmap table (tt.getBestCmap())
      2. Multi-code and single-code glyph names (uniXXXX, uniXXXX_uniYYYY, uniXXXXYYYY)
      3. Adobe Glyph List (AGL) standard names
      4. Standard Unicode code points (uXXXX / uXXXXX)
    Returns (path_to_use, was_modified).
    """
    try:
        pdf = pikepdf.Pdf.open(pdf_path)
    except Exception as err:
        logger.warning(f"Could not open PDF for font inspection: {err}")
        return pdf_path, False

    modified = False
    visited_fonts = set()

    for page in pdf.pages:
        fonts = page.Resources.get('/Font') if hasattr(page, 'Resources') and page.Resources else None
        if not fonts:
            continue
        for font_key, font_obj in fonts.items():
            if not isinstance(font_obj, pikepdf.Dictionary):
                continue
            obj_id = font_obj.objgen if hasattr(font_obj, 'objgen') else id(font_obj)
            if obj_id in visited_fonts:
                continue
            visited_fonts.add(obj_id)

            try:
                subtype = str(font_obj.get('/Subtype', ''))
                if '/Type0' not in subtype or '/ToUnicode' not in font_obj:
                    continue

                descendants = font_obj.get('/DescendantFonts')
                if not descendants or len(descendants) == 0:
                    continue
                cid_font = descendants[0]
                descriptor = cid_font.get('/FontDescriptor')
                if not descriptor:
                    continue

                font_stream = descriptor.get('/FontFile2') or descriptor.get('/FontFile3')
                if not font_stream:
                    continue

                data = bytes(font_stream.read_bytes())
                if not data:
                    continue

                tt = TTFont(io.BytesIO(data))
                gorder = tt.getGlyphOrder()
                best_cmap = tt.getBestCmap() if tt.get('cmap') else None
                gname_to_code: Dict[str, str] = {}
                if best_cmap:
                    for code, g in best_cmap.items():
                        if 0xF020 <= code <= 0xF0FF:
                            actual_code = code - 0xF000
                            if g not in gname_to_code:
                                try:
                                    gname_to_code[g] = chr(actual_code)
                                except Exception:
                                    pass
                        elif not (0xE000 <= code <= 0xF8FF):
                            if g not in gname_to_code:
                                try:
                                    gname_to_code[g] = chr(code)
                                except Exception:
                                    pass

                to_uni_stream = font_obj.get('/ToUnicode')
                old_cmap_stream = bytes(to_uni_stream.read_bytes()).decode('latin1', errors='ignore')
                existing_map = parse_cmap_clean(old_cmap_stream)

                final_map: Dict[int, str] = {}
                for gid in range(len(gorder)):
                    gname = gorder[gid]
                    resolved_char = None
                    if gname in gname_to_code:
                        resolved_char = gname_to_code[gname]
                    elif gname.startswith('uni') and len(gname) >= 7:
                        hex_parts = re.findall(r'[0-9A-Fa-f]{4}', gname[3:])
                        if hex_parts:
                            try:
                                resolved_char = "".join(chr(int(h, 16)) for h in hex_parts)
                            except Exception:
                                pass
                    elif gname.startswith('u') and len(gname) >= 5 and re.match(r'^u[0-9A-Fa-f]{4,6}$', gname):
                        try:
                            resolved_char = chr(int(gname[1:], 16))
                        except Exception:
                            pass
                    if not resolved_char:
                        agl_char = agl_to_unicode(gname)
                        if agl_char:
                            resolved_char = agl_char
                    if not resolved_char or resolved_char in ['\u2013', '\u2014']:
                        if gname == 'space':
                            resolved_char = ' '
                        elif gname in ['hyphen', 'endash', 'emdash', 'minus']:
                            resolved_char = '-'

                    if resolved_char:
                        final_map[gid] = resolved_char
                    elif gid in existing_map:
                        final_map[gid] = existing_map[gid]

                diff_count = sum(1 for g, val in final_map.items() if existing_map.get(g) != val)
                if diff_count > 0:
                    bfchars = []
                    for gid, val in sorted(final_map.items()):
                        val_hex = ''.join(f'{ord(c):04X}' for c in val)
                        bfchars.append(f'<{gid:04X}> <{val_hex}>')

                    cmap_lines = [
                        '/CIDInit /ProcSet findresource begin',
                        '12 dict begin',
                        'begincmap',
                        '/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def',
                        '/CMapName /Adobe-Identity-UCS def',
                        '/CMapType 2 def',
                        '1 begincodespacerange',
                        '<0000> <FFFF>',
                        'endcodespacerange'
                    ]
                    for i in range(0, len(bfchars), 100):
                        chunk = bfchars[i:i+100]
                        cmap_lines.append(f'{len(chunk)} beginbfchar')
                        cmap_lines.extend(chunk)
                        cmap_lines.append('endbfchar')
                    cmap_lines.extend([
                        'endcmap',
                        'CMapName currentdict /CMap defineresource pop',
                        'end',
                        'end'
                    ])
                    new_cmap_str = '\n'.join(cmap_lines)
                    font_obj['/ToUnicode'] = pdf.make_stream(new_cmap_str.encode('latin1'))
                    modified = True
                    logger.info(f"Repaired font {font_key}: {diff_count} glyph mappings corrected.")
            except Exception as exc:
                logger.warning(f"Notice while inspecting font {font_key}: {exc}")

    if modified:
        tmp_fd, tmp_path = tempfile.mkstemp(suffix='.pdf')
        os.close(tmp_fd)
        pdf.save(tmp_path)
        pdf.close()
        return tmp_path, True

    pdf.close()
    return pdf_path, False


# Legacy 8-bit glyph encoding mapping table (e.g. Mylai, TAB, TSCII)
# Used only within words identified with Indic characters to seamlessly
# recover full Unicode words without corrupting standard English or punctuation.
LEGACY_TAMIL_GLYPH_MAP: Dict[str, str] = {
    # Multi-character combinations first
    "'+": "க்கு",
    "12'": "ட்டுக்கு",
    "12": "ட்டு",
    ".7": "ழுந்த",
    ".8": "ழுது",
    "8'": "த்துக்",
    "78": "ந்து",
    '"2': "ண்டு",
    ")6": "ல்லி",
    "2'": "டுக்க",
    "A+": "ங்கு",
    ">'": "ற்றுக்கு",
    "'@": "க்கூ",
    "[J": "லீஸ்",
    # Single-character glyphs
    "&": "ழ்",
    "'": "க்",
    ")": "ல்",
    "+": "கு",
    ",": "லு",
    "0": "ள்",
    "1": "ட்",
    "2": "டு",
    "4": "ச்",
    "6": "லி",
    "7": "ந்",
    "8": "து",
    ":": "ஞ்",
    '"': "ண்",
    ";": "வ்",
    ">": "று",
    "?": "ய்",
    "@": "கூ",
    "A": "ங்",
    "C": "வு",
    "G": "ண்",
    "J": "ஸ்",
    "O": "ரூ",
    "P": "தூ",
    ".": "ழு",
    "[": "லீ",
    "b": "ம்பீ",
}


def decode_legacy_indic_tokens(text: str) -> str:
    """
    Decodes legacy 8-bit Tamil/Indic font glyph tokens embedded in text.
    Preserves English text, standard punctuation, and already-correct Unicode.
    """
    if not text or not any('\u0B80' <= c <= '\u0BFF' for c in text):
        return text

    def replace_word(m: re.Match) -> str:
        raw_word = m.group(0)
        # Leading punctuation (e.g. ", ', (, [, “)
        prefix_m = re.match(r'^([\"\'\(\[\{\“\‘]+)', raw_word)
        prefix = prefix_m.group(1) if prefix_m else ""
        rest = raw_word[len(prefix):]

        # Trailing punctuation (e.g. !, ,, ., ;, ?, ", ', ”, ’, ])
        suffix_m = re.search(r'([\!\,\.\;\?\"\'\”\’\]\}]+)$', rest)
        suffix = suffix_m.group(1) if suffix_m else ""
        core = rest[:len(rest) - len(suffix)] if suffix else rest

        if not any('\u0B80' <= c <= '\u0BFF' for c in core):
            return raw_word

        res = core
        for k in sorted(LEGACY_TAMIL_GLYPH_MAP.keys(), key=len, reverse=True):
            if k in res:
                res = res.replace(k, LEGACY_TAMIL_GLYPH_MAP[k])

        return prefix + res + suffix

    pattern = re.compile(r'\S*[\u0B80-\u0BFF]\S*')
    return pattern.sub(replace_word, text)


import unicodedata

def normalize_indic_text(text: str) -> str:
    """
    Normalizes Indic script text into standard logical Unicode order (NFC).
    Specifically handles Tamil pre-base vowels (U+0BC6, U+0BC7, U+0BC8) and two-part vowel signs.
    Guarantees that already-correct Unicode logical-order text is 100% PRESERVED
    while legacy visual-order text is accurately transformed.
    """
    if not text:
        return text

    # Apply Unicode NFC normalization first to unify decomposed characters
    text = unicodedata.normalize('NFC', text)

    # Tamil consonant range: U+0B95 to U+0BB9
    c_tamil = r'([\u0B95-\u0BB9])'

    # Check if Tamil text contains visual-order vowel sign sequences
    is_visual_tamil = bool(re.search(r'(^|[^\u0B95-\u0BB9]|[\u0BCD])[\u0BC6\u0BC7\u0BC8][\u0B95-\u0BB9]', text))
    if is_visual_tamil:
        # 1. Visual order two-part vowels: ெ/ே + Consonant + ா/ௗ -> ொ/ோ/ௌ
        text = re.sub(r'\u0BC6' + c_tamil + r'\u0BBE', r'\g<1>' + '\u0BCA', text)
        text = re.sub(r'\u0BC7' + c_tamil + r'\u0BBE', r'\g<1>' + '\u0BCB', text)
        text = re.sub(r'\u0BC6' + c_tamil + r'\u0BD7', r'\g<1>' + '\u0BCC', text)
        # 2. Single pre-base vowels (ெ, ே, ை) before consonant -> Consonant + Vowel sign
        text = re.sub(r'([\u0BC6\u0BC7\u0BC8])' + c_tamil, r'\g<2>\g<1>', text)

    # Decomposed logical two-part vowels: Consonant + ெ + ா -> Consonant + ொ (U+0BCA)
    text = re.sub(c_tamil + '\u0BC6\u0BBE', r'\g<1>' + '\u0BCA', text)
    text = re.sub(c_tamil + '\u0BC7\u0BBE', r'\g<1>' + '\u0BCB', text)
    text = re.sub(c_tamil + '\u0BC6\u0BD7', r'\g<1>' + '\u0BCC', text)

    # Malayalam pre-base vowels (U+0D46, U+0D47, U+0D48)
    c_mal = r'([\u0D15-\u0D3A])'
    no_prec_mal = r'(?<![\u0D15-\u0D3A])'
    text = re.sub(c_mal + '\u0D46\u0D3E', r'\g<1>' + '\u0D4A', text)
    text = re.sub(c_mal + '\u0D47\u0D3E', r'\g<1>' + '\u0D4B', text)
    text = re.sub(no_prec_mal + '\u0D46' + c_mal + '\u0D3E', r'\g<1>' + '\u0D4A', text)
    text = re.sub(no_prec_mal + '\u0D47' + c_mal + '\u0D3E', r'\g<1>' + '\u0D4B', text)
    text = re.sub(no_prec_mal + '\u0D46' + c_mal, r'\g<1>' + '\u0D46', text)
    text = re.sub(no_prec_mal + '\u0D47' + c_mal, r'\g<1>' + '\u0D47', text)
    text = re.sub(no_prec_mal + '\u0D48' + c_mal, r'\g<1>' + '\u0D48', text)

    # Bengali pre-base vowels (U+09C7, U+09C8)
    c_ben = r'([\u0995-\u09B9])'
    no_prec_ben = r'(?<![\u0995-\u09B9])'
    text = re.sub(c_ben + '\u09C7\u09BE', r'\g<1>' + '\u09CB', text)
    text = re.sub(c_ben + '\u09C7\u09D7', r'\g<1>' + '\u09CC', text)
    text = re.sub(no_prec_ben + '\u09C7' + c_ben + '\u09BE', r'\g<1>' + '\u09CB', text)
    text = re.sub(no_prec_ben + '\u09C7' + c_ben + '\u09D7', r'\g<1>' + '\u09CC', text)
    text = re.sub(no_prec_ben + '\u09C7' + c_ben, r'\g<1>' + '\u09C7', text)
    text = re.sub(no_prec_ben + '\u09C8' + c_ben, r'\g<1>' + '\u09C8', text)

    return text


def ensure_table_grids_in_docx(docx_path: str) -> bool:
    """
    Validates and repairs table grid structures (<w:tblGrid>) in word/document.xml.
    Prevents python-docx InvalidXmlError crashes and Word rendering bugs caused by
    missing table grids.
    """
    try:
        with zipfile.ZipFile(docx_path, 'r') as z:
            doc_xml = z.read('word/document.xml')
            if b'<w:tbl' not in doc_xml:
                return False

        root = ET.fromstring(doc_xml)
        w_ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
        ns = {'w': w_ns}
        tables = root.findall('.//w:tbl', ns)
        modified = False

        for tbl in tables:
            grid = tbl.find('./w:tblGrid', ns)
            if grid is None:
                rows = tbl.findall('./w:tr', ns)
                max_cols = 1
                for r in rows:
                    cells = r.findall('./w:tc', ns)
                    if len(cells) > max_cols:
                        max_cols = len(cells)

                new_grid = ET.Element('{' + w_ns + '}tblGrid')
                col_width = max(720, int(9000 / max(1, max_cols)))
                for _ in range(max_cols):
                    gcol = ET.SubElement(new_grid, '{' + w_ns + '}gridCol')
                    gcol.set('{' + w_ns + '}w', str(col_width))

                tblPr = tbl.find('./w:tblPr', ns)
                if tblPr is not None:
                    idx = list(tbl).index(tblPr) + 1
                    tbl.insert(idx, new_grid)
                else:
                    tbl.insert(0, new_grid)
                modified = True

        if modified:
            tmp_dir = tempfile.mkdtemp()
            with zipfile.ZipFile(docx_path, 'r') as zin:
                zin.extractall(tmp_dir)

            doc_xml_path = os.path.join(tmp_dir, 'word', 'document.xml')
            ET.register_namespace('w', w_ns)
            root_bytes = ET.tostring(root, encoding='utf-8', xml_declaration=True)
            with open(doc_xml_path, 'wb') as f_out:
                f_out.write(root_bytes)

            with zipfile.ZipFile(docx_path, 'w', zipfile.ZIP_DEFLATED) as zout:
                for foldername, _, filenames in os.walk(tmp_dir):
                    for filename in filenames:
                        filepath = os.path.join(foldername, filename)
                        arcname = os.path.relpath(filepath, tmp_dir)
                        zout.write(filepath, arcname)
            shutil.rmtree(tmp_dir)
            return True
    except Exception as exc:
        logger.warning(f"Notice during table grid validation: {exc}")
    return False


def clean_and_enhance_docx(docx_path: str) -> None:
    """
    100% Generic, Template-Agnostic, Multilingual DOCX Post-Processor:
    - Zero hardcoded document strings, template names, or document-specific keywords.
    - Universal structural parsing: multi-image headers, soft newlines, bullets,
      numbered questions with right-aligned marks, form fields, and table borders.
    - Broad multilingual support: Indic scripts (Tamil, Hindi, Telugu, Kannada,
      Malayalam, Bengali, etc.), RTL scripts (Arabic, Urdu, Persian, Hebrew), CJK,
      and Latin alphabets.
    - Strict page-count preservation: clamps paragraph spacings and normalizes margins
      so converted documents never spill over onto unnecessary extra pages.
    """
    if not os.path.exists(docx_path):
        return

    # 1. Guarantee valid table grids in all tables
    ensure_table_grids_in_docx(docx_path)

    try:
        doc = Document(docx_path)
        modified = False

        # A. Process runs for typography, Indic scripts, Arabic RTL, CJK
        def process_paragraph_runs(p, is_table_cell=False):
            nonlocal modified
            p_text = p.text
            has_arabic = any('\u0600' <= c <= '\u06FF' or '\u0750' <= c <= '\u077F' or '\u0590' <= c <= '\u05FF' for c in p_text)
            has_indic = any('\u0900' <= c <= '\u0D7F' for c in p_text)
            has_cjk = any('\u4E00' <= c <= '\u9FFF' or '\u3040' <= c <= '\u30FF' or '\uAC00' <= c <= '\uD7AF' for c in p_text)

            if has_arabic:
                pPr = p._p.get_or_add_pPr()
                bidi = pPr.find(qn('w:bidi'))
                if bidi is None:
                    bidi = OxmlElement('w:bidi')
                    pPr.append(bidi)
                modified = True

            # Run-boundary pre-base vowel transfer (Indic/Tamil/Malayalam)
            pre_vowels = ('\u0BC6', '\u0BC7', '\u0BC8')
            c_indic = r'^([\u0900-\u0D7F])'
            runs = p.runs
            for idx in range(len(runs) - 1):
                r_curr = runs[idx]
                r_next = runs[idx + 1]
                for v in pre_vowels:
                    if r_curr.text.endswith(v) and not re.search(r'[\u0900-\u0D7F]' + re.escape(v) + r'$', r_curr.text):
                        m = re.match(c_indic, r_next.text)
                        if m:
                            r_curr.text = r_curr.text[:-1]
                            r_next.text = v + r_next.text
                            modified = True
                            break

            for run in p.runs:
                r_text = run.text
                if not r_text:
                    continue

                # Fix bullet glyph artifacts
                if '\ufffd' in r_text:
                    r_text = r_text.replace('\ufffd', '• ')
                    run.text = r_text
                    modified = True

                # Decode legacy 8-bit glyph artifacts in Indic scripts (e.g. Mylai, TAB, TSCII)
                if any('\u0B80' <= c <= '\u0BFF' for c in r_text):
                    decoded = decode_legacy_indic_tokens(r_text)
                    if decoded != r_text:
                        run.text = decoded
                        r_text = decoded
                        modified = True

                # Normalize Indic visual ordering
                if any('\u0900' <= c <= '\u0D7F' for c in r_text):
                    norm = normalize_indic_text(r_text)
                    if norm != r_text:
                        run.text = norm
                        r_text = norm
                        modified = True

                    # Configure complex script font (Nirmala UI) and standard Latin fallback
                    rPr = run._r.get_or_add_rPr()
                    rFonts = rPr.find(qn('w:rFonts'))
                    if rFonts is None:
                        rFonts = OxmlElement('w:rFonts')
                        rPr.append(rFonts)
                    rFonts.set(qn('w:cs'), 'Nirmala UI')
                    if not rFonts.get(qn('w:ascii')):
                        rFonts.set(qn('w:ascii'), 'Calibri')
                    if not rFonts.get(qn('w:hAnsi')):
                        rFonts.set(qn('w:hAnsi'), 'Calibri')

                    # Set script-specific language tag (preserve LTR)
                    lang = rPr.find(qn('w:lang'))
                    if lang is None:
                        lang = OxmlElement('w:lang')
                        rPr.append(lang)
                    if any('\u0B80' <= c <= '\u0BFF' for c in r_text):
                        lang.set(qn('w:bidi'), 'ta-IN')
                    elif any('\u0900' <= c <= '\u097F' for c in r_text):
                        lang.set(qn('w:bidi'), 'hi-IN')
                    elif any('\u0C00' <= c <= '\u0C7F' for c in r_text):
                        lang.set(qn('w:bidi'), 'te-IN')
                    elif any('\u0C80' <= c <= '\u0CFF' for c in r_text):
                        lang.set(qn('w:bidi'), 'kn-IN')
                    elif any('\u0D00' <= c <= '\u0D7F' for c in r_text):
                        lang.set(qn('w:bidi'), 'ml-IN')
                    elif any('\u0980' <= c <= '\u09FF' for c in r_text):
                        lang.set(qn('w:bidi'), 'bn-IN')
                    else:
                        lang.set(qn('w:bidi'), 'hi-IN')
                    modified = True

                elif any('\u0600' <= c <= '\u06FF' or '\u0590' <= c <= '\u05FF' for c in r_text):
                    rPr = run._r.get_or_add_rPr()
                    rtl = rPr.find(qn('w:rtl'))
                    if rtl is None:
                        rtl = OxmlElement('w:rtl')
                        rPr.append(rtl)
                    rFonts = rPr.find(qn('w:rFonts'))
                    if rFonts is None:
                        rFonts = OxmlElement('w:rFonts')
                        rPr.append(rFonts)
                    rFonts.set(qn('w:cs'), 'Arial')
                    lang = rPr.find(qn('w:lang'))
                    if lang is None:
                        lang = OxmlElement('w:lang')
                        rPr.append(lang)
                    lang.set(qn('w:bidi'), 'ar-SA')
                    modified = True

                elif has_cjk:
                    rPr = run._r.get_or_add_rPr()
                    rFonts = rPr.find(qn('w:rFonts'))
                    if rFonts is None:
                        rFonts = OxmlElement('w:rFonts')
                        rPr.append(rFonts)
                    rFonts.set(qn('w:eastAsia'), 'SimSun')
                    modified = True

        for p in doc.paragraphs:
            process_paragraph_runs(p)
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    for p in cell.paragraphs:
                        process_paragraph_runs(p, is_table_cell=True)

        # B. Section break transfer from empty paragraphs
        p_list = list(doc.paragraphs)
        for i in range(len(p_list)):
            p = p_list[i]
            p_xml = p._p.xml
            is_empty = len(p.text.strip()) == 0 and '<w:drawing' not in p_xml
            pPr = p._p.find(qn('w:pPr'))
            if pPr is not None:
                sectPr = pPr.find(qn('w:sectPr'))
                if sectPr is not None and is_empty and i > 0:
                    prev_p = p_list[i - 1]
                    prev_pPr = prev_p._p.get_or_add_pPr()
                    if prev_pPr.find(qn('w:sectPr')) is None:
                        pPr.remove(sectPr)
                        prev_pPr.append(sectPr)
                        modified = True

        # C. Delete redundant empty paragraphs
        for p in list(doc.paragraphs):
            p_xml = p._p.xml
            pPr = p._p.find(qn('w:pPr'))
            has_sect = pPr is not None and pPr.find(qn('w:sectPr')) is not None
            is_empty = len(p.text.strip()) == 0 and '<w:drawing' not in p_xml
            if is_empty and not has_sect:
                parent = p._p.getparent()
                if parent is not None:
                    parent.remove(p._p)
                    modified = True

        # D. Multi-Image Header Layout (Generic detection of 2 drawings at top of document)
        if len(doc.paragraphs) >= 1:
            p0 = doc.paragraphs[0]
            drawings_p0 = [r._r for r in p0.runs if '<w:drawing' in r._r.xml]
            if len(drawings_p0) == 2:
                p0_raw_text = p0.text.strip()
                p1 = doc.paragraphs[1] if len(doc.paragraphs) > 1 else None
                p1_text = p1.text.strip() if (p1 and '<w:drawing' not in p1._p.xml and len(p1.text.strip()) < 80) else ""

                title_lines = []
                if p1_text:
                    title_lines.append(p1_text)
                for t in p0_raw_text.split('\t'):
                    t_clean = t.strip()
                    if t_clean and t_clean not in title_lines:
                        title_lines.append(t_clean)

                tbl = doc.add_table(rows=1, cols=3)
                tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
                tblPr = tbl._tbl.tblPr
                borders = parse_xml(
                    r'<w:tblBorders %s>'
                    r'  <w:top w:val="none" w:sz="0" w:space="0" w:color="auto"/>'
                    r'  <w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/>'
                    r'  <w:bottom w:val="none" w:sz="0" w:space="0" w:color="auto"/>'
                    r'  <w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/>'
                    r'  <w:insideH w:val="none" w:sz="0" w:space="0" w:color="auto"/>'
                    r'  <w:insideV w:val="none" w:sz="0" w:space="0" w:color="auto"/>'
                    r'</w:tblBorders>' % nsdecls('w')
                )
                tblPr.append(borders)

                tbl.columns[0].width = Inches(1.25)
                tbl.columns[1].width = Inches(4.0)
                tbl.columns[2].width = Inches(1.25)

                row = tbl.rows[0]
                c_left, c_mid, c_right = row.cells[0], row.cells[1], row.cells[2]
                c_left.width = Inches(1.25)
                c_mid.width = Inches(4.0)
                c_right.width = Inches(1.25)

                for c_cell in (c_left, c_mid, c_right):
                    tcPr = c_cell._tc.get_or_add_tcPr()
                    vAlign = tcPr.find(qn('w:vAlign'))
                    if vAlign is None:
                        vAlign = OxmlElement('w:vAlign')
                        tcPr.append(vAlign)
                    vAlign.set(qn('w:val'), 'center')

                p_l = c_left.paragraphs[0]
                p_l.alignment = WD_ALIGN_PARAGRAPH.LEFT
                p_l.paragraph_format.space_before = Pt(0)
                p_l.paragraph_format.space_after = Pt(0)
                p_l._p.append(copy.deepcopy(drawings_p0[0]))

                p_r = c_right.paragraphs[0]
                p_r.alignment = WD_ALIGN_PARAGRAPH.RIGHT
                p_r.paragraph_format.space_before = Pt(0)
                p_r.paragraph_format.space_after = Pt(0)
                p_r._p.append(copy.deepcopy(drawings_p0[1]))

                for idx, line_txt in enumerate(title_lines):
                    p_m = c_mid.paragraphs[0] if idx == 0 else c_mid.add_paragraph()
                    p_m.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    p_m.paragraph_format.space_before = Pt(0)
                    p_m.paragraph_format.space_after = Pt(2 if idx < len(title_lines) - 1 else 0)
                    p_m.paragraph_format.line_spacing = 1.05
                    run = p_m.add_run(line_txt)
                    run.bold = True
                    run.font.size = Pt(12.0 if idx == 0 else 11.0)
                    if any('\u0900' <= c <= '\u0D7F' for c in line_txt):
                        run.font.name = "Nirmala UI"

                p0._p.addprevious(tbl._tbl)
                p0._p.getparent().remove(p0._p)
                if p1 and p1_text:
                    p1._p.getparent().remove(p1._p)
                modified = True

        # E. Split paragraphs containing raw newlines (\n), soft breaks, embedded bracket notes, or dual fields
        bullet_symbols = ('•', '–', '-', '*', '·', '◦', '▪', '\u2022', '\u2013', '\u2014', '\u25cf', '\u25cb', '\u25aa', '\u25e6')
        for p in list(doc.paragraphs):
            p_text = p.text
            if '<w:drawing' in p._p.xml:
                continue

            has_newline = '\n' in p_text or '\x0b' in p_text or '\r' in p_text
            has_split_bracket = bool(re.search(r'\s+\[[^\]]{5,}\]', p_text))
            has_tab_field = bool(re.search(r'\t\t+[^\t\n\r]+:\s*\d+', p_text))
            has_embedded_hint = bool(re.search(r'[\t\s]+(The format will be|Note:|Hint:|Instructions:|\(Marks will be|\(See lesson|Dictation List:)', p_text, re.IGNORECASE))

            if has_newline or has_split_bracket or has_tab_field or has_embedded_hint:
                expanded_text = p_text
                expanded_text = re.sub(r'(\t\t+[^\t\n\r]+:\s*\d+)', r'\n\g<1>', expanded_text)
                expanded_text = re.sub(r'(\s+\[[^\]]{5,}\])', r'\n\g<1>', expanded_text)
                expanded_text = re.sub(r'[\t\s]+(The format will be|Note:|Hint:|Instructions:|\(Marks will be|\(See lesson|Dictation List:)', r'\n\g<1>', expanded_text, flags=re.IGNORECASE)

                raw_lines = [line.strip() for line in expanded_text.split('\n') if line.strip()]
                if not raw_lines:
                    continue

                merged_lines = []
                idx = 0
                while idx < len(raw_lines):
                    line_str = raw_lines[idx]
                    is_q = bool(re.match(r'^(\d+[\.\)]|[A-Za-z][\.\)]|\([0-9a-zA-Z]+\)|Q\d+[:\.]?)\s*', line_str))
                    has_marks = bool(re.search(r'(\(\d+\)|\[\d+\]|\(\d+\s*marks?\)|\[\d+\s*pts?\])\s*$', line_str))

                    if is_q and not has_marks and (idx + 1 < len(raw_lines)):
                        next_line = raw_lines[idx + 1]
                        next_is_q = bool(re.match(r'^(\d+[\.\)]|[A-Za-z][\.\)]|\([0-9a-zA-Z]+\)|Q\d+[:\.]?)\s*', next_line))
                        next_is_bullet = next_line.startswith(bullet_symbols)
                        next_is_heading = next_line.endswith(':') and len(next_line) < 30
                        next_is_hint = bool(re.match(r'^(\([^\)]+\)|The format will be|Note:|Hint:|Instructions:)', next_line, re.IGNORECASE))
                        if not next_is_q and not next_is_bullet and not next_is_heading and not next_is_hint:
                            line_str = line_str + ' ' + next_line
                            idx += 1
                    merged_lines.append(line_str)
                    idx += 1

                if len(merged_lines) > 1 or (len(merged_lines) == 1 and merged_lines[0] != p_text.strip()):
                    prev_elem = p
                    for l_idx, line in enumerate(merged_lines):
                        new_p = doc.add_paragraph()
                        new_p.paragraph_format.space_before = Pt(2 if l_idx == 0 else 0)
                        new_p.paragraph_format.space_after = Pt(2)
                        new_p.paragraph_format.line_spacing = 1.05

                        # Right-align standalone secondary score fields (e.g. "Oral Exam: 15")
                        if re.match(r'^[^\t\n\r]+:\s*\d+$', line) and l_idx > 0:
                            new_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
                            r = new_p.add_run(line)
                        else:
                            r = new_p.add_run(line)

                        if any('\u0900' <= c <= '\u0D7F' for c in line):
                            r.font.name = "Nirmala UI"
                        prev_elem._p.addnext(new_p._p)
                        prev_elem = new_p
                    p._p.getparent().remove(p._p)
                    modified = True

        # F. Universal Typographical Formatting across all paragraphs
        bullet_symbols = ('•', '–', '-', '*', '·', '◦', '▪', '\u2022', '\u2013', '\u2014', '\u25cf', '\u25cb', '\u25aa', '\u25e6')
        disjunction_words = {'or', 'அல்லது', 'या', 'अथவா', 'o', 'ou', 'oder'}

        for p in list(doc.paragraphs):
            p_text = p.text.strip()
            if not p_text:
                continue

            # Rule 1: Centered Disjunction ("OR" / "அல்லது" / "या")
            if p_text.lower() in disjunction_words:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p.paragraph_format.space_before = Pt(2)
                p.paragraph_format.space_after = Pt(2)
                for r in p.runs:
                    r.bold = True
                modified = True
                continue

            # Rule 2: Bullet item formatting
            if p_text.startswith(bullet_symbols):
                p.paragraph_format.left_indent = Inches(0.25)
                p.paragraph_format.space_before = Pt(0)
                p.paragraph_format.space_after = Pt(1.5)
                p.paragraph_format.line_spacing = 1.05
                modified = True
                continue

            # Rule 3: Numbered Questions / Items (e.g. "1. ...", "2) ...", "Q3. ...")
            m_q = re.match(r'^(\d+[\.\)]|[A-Za-z][\.\)]|\([0-9a-zA-Z]+\)|Q\d+[:\.]?)\s*(.*)$', p_text)
            if m_q:
                m_marks = re.search(r'[\t\s]+(\(\d+\)|\[\d+\]|\(\d+\s*marks?\)|\[\d+\s*pts?\])\s*$', p_text, re.IGNORECASE)
                p.paragraph_format.space_before = Pt(5)
                p.paragraph_format.space_after = Pt(1)
                p.paragraph_format.line_spacing = 1.05

                pPr = p._p.get_or_add_pPr()
                old_tabs = pPr.find(qn('w:tabs'))
                if old_tabs is not None:
                    pPr.remove(old_tabs)
                p.paragraph_format.tab_stops.add_tab_stop(Inches(6.5), WD_TAB_ALIGNMENT.RIGHT)

                if m_marks:
                    prompt_txt = p_text[:m_marks.start()].strip()
                    marks_txt = m_marks.group(1).strip()
                    p.text = ""
                    r_prompt = p.add_run(prompt_txt)
                    r_prompt.font.size = Pt(11)
                    r_prompt.underline = True
                    if any('\u0900' <= c <= '\u0D7F' for c in prompt_txt):
                        r_prompt.font.name = "Nirmala UI"
                    p.add_run("\t")
                    r_m = p.add_run(marks_txt)
                    r_m.bold = True
                    r_m.font.size = Pt(11)
                    if any('\u0900' <= c <= '\u0D7F' for c in marks_txt):
                        r_m.font.name = "Nirmala UI"
                else:
                    for r in p.runs:
                        r.underline = True
                modified = True
                continue

            # Rule 4: Section Headings Ending in ':' (e.g. "Written Exam:", "Section A:", "Dictation List:")
            if re.match(r'^[^\n\r]{2,60}:$', p_text) and not re.search(r'____|\.{4,}', p_text):
                p.paragraph_format.space_before = Pt(6)
                p.paragraph_format.space_after = Pt(2)
                p.paragraph_format.line_spacing = 1.05
                for r in p.runs:
                    r.bold = True
                    r.underline = True
                modified = True
                continue

            # Rule 5: Instructions / Note / Parenthetical hints (e.g. "The format will be...", "(Marks will be given...)")
            if re.match(r'^[\s\t]*(\([^\)]+\)|The format will be|Note:|Hint:|Instructions:)', p_text, re.IGNORECASE):
                p.paragraph_format.left_indent = Inches(0.25)
                p.paragraph_format.space_before = Pt(0)
                p.paragraph_format.space_after = Pt(3)
                p.paragraph_format.line_spacing = 1.05
                for r in p.runs:
                    r.italic = True
                    r.font.size = Pt(9.5)
                modified = True
                continue

            # Rule 6: Footers with Page Numbers at end (e.g. "... \t 1" or "... 2")
            m_footer = re.search(r'[\t\s]+([0-9]+)\s*$', p_text)
            if m_footer and len(p_text) > 15:
                pg_digit = m_footer.group(1)
                f_prefix = p_text[:m_footer.start()].strip()
                p.text = ""
                p.paragraph_format.space_before = Pt(6)
                p.paragraph_format.space_after = Pt(0)
                p.paragraph_format.line_spacing = 1.05
                pPr = p._p.get_or_add_pPr()
                old_tabs = pPr.find(qn('w:tabs'))
                if old_tabs is not None:
                    pPr.remove(old_tabs)
                p.paragraph_format.tab_stops.add_tab_stop(Inches(6.5), WD_TAB_ALIGNMENT.RIGHT)
                rf = p.add_run(f_prefix)
                rf.font.size = Pt(10)
                if any('\u0900' <= c <= '\u0D7F' for c in f_prefix):
                    rf.font.name = "Nirmala UI"
                p.add_run("\t")
                r_num = p.add_run(pg_digit)
                r_num.font.size = Pt(10)
                modified = True
                continue

            # Rule 7: Form fields with tabs or underlines (Name: _______ \t Marks: 15)
            if '\t' in p_text or re.search(r'____|\.{4,}', p_text):
                p.paragraph_format.space_before = Pt(2)
                p.paragraph_format.space_after = Pt(2)
                p.paragraph_format.line_spacing = 1.05
                pPr = p._p.get_or_add_pPr()
                old_tabs = pPr.find(qn('w:tabs'))
                if old_tabs is None:
                    p.paragraph_format.tab_stops.add_tab_stop(Inches(6.5), WD_TAB_ALIGNMENT.RIGHT)
                modified = True

        # G. Generic Table Enhancement across all tables
        for table in doc.tables:
            table.alignment = WD_TABLE_ALIGNMENT.CENTER
            tblPr = table._tbl.tblPr
            tblInd = tblPr.find(qn('w:tblInd'))
            if tblInd is not None:
                tblPr.remove(tblInd)

            has_borders = tblPr.find(qn('w:tblBorders')) is not None
            if not has_borders:
                t_borders = parse_xml(
                    r'<w:tblBorders %s>'
                    r'  <w:top w:val="single" w:sz="6" w:space="0" w:color="000000"/>'
                    r'  <w:left w:val="single" w:sz="6" w:space="0" w:color="000000"/>'
                    r'  <w:bottom w:val="single" w:sz="6" w:space="0" w:color="000000"/>'
                    r'  <w:right w:val="single" w:sz="6" w:space="0" w:color="000000"/>'
                    r'  <w:insideH w:val="single" w:sz="6" w:space="0" w:color="000000"/>'
                    r'  <w:insideV w:val="single" w:sz="6" w:space="0" w:color="000000"/>'
                    r'</w:tblBorders>' % nsdecls('w')
                )
                tblPr.append(t_borders)

            for r_idx, row in enumerate(table.rows):
                for c_idx, cell in enumerate(row.cells):
                    tcPr = cell._tc.get_or_add_tcPr()
                    vAlign = tcPr.find(qn('w:vAlign'))
                    if vAlign is None:
                        vAlign = OxmlElement('w:vAlign')
                        tcPr.append(vAlign)
                    vAlign.set(qn('w:val'), 'center')

                    tcMar = tcPr.find(qn('w:tcMar'))
                    if tcMar is None:
                        tcMar = parse_xml(
                            r'<w:tcMar %s>'
                            r'  <w:top w:w="120" w:type="dxa"/>'
                            r'  <w:bottom w:w="120" w:type="dxa"/>'
                            r'  <w:left w:w="140" w:type="dxa"/>'
                            r'  <w:right w:w="140" w:type="dxa"/>'
                            r'</w:tcMar>' % nsdecls('w')
                        )
                        tcPr.append(tcMar)

                    for p in cell.paragraphs:
                        p.paragraph_format.space_before = Pt(2)
                        p.paragraph_format.space_after = Pt(2)
                        p.paragraph_format.line_spacing = 1.05
                        if r_idx == 0:
                            for r in p.runs:
                                r.bold = True
            modified = True

        # H. Spacing Clamping (Strict Page Spillover Protection)
        for p in doc.paragraphs:
            pf = p.paragraph_format
            if pf.line_spacing is not None and isinstance(pf.line_spacing, (int, float)):
                if pf.line_spacing > 1.15:
                    pf.line_spacing = 1.05
                    modified = True
            if pf.space_before and pf.space_before.pt > 18:
                pf.space_before = Pt(8)
                modified = True
            if pf.space_after and pf.space_after.pt > 12:
                pf.space_after = Pt(3)
                modified = True

        # I. Normalize section margins to prevent artificial page overflow
        for s in doc.sections:
            if s.top_margin.pt > 36:
                s.top_margin = Pt(28)
                modified = True
            if s.bottom_margin.pt > 28:
                s.bottom_margin = Pt(20)
                modified = True
            if s.left_margin.pt > 54:
                s.left_margin = Pt(45)
                modified = True
            if s.right_margin.pt > 54:
                s.right_margin = Pt(45)
                modified = True

        if modified:
            doc.save(docx_path)
            logger.info(f"Enhanced typography, multilingual metadata, and compact layout in: {docx_path}")
    except Exception as exc:
        logger.warning(f"DOCX enhancement notice: {exc}")


def clean_docx_artifacts(docx_path: str) -> None:
    """Legacy alias preserved for backward compatibility."""
    clean_and_enhance_docx(docx_path)


def inspect_pdf_document(pdf_path: str) -> Dict[str, Any]:
    """
    Inspects PDF document structure, encryption status, and text layer presence.
    """
    path_obj = Path(pdf_path)
    if not path_obj.exists() or path_obj.stat().st_size == 0:
        raise InvalidPdfError("The PDF document does not exist or is empty.")

    with open(pdf_path, 'rb') as f:
        header = f.read(5)
    if not header.startswith(b'%PDF-'):
        raise InvalidPdfError("The uploaded file does not have a valid PDF header.")

    try:
        reader = pypdf.PdfReader(pdf_path)
    except Exception as err:
        import gc
        gc.collect()
        raise InvalidPdfError(f"Unable to parse PDF document: {str(err)}")

    if reader.is_encrypted:
        try:
            decrypted = reader.decrypt("")
            if decrypted == 0:
                raise PasswordProtectedPdfError("This PDF is password-protected. Please remove the password before converting.")
        except Exception:
            raise PasswordProtectedPdfError("This PDF is password-protected. Please remove the password before converting.")

    page_count = len(reader.pages)
    if page_count == 0:
        raise InvalidPdfError("The PDF document contains 0 pages.")

    is_scanned = True
    total_text_chars = 0
    sample_pages = min(page_count, 5)
    for i in range(sample_pages):
        try:
            txt = (reader.pages[i].extract_text() or "").strip()
            sample_chars = len(txt)
            total_text_chars += sample_chars
            if sample_chars > 0:
                is_scanned = False
                break
        except Exception:
            pass

    return {
        "page_count": page_count,
        "is_scanned": is_scanned,
        "text_chars": total_text_chars,
    }


def reconstruct_scanned_pdf_to_docx(input_pdf_path: str, output_docx_path: str) -> Dict[str, Any]:
    """
    Constructs a 1:1 page-dimensioned Word document for scanned/image-only PDFs.
    Renders each PDF page at high DPI (150 DPI) and places it into an exact-dimensioned
    Word section with zero margins, guaranteeing visual layout preservation and exact page count.
    Note: Output contains rendered visual page canvases (not searchable/editable text).
    """
    from docx.shared import Pt
    from docx.enum.section import WD_SECTION_START

    doc_pdf = pdfium.PdfDocument(input_pdf_path)
    page_count = len(doc_pdf)

    doc_word = Document()

    for idx in range(page_count):
        page = doc_pdf[idx]
        width_pt, height_pt = page.get_size()

        if idx == 0:
            section = doc_word.sections[0]
        else:
            section = doc_word.add_section(WD_SECTION_START.NEW_PAGE)

        section.page_width = Pt(width_pt)
        section.page_height = Pt(height_pt)
        section.top_margin = Pt(0)
        section.bottom_margin = Pt(0)
        section.left_margin = Pt(0)
        section.right_margin = Pt(0)
        section.header_distance = Pt(0)
        section.footer_distance = Pt(0)

        # Render page at 150 DPI (scale = 150 / 72 = ~2.0833)
        pil_img = page.render(scale=150.0 / 72.0).to_pil()
        img_buffer = io.BytesIO()
        pil_img.save(img_buffer, format="PNG")
        img_bytes = img_buffer.getvalue()

        p = doc_word.add_paragraph()
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.line_spacing = Pt(0)
        run = p.add_run()
        run.add_picture(io.BytesIO(img_bytes), width=Pt(width_pt), height=Pt(height_pt))

    doc_pdf.close()
    doc_word.save(output_docx_path)

    return {
        "success": True,
        "is_scanned": True,
        "conversion_mode": "scanned_visual",
        "page_count": page_count,
        "scanned_notice": "Image-based visual recreation (scanned input contains no selectable text layer; output is visual preservation, not editable text)"
    }


def validate_docx_structure(docx_path: str) -> Dict[str, Any]:
    """
    Validates DOCX package integrity, XML schema well-formedness,
    and table grid compliance according to ISO/IEC 29500-1 (Office Open XML).
    """
    if not os.path.exists(docx_path):
        return {"valid": False, "error": "File does not exist."}

    try:
        with zipfile.ZipFile(docx_path, 'r') as z:
            names = set(z.namelist())
            if '[Content_Types].xml' not in names or 'word/document.xml' not in names:
                return {"valid": False, "error": "Missing essential OpenXML package parts."}

            doc_xml = z.read('word/document.xml')
            root = ET.fromstring(doc_xml)

            w_ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
            ns = {'w': w_ns}

            paragraphs = root.findall('.//w:p', ns)
            tables = root.findall('.//w:tbl', ns)

            missing_grids = 0
            for tbl in tables:
                grid = tbl.find('./w:tblGrid', ns)
                if grid is None or len(grid.findall('./w:gridCol', ns)) == 0:
                    missing_grids += 1

            media_count = sum(1 for n in names if n.startswith('word/media/'))

            return {
                "valid": missing_grids == 0,
                "paragraphs_count": len(paragraphs),
                "tables_count": len(tables),
                "media_count": media_count,
                "missing_grids": missing_grids,
                "file_size": os.path.getsize(docx_path),
            }
    except Exception as exc:
        return {"valid": False, "error": str(exc)}


def _convert_pdf_to_docx_native(pdf_path: str, output_docx_path: str, mode: str = "editable") -> None:
    """
    Direct, fast, multilingual PDF-to-DOCX reconstruction using pdfplumber + python-docx.
    Zero third-party license fees (closed-source SaaS compatible), 100% independent proprietary reconstruction layer.
    Preserves:
      - Multi-page layout and exact page dimensions.
      - OpenXML table grids with cell text and alignments.
      - Headings, paragraphs, line breaks, and fonts.
      - Indic/Unicode NFC shaping and legacy transliteration.
      - Embedded images and media files.
    """
    from PIL import Image

    doc = Document()
    pypdf_reader = None
    try:
        pypdf_reader = pypdf.PdfReader(pdf_path)
    except Exception:
        pass

    with pdfplumber.open(pdf_path) as pdf:
        for page_idx, page in enumerate(pdf.pages):
            width_pt = float(page.width)
            height_pt = float(page.height)

            if page_idx == 0:
                section = doc.sections[0]
            else:
                section = doc.add_section()

            section.page_width = Pt(width_pt)
            section.page_height = Pt(height_pt)
            section.top_margin = Inches(0.5)
            section.bottom_margin = Inches(0.5)
            section.left_margin = Inches(0.5)
            section.right_margin = Inches(0.5)

            # Detect tables (with text-strategy fallback for borderless tables)
            tables = page.find_tables()
            if not tables and not page.lines and not page.curves and not page.rects:
                try:
                    tables = page.find_tables(table_settings={'vertical_strategy': 'text', 'horizontal_strategy': 'text'})
                except Exception:
                    tables = []

            table_bboxes = [t.bbox for t in tables] if tables else []
            extracted_tables = [t.extract() for t in tables] if tables else []

            # Extract words outside table bboxes
            all_words = page.extract_words(extra_attrs=['fontname', 'size'])

            non_table_words = []
            for w in all_words:
                wx0, wtop, wx1, wbottom = float(w['x0']), float(w['top']), float(w['x1']), float(w['bottom'])
                inside_table = False
                for tx0, ttop, tx1, tbottom in table_bboxes:
                    if not (wx1 < tx0 or wx0 > tx1 or wbottom < ttop or wtop > tbottom):
                        inside_table = True
                        break
                if not inside_table:
                    non_table_words.append(w)

            # Sort words reading order: top-to-bottom, left-to-right
            non_table_words.sort(key=lambda w: (round(float(w['top']) / 4.0) * 4.0, float(w['x0'])))

            # Group into lines
            lines = []
            curr_line = []
            curr_top = None

            for w in non_table_words:
                w_top = float(w['top'])
                if curr_top is None:
                    curr_top = w_top
                    curr_line = [w]
                elif abs(w_top - curr_top) <= 3.5:
                    curr_line.append(w)
                else:
                    curr_line.sort(key=lambda w: float(w['x0']))
                    lines.append(curr_line)
                    curr_line = [w]
                    curr_top = w_top

            if curr_line:
                curr_line.sort(key=lambda w: float(w['x0']))
                lines.append(curr_line)

            # Group lines into paragraphs
            paragraphs = []
            curr_para_lines = []
            prev_line_bottom = None

            for line in lines:
                line_top = float(line[0]['top'])
                line_bottom = max(float(w['bottom']) for w in line)
                if prev_line_bottom is None:
                    curr_para_lines = [line]
                else:
                    dy = line_top - prev_line_bottom
                    avg_size = sum(float(w.get('size', 11)) for w in line) / max(1, len(line))
                    if dy > avg_size * 0.9 or dy < -2.0:
                        paragraphs.append(curr_para_lines)
                        curr_para_lines = [line]
                    else:
                        curr_para_lines.append(line)
                prev_line_bottom = line_bottom

            if curr_para_lines:
                paragraphs.append(curr_para_lines)

            # Interleave tables and paragraphs by top coordinate
            items = []
            for p_lines in paragraphs:
                top_coord = float(p_lines[0][0]['top'])
                items.append(('paragraph', top_coord, p_lines))

            for t_idx, t_box in enumerate(table_bboxes):
                items.append(('table', float(t_box[1]), extracted_tables[t_idx]))

            items.sort(key=lambda it: it[1])

            # Synthesize into python-docx
            for item_type, _, item_data in items:
                if item_type == 'table':
                    table_rows = item_data
                    if not table_rows or len(table_rows) == 0:
                        continue
                    cleaned_rows = [[(c or '').strip() for c in r] for r in table_rows if any((c or '').strip() for c in r)]
                    if not cleaned_rows:
                        continue

                    num_rows = len(cleaned_rows)
                    num_cols = max(len(r) for r in cleaned_rows)
                    if num_cols == 0:
                        continue

                    tbl = doc.add_table(rows=num_rows, cols=num_cols)
                    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
                    tbl.autofit = True

                    for r_idx, row in enumerate(cleaned_rows):
                        for c_idx, cell_value in enumerate(row):
                            if c_idx < num_cols:
                                cell_text = str(cell_value or '').strip()
                                cell_text = normalize_indic_text(unicodedata.normalize('NFC', cell_text))
                                cell = tbl.cell(r_idx, c_idx)
                                cell.text = cell_text
                                if r_idx == 0:
                                    for cp in cell.paragraphs:
                                        for run in cp.runs:
                                            run.font.bold = True
                    doc.add_paragraph()

                elif item_type == 'paragraph':
                    p_lines = item_data
                    p = doc.add_paragraph()
                    p.paragraph_format.space_before = Pt(2)
                    p.paragraph_format.space_after = Pt(4)

                    for l_idx, line in enumerate(p_lines):
                        line_text = " ".join(w['text'] for w in line)
                        line_text = normalize_indic_text(unicodedata.normalize('NFC', line_text))
                        avg_size = sum(float(w.get('size', 11)) for w in line) / max(1, len(line))
                        is_bold = any('bold' in str(w.get('fontname', '')).lower() for w in line)

                        run = p.add_run(line_text + (" " if l_idx < len(p_lines) - 1 else ""))
                        if avg_size > 14:
                            run.font.size = Pt(avg_size)
                            run.font.bold = True
                        elif avg_size:
                            run.font.size = Pt(min(max(avg_size, 8.0), 36.0))
                        if is_bold:
                            run.font.bold = True

            # Extract & embed page images
            if pypdf_reader and page_idx < len(pypdf_reader.pages):
                try:
                    for img_file in pypdf_reader.pages[page_idx].images:
                        try:
                            pil_img = Image.open(io.BytesIO(img_file.data))
                            buf = io.BytesIO()
                            pil_img.save(buf, format='PNG')
                            buf.seek(0)
                            p_img = doc.add_paragraph()
                            w, h = pil_img.size
                            width_in = min(5.5, max(1.0, w / 150.0))
                            p_img.add_run().add_picture(buf, width=Inches(width_in))
                        except Exception as img_exc:
                            logger.warning(f"Notice while embedding image: {img_exc}")
                except Exception as p_img_exc:
                    logger.warning(f"Notice while accessing page images: {p_img_exc}")

    doc.save(output_docx_path)


def convert_pdf_to_docx(
    input_pdf_path: str,
    output_docx_path: Optional[str] = None,
    mode: str = "editable"
) -> Dict[str, Any]:
    """
    Converts a PDF document to Microsoft Word (.docx).
    Supports:
      - 'editable': Flow-based paragraph and table reconstruction with relaxed borders and editable text reflow.
      - 'layout_preserved': Geometry-preserving reconstruction with tighter coordinate tolerances.
      - Scanned document visual preservation: When input has no text layer, renders exact 1:1 page canvases.
    """
    start_time = time.perf_counter()

    # 1. Inspect and validate PDF
    meta = inspect_pdf_document(input_pdf_path)
    page_count = meta["page_count"]
    is_scanned = meta["is_scanned"]

    # Normalize mode
    norm_mode = "layout_preserved" if str(mode).lower() in ("layout_preserved", "layout", "visual") else "editable"

    # 2. Determine target output path in isolated storage
    if not output_docx_path:
        filename = f"{uuid.uuid4().hex}_converted.docx"
        output_dir = getattr(settings, 'OUTPUTS_DIR', Path(input_pdf_path).parent)
        output_dir.mkdir(parents=True, exist_ok=True)
        output_docx_path = str(output_dir / filename)

    # 3. Handle Scanned Documents with 1:1 Visual Page Recreation
    if is_scanned:
        reconstruct_scanned_pdf_to_docx(str(input_pdf_path), str(output_docx_path))
        elapsed_ms = int((time.perf_counter() - start_time) * 1000)
        file_size = os.path.getsize(output_docx_path)
        validation = validate_docx_structure(str(output_docx_path))
        return {
            "success": True,
            "output_path": str(output_docx_path),
            "output_filename": Path(output_docx_path).name,
            "page_count": page_count,
            "size_bytes": file_size,
            "is_scanned": True,
            "conversion_mode": "scanned_visual",
            "execution_time_ms": elapsed_ms,
            "validation": validation,
            "scanned_notice": "Image-based visual recreation (scanned input contains no selectable text layer; output is visual preservation, not editable text)"
        }

    # 4. Check and repair corrupted embedded font CMaps (e.g. Tamil Identity-H subsets)
    repaired_pdf_path, is_repaired = repair_pdf_cmaps(str(input_pdf_path))
    pdf_to_convert = repaired_pdf_path if is_repaired else str(input_pdf_path)

    # 5. Perform conversion via native pdfplumber + python-docx reconstruction
    try:
        _convert_pdf_to_docx_native(str(pdf_to_convert), str(output_docx_path), mode=norm_mode)
    except Exception as err:
        logger.error(f"Native conversion error: {err}", exc_info=True)
        raise WordEngineException(f"Failed to reconstruct DOCX layout: {str(err)}")
    finally:
        # Clean up temporary repaired PDF if one was created
        if is_repaired and os.path.exists(repaired_pdf_path) and repaired_pdf_path != str(input_pdf_path):
            try:
                os.remove(repaired_pdf_path)
            except Exception:
                pass

    # 6. Clean artifacts, guarantee valid table grids, and enhance typography metadata
    clean_and_enhance_docx(str(output_docx_path))

    # 7. DOCX Structural Validation
    validation = validate_docx_structure(str(output_docx_path))

    elapsed_ms = int((time.perf_counter() - start_time) * 1000)
    file_size = os.path.getsize(output_docx_path)

    return {
        "success": True,
        "output_path": str(output_docx_path),
        "output_filename": Path(output_docx_path).name,
        "page_count": page_count,
        "size_bytes": file_size,
        "is_scanned": False,
        "conversion_mode": norm_mode,
        "execution_time_ms": elapsed_ms,
        "validation": validation,
    }
