/**
 * Simatrix PDF Tools - Intelligent Text Spacing, Multi-Level Section Detection & Word-Style Reflow Utility
 * 
 * Provides:
 * 1. High-precision typographic text measurement using standard PDF font metrics.
 * 2. Visual line clustering and contiguous segment splitting.
 * 3. Section & semantic detection: Word, Line, Heading, Subtitle, and Paragraph levels.
 * 4. Automatic text wrapping and height calculation constrained within page boundaries.
 * 5. Case-pattern inheritance and capitalization transform.
 * 6. Line & paragraph reflow calculations ensuring zero overlapping.
 */

// Canvas context cache for high-precision typographic text measurement
let measureCanvas = null;
let measureCtx = null;

/**
 * Measures the exact typographic rendered width of a text string in points.
 * Uses browser canvas 2D context at 1:1 scale with font stack matching standard PDF fonts.
 * 
 * @param {string} text 
 * @param {string} fontFamily 
 * @param {number} fontSize 
 * @param {boolean} bold 
 * @param {boolean} italic 
 * @returns {number} Width in points (px at scale 1.0)
 */
export function measureTextWidth(text, fontFamily = 'Helvetica', fontSize = 14, bold = false, italic = false) {
  if (!text) return 0;

  if (typeof document !== 'undefined') {
    if (!measureCtx) {
      measureCanvas = document.createElement('canvas');
      measureCtx = measureCanvas.getContext('2d');
    }

    const weight = bold ? 'bold' : 'normal';
    const style = italic ? 'italic' : 'normal';
    const fontStack =
      fontFamily === 'Times Roman'
        ? '"Times New Roman", Times, Georgia, serif'
        : fontFamily === 'Courier'
        ? '"Courier New", Courier, monospace'
        : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

    measureCtx.font = `${style} ${weight} ${fontSize}px ${fontStack}`;
    const metrics = measureCtx.measureText(text);
    return Math.round(metrics.width * 100) / 100;
  }

  // Node.js fallback (based on standard font character widths)
  const factor = fontFamily === 'Courier' ? 0.6 : (bold ? 0.62 : 0.55);
  return Math.round(text.length * fontSize * factor * 100) / 100;
}

/**
 * Checks if a string contains characters that descend below the baseline.
 * Standard Latin descenders: g, j, p, q, y and descending punctuation (comma, semicolon).
 * 
 * @param {string} text 
 * @returns {boolean}
 */
export function hasDescenderGlyphs(text) {
  if (!text || typeof text !== 'string') return false;
  return /[gjpqyQ;,_\(\)\[\]]/.test(text);
}

/**
 * Canonical PostScript / Standard 14 font ascender ratio (ascent / unitsPerEm).
 * Exact metrics:
 * - Helvetica / Helvetica-Bold / Arial: Ascender = 718 / 1000 = 0.718
 * - Times-Roman / Times-Bold: Ascender = 683 / 1000 = 0.683
 * - Courier / Courier-Bold: Ascender = 629 / 1000 = 0.629
 * 
 * @param {string} fontFamily
 * @returns {number} Ascent ratio
 */
export function getFontAscentRatio(fontFamily) {
  const fam = String(fontFamily || '').toLowerCase();
  if (fam.includes('times') || fam.includes('serif') || fam.includes('roman') || fam.includes('georgia') || fam.includes('cambria')) {
    return 0.683;
  }
  if (fam.includes('courier') || fam.includes('mono') || fam.includes('consolas') || fam.includes('menlo')) {
    return 0.629;
  }
  return 0.718;
}

/**
 * Canonical PostScript / Standard 14 font descender ratio (abs(descender) / unitsPerEm).
 * Exact metrics:
 * - Helvetica / Helvetica-Bold / Arial: Descender = -207 / 1000 = 0.207
 * - Times-Roman / Times-Bold: Descender = -217 / 1000 = 0.217
 * - Courier / Courier-Bold: Descender = -157 / 1000 = 0.157
 * 
 * @param {string} fontFamily
 * @returns {number} Descent ratio
 */
export function getFontDescentRatio(fontFamily) {
  const fam = String(fontFamily || '').toLowerCase();
  if (fam.includes('times') || fam.includes('serif') || fam.includes('roman') || fam.includes('georgia') || fam.includes('cambria')) {
    return 0.217;
  }
  if (fam.includes('courier') || fam.includes('mono') || fam.includes('consolas') || fam.includes('menlo')) {
    return 0.157;
  }
  return 0.207;
}

/**
 * Universal list of bullet and list-marker symbols supported in resumes and technical documents.
 * Includes diamonds (◆, ◇), circles (•, ●, ○, ⦿), squares (▪, ▫, ■, □), checkmarks (✔, ✓, ☑),
 * arrows (➔, ➜, ➤, →), dashes (–, —), and traditional markers (*, +, ⁃).
 */
export const BULLET_SYMBOLS = [
  '◆', '◇', '◈', '❖', '✦', '✧',
  '•', '●', '○', '⦿', '▪', '▫', '■', '□',
  '▲', '►', '▸', '▼', '▶', '★', '☆',
  '✔', '✓', '☑',
  '➔', '➜', '➤', '→', '➢', '–', '—', '-', '*', '+', '⁃'
];

export const BULLET_SYMBOLS_SET = new Set(BULLET_SYMBOLS);

/**
 * Checks if a word or character is an independent bullet or list-marker symbol.
 * 
 * @param {Object|string} word
 * @returns {boolean}
 */
export function isBulletWord(word) {
  if (!word) return false;
  const t = (typeof word === 'string' ? word : word.text || '').trim();
  if (!t) return false;
  if (BULLET_SYMBOLS_SET.has(t)) return true;
  if (/^([◆◇◈❖✦✧•●○⦿▪▫■□▲►▸▼▶★☆✔✓☑➔➜➤→➢–—*+\-⁃]|\d+[\.\)]|[a-zA-Z][\.\)])$/.test(t)) return true;
  return false;
}

/**
 * Groups word tokens into coherent horizontal visual lines and contiguous segments
 * based on vertical baseline proximity and reasonable horizontal word gaps.
 * Uses exact typographic baseline coordinates rather than bounding box tops to prevent
 * lines with mixed font sizes from misaligning or colliding with adjacent lines.
 * 
 * @param {Array<Object>} words - Array of parsed word tokens
 * @returns {Array<Object>} Array of line objects containing sorted words
 */
export function groupWordsIntoLines(words) {
  if (!words || words.length === 0) return [];

  // Sort words vertically top-to-bottom using exact typographic baseline if available,
  // then horizontally left-to-right
  const sorted = [...words].sort((a, b) => {
    const aBase = a.baselinePtY !== undefined ? a.baselinePtY : a.ptY;
    const bBase = b.baselinePtY !== undefined ? b.baselinePtY : b.ptY;
    const diffY = aBase - bBase;
    if (Math.abs(diffY) > 3) {
      return diffY;
    }
    return a.ptX - b.ptX;
  });

  const rawLines = [];

  for (const w of sorted) {
    const wBase = w.baselinePtY !== undefined ? w.baselinePtY : w.ptY;
    // Find an existing baseline within precise typographic tolerance (<= 3.0pt)
    const match = rawLines.find((l) => {
      const lBase = l.baselinePtY !== undefined ? l.baselinePtY : l.ptY;
      return Math.abs(lBase - wBase) <= 3.0;
    });

    if (match) {
      match.words.push(w);
      match.minPtX = Math.min(match.minPtX, w.ptX);
      match.maxPtX = Math.max(match.maxPtX, w.ptX + w.ptWidth);
      match.ptHeight = Math.max(match.ptHeight, w.ptHeight);
    } else {
      rawLines.push({
        id: `line_${w.page || 1}_${rawLines.length}`,
        page: w.page || 1,
        ptY: w.ptY,
        baselinePtY: w.baselinePtY,
        pdfBaselineY: w.pdfBaselineY,
        pdfBaselineX: w.pdfBaselineX,
        ptHeight: w.ptHeight,
        fontSize: w.fontSize,
        fontFamily: w.fontFamily,
        bold: w.bold,
        italic: w.italic,
        color: w.color || '#111827',
        minPtX: w.ptX,
        maxPtX: w.ptX + w.ptWidth,
        words: [w],
      });
    }
  }

  // Now, within each baseline line, split into contiguous segments if there is a large gap,
  // delimiter, or distinct semantic transition (e.g. bold name vs regular subtitle or multi-column)
  const finalLines = [];

  for (const rawLine of rawLines) {
    rawLine.words.sort((a, b) => a.ptX - b.ptX);

    // Merge adjacent word fragments (handles words split across spans, kerning, tracking, and ligatures)
    const mergedWords = [];
    for (let i = 0; i < rawLine.words.length; i++) {
      const curWord = rawLine.words[i];
      if (mergedWords.length === 0) {
        mergedWords.push({ ...curWord });
      } else {
        const prevWord = mergedWords[mergedWords.length - 1];
        const gap = curWord.ptX - (prevWord.ptX + prevWord.ptWidth);
        const fSize = curWord.fontSize || prevWord.fontSize || 12;
        // True kerning/ligature gap is tight (<= 0.8pt). Normal word spaces are >= 1.5pt.
        const maxKerningGap = Math.min(0.8, fSize * 0.06);
        const hasSpace = /\s/.test(prevWord.text) || /\s/.test(curWord.text);
        const isCamelCaseWordSplit = /[a-z]$/.test(prevWord.text) && /^[A-Z]/.test(curWord.text);
        const isSymbolWord = isBulletWord(prevWord) || isBulletWord(curWord);

        // Never merge separate words, symbols, or camelCase transitions
        const shouldMerge = gap <= maxKerningGap && !hasSpace && !isCamelCaseWordSplit && !isSymbolWord;

        if (shouldMerge) {
          // Contiguous fragment: merge into one complete word
          prevWord.text = prevWord.text + curWord.text;
          prevWord.ptWidth = Math.round((curWord.ptX + curWord.ptWidth - prevWord.ptX) * 100) / 100;
          prevWord.ptHeight = Math.max(prevWord.ptHeight, curWord.ptHeight);
          if (curWord.pdfBaselineY !== undefined) {
            prevWord.pdfBaselineY = curWord.pdfBaselineY;
          }
          if (curWord.baselinePtY !== undefined) {
            prevWord.baselinePtY = curWord.baselinePtY;
          }
        } else {
          mergedWords.push({ ...curWord });
        }
      }
    }
    rawLine.words = mergedWords;

    let currentSegmentWords = [];
    let segmentIndex = 0;

    for (let i = 0; i < rawLine.words.length; i++) {
      const curWord = rawLine.words[i];

      if (currentSegmentWords.length === 0) {
        currentSegmentWords.push(curWord);
      } else {
        const prevWord = currentSegmentWords[currentSegmentWords.length - 1];
        const gap = curWord.ptX - (prevWord.ptX + prevWord.ptWidth);
        const curSize = curWord.fontSize || 12;
        const prevSize = prevWord.fontSize || 12;
        const sizeDiff = Math.abs(curSize - prevSize);
        const weightDiff = (!!curWord.bold) !== (!!prevWord.bold);
        const isSeparator = curWord.text === '|' || prevWord.text === '|' ||
                            curWord.text === '•' || prevWord.text === '•' ||
                            curWord.text === '-' || prevWord.text === '-';
        const maxGap = Math.max(36, Math.max(curSize, prevSize) * 2.8);

        // Split into separate segment if large gap, delimiter, or font size/weight transition
        const shouldSplit = (gap > maxGap) ||
                            (gap > 12 && (sizeDiff >= 3 || (weightDiff && gap > 10))) ||
                            (isSeparator && gap > 6);

        if (shouldSplit) {
          finalLines.push(createLineSegment(rawLine, currentSegmentWords, segmentIndex++));
          currentSegmentWords = [curWord];
        } else {
          currentSegmentWords.push(curWord);
        }
      }
    }

    if (currentSegmentWords.length > 0) {
      finalLines.push(createLineSegment(rawLine, currentSegmentWords, segmentIndex++));
    }
  }

  // Link words to their line segments
  for (const line of finalLines) {
    for (let i = 0; i < line.words.length; i++) {
      line.words[i].lineId = line.id;
      line.words[i].wordIndexInLine = i;
    }
  }

  return finalLines;
}

function createLineSegment(baseLine, words, segmentIndex) {
  const minPtX = Math.min(...words.map((w) => w.ptX));
  const maxPtX = Math.max(...words.map((w) => w.ptX + w.ptWidth));
  const maxPtH = Math.max(...words.map((w) => w.ptHeight));
  const leadWord = words[0];

  const hasBullet = words.length > 1 && isBulletWord(words[0]);
  const bulletWord = hasBullet ? words[0] : null;
  const contentWords = hasBullet ? words.slice(1) : words;
  const textStartX = contentWords.length > 0 ? contentWords[0].ptX : minPtX;
  const bulletGap = hasBullet && contentWords.length > 0
    ? Math.max(4, contentWords[0].ptX - (bulletWord.ptX + bulletWord.ptWidth))
    : 0;

  return {
    id: `${baseLine.id}_seg_${segmentIndex}`,
    page: baseLine.page,
    ptX: minPtX,
    ptY: baseLine.ptY,
    ptWidth: maxPtX - minPtX,
    ptHeight: maxPtH,
    baselinePtY: leadWord.baselinePtY !== undefined ? leadWord.baselinePtY : baseLine.baselinePtY,
    pdfBaselineY: leadWord.pdfBaselineY !== undefined ? leadWord.pdfBaselineY : baseLine.pdfBaselineY,
    pdfBaselineX: leadWord.pdfBaselineX !== undefined ? leadWord.pdfBaselineX : baseLine.pdfBaselineX,
    fontSize: leadWord.fontSize || baseLine.fontSize,
    fontFamily: leadWord.fontFamily || baseLine.fontFamily,
    bold: leadWord.bold,
    italic: leadWord.italic,
    color: leadWord.color || baseLine.color || '#111827',
    minPtX,
    maxPtX,
    words,
    fullOriginalText: words.map((w) => w.text).join(' '),
    hasBullet,
    bulletWord,
    contentWords,
    textStartX,
    bulletGap,
  };
}

// Known resume heading keywords and patterns for robust semantic section detection
export const RESUME_HEADING_KEYWORDS = [
  'SUMMARY',
  'PROFESSIONAL SUMMARY',
  'EXECUTIVE SUMMARY',
  'CAREER OBJECTIVE',
  'OBJECTIVE',
  'PROFILE',
  'ABOUT ME',
  'SKILLS',
  'TECHNICAL SKILLS',
  'CORE COMPETENCIES',
  'EXPERIENCE',
  'WORK EXPERIENCE',
  'EMPLOYMENT HISTORY',
  'PROFESSIONAL EXPERIENCE',
  'PROJECTS',
  'KEY PROJECTS',
  'PERSONAL PROJECTS',
  'EDUCATION',
  'EDUCATIONAL BACKGROUND',
  'ACADEMIC BACKGROUND',
  'CERTIFICATIONS',
  'CERTIFICATES',
  'LICENSES',
  'ACHIEVEMENTS',
  'ACCOMPLISHMENTS',
  'AWARDS',
  'HONORS',
  'PUBLICATIONS',
  'LANGUAGES',
  'VOLUNTEER EXPERIENCE',
  'VOLUNTEERING',
  'REFERENCES',
  'INTERESTS',
  'AFFILIATIONS',
];

export const BULLET_REGEX = /^(\s*([◆◇◈❖✦✧•●○⦿▪▫■□▲►▸▼✔✓☑➔➜➤→–—*+\-⁃]|\d+[\.\)]|[a-zA-Z][\.\)]|\([0-9a-zA-Z]+\)))\s+/;
export const CONTACT_REGEX = /(@|linkedin\.com|github\.com|\b(phone|tel|mobile|email|e-mail)\b|(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\.com\b|\.org\b|\.net\b|\.edu\b|\.in\b)/i;
export const DATE_RANGE_REGEX = /\b((?:19|20)\d{2}|Present|Current|Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b.*?\b((?:19|20)\d{2}|Present|Current)\b/i;

/**
 * Classifies a line's semantic role (title, contact, heading, subtitle, bullet, or standard body line)
 * based on font size ratio to page median, weight, textual length, and typographic patterns.
 * 
 * @param {Object} line 
 * @param {number} [medianBodyFontSize=12] 
 * @returns {'title' | 'contact' | 'heading' | 'subtitle' | 'bullet' | 'line'}
 */
export function classifyLineSemantic(line, medianBodyFontSize = 12) {
  if (!line) return 'line';
  const size = line.fontSize || 12;
  const isBold = !!line.bold;
  const rawText = (line.fullOriginalText || '').trim();
  const textLen = rawText.length;
  if (!textLen) return 'line';

  // 1. Bullet check: Starts with bullet glyph, dash, asterisk, or numbered prefix
  if (BULLET_REGEX.test(rawText)) {
    return 'bullet';
  }

  // 2. Subtitle check with date ranges: e.g. "Senior Engineer — Simatrix | 2021 - Present", "2018 - 2022"
  if (DATE_RANGE_REGEX.test(rawText) && textLen < 120) {
    return 'subtitle';
  }

  // 3. Contact check: Email, phone, URLs, or separator pipes with contact info
  const hasPhone = /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(rawText);
  if (
    CONTACT_REGEX.test(rawText) ||
    (rawText.includes('|') && textLen < 120 && (rawText.includes('@') || hasPhone))
  ) {
    return 'contact';
  }

  // Normalize text for heading matching: remove trailing colons, dashes, extra spaces
  const cleanHead = rawText.replace(/[:—–_-]+$/, '').trim().toUpperCase();

  // 3. Known resume heading keywords (e.g. "PROFESSIONAL SUMMARY", "SKILLS", "WORK EXPERIENCE")
  if (
    RESUME_HEADING_KEYWORDS.some(
      (kw) => cleanHead === kw || cleanHead.startsWith(kw + ' ') || cleanHead.endsWith(' ' + kw)
    )
  ) {
    return 'heading';
  }

  // 4. Document title / Name: Top of page (ptY < 160), short (< 40 chars), bold or large (>= median), no trailing sentences
  if (
    line.ptY < 160 &&
    textLen < 40 &&
    (size >= Math.max(14, medianBodyFontSize * 1.15) || isBold) &&
    !rawText.includes('.') &&
    !rawText.includes(',')
  ) {
    return 'title';
  }

  const isAllUpper = rawText === rawText.toUpperCase() && /[A-Z]/.test(rawText);

  // 5. Section Heading: Significantly larger (>= 16pt) or ALL-CAPS short bold/medium text
  if (
    size >= Math.max(16, medianBodyFontSize * 1.35) ||
    size >= 18 ||
    (isAllUpper && textLen >= 3 && textLen <= 45 && (isBold || size >= medianBodyFontSize))
  ) {
    return 'heading';
  }

  // 6. Subtitle / Subheading: Job titles, company headers, dates, or degrees
  // e.g. "Senior Software Engineer | ABC Corp", "2020 - Present", "Bachelor of Engineering"
  if (DATE_RANGE_REGEX.test(rawText) && textLen < 100) {
    return 'subtitle';
  }
  if (
    (size >= 13 && size < 16 && (isBold || line.italic)) ||
    (size >= medianBodyFontSize * 1.12 &&
      size < Math.max(16, medianBodyFontSize * 1.35) &&
      (isBold || line.italic))
  ) {
    return 'subtitle';
  }
  if (
    isBold &&
    textLen < 60 &&
    (rawText.includes('|') || rawText.includes('—') || rawText.includes('–') || rawText.includes(' - '))
  ) {
    return 'subtitle';
  }

  return 'line';
}

/**
 * Partitions lines into coherent reading-order columns when multi-column layouts are present.
 * Prevents lines in separate columns from interleaving and keeps column paragraphs unified.
 * 
 * @param {Array<Object>} lines - Array of line objects
 * @param {number} [pagePtWidth=612]
 * @returns {Array<Array<Object>>} Array of line clusters per column/region
 */
export function partitionLinesIntoColumns(lines, pagePtWidth = 612) {
  if (!lines || lines.length <= 1) return [lines || []];

  // Check for lines with vertical overlap and significant horizontal gap (> 20pt)
  let hasColumns = false;
  for (let i = 0; i < lines.length; i++) {
    const a = lines[i];
    for (let j = i + 1; j < lines.length; j++) {
      const b = lines[j];
      const vOverlap = Math.min(a.ptY + a.ptHeight, b.ptY + b.ptHeight) - Math.max(a.ptY, b.ptY);
      if (vOverlap > 2) {
        const hGap = Math.max(a.minPtX, b.minPtX) - Math.min(a.maxPtX, b.maxPtX);
        if (hGap > 18) {
          hasColumns = true;
          break;
        }
      }
    }
    if (hasColumns) break;
  }

  if (!hasColumns) {
    return [lines];
  }

  const midPageX = pagePtWidth / 2;
  const leftCol = [];
  const rightCol = [];
  const fullWidthLines = [];

  for (const l of lines) {
    const isWide = (l.maxPtX - l.minPtX) > pagePtWidth * 0.62;
    if (isWide) {
      fullWidthLines.push(l);
    } else if (l.maxPtX <= midPageX + 24) {
      leftCol.push(l);
    } else if (l.minPtX >= midPageX - 24) {
      rightCol.push(l);
    } else {
      leftCol.push(l);
    }
  }

  if (leftCol.length > 0 && rightCol.length > 0) {
    const topColY = Math.min(
      ...leftCol.map((l) => l.ptY),
      ...rightCol.map((l) => l.ptY)
    );
    const bottomColY = Math.max(
      ...leftCol.map((l) => l.ptY + l.ptHeight),
      ...rightCol.map((l) => l.ptY + l.ptHeight)
    );

    const headers = fullWidthLines.filter((l) => l.ptY < topColY).sort((a, b) => a.ptY - b.ptY);
    const footers = fullWidthLines.filter((l) => l.ptY >= bottomColY).sort((a, b) => a.ptY - b.ptY);
    const inBetween = fullWidthLines.filter((l) => l.ptY >= topColY && l.ptY < bottomColY).sort((a, b) => a.ptY - b.ptY);

    const clusters = [];
    if (headers.length > 0) clusters.push(headers);
    clusters.push(leftCol.sort((a, b) => a.ptY - b.ptY));
    clusters.push(rightCol.sort((a, b) => a.ptY - b.ptY));
    if (inBetween.length > 0) clusters.push(inBetween);
    if (footers.length > 0) clusters.push(footers);
    return clusters;
  }

  return [lines];
}

/**
 * Calculates downward shift for sections positioned below an edited section that expanded vertically.
 * Prevents edited paragraphs or headings from overlapping lower content on the page.
 * 
 * @param {Array<Object>} sections - All sections on the page
 * @param {string} editedSectionId - ID of the section that was edited / resized
 * @param {number} heightDelta - Change in height (newHeight - originalHeight)
 * @returns {Array<Object>} Updated sections with shifted coordinates
 */
export function calculateDownwardSectionShift(sections, editedSectionId, heightDelta) {
  if (!sections || !editedSectionId || !heightDelta || Math.abs(heightDelta) < 1) {
    return sections;
  }

  const editedSec = sections.find((s) => s.id === editedSectionId);
  if (!editedSec) return sections;

  const editedBottom = editedSec.ptY + (editedSec.originalPtHeight || editedSec.ptHeight);
  const editedLeft = editedSec.ptX;
  const editedRight = editedSec.ptX + editedSec.ptWidth;

  return sections.map((sec) => {
    if (sec.id === editedSectionId) return sec;

    // Check if section is below the bottom of the edited section
    if (sec.ptY >= editedBottom - 6) {
      const secLeft = sec.ptX;
      const secRight = sec.ptX + sec.ptWidth;
      // Overlapping column or spanning horizontal region
      const horizontalOverlap = Math.min(editedRight, secRight) - Math.max(editedLeft, secLeft);
      const isSecFullWidth = sec.ptWidth >= 360;
      const isEditedFullWidth = editedSec.ptWidth >= 360;
      const isInSameColumn = horizontalOverlap > 0 || isSecFullWidth || isEditedFullWidth;

      // In same column or spanning full-width region below
      if (isInSameColumn) {
        const newPtY = Math.round(sec.ptY + heightDelta);
        const newBaselinePtY = sec.baselinePtY !== undefined ? Math.round(sec.baselinePtY + heightDelta) : undefined;
        const newPdfBaselineY = sec.pdfBaselineY !== undefined ? Math.round(sec.pdfBaselineY - heightDelta) : undefined;

        return {
          ...sec,
          ptY: newPtY,
          baselinePtY: newBaselinePtY,
          pdfBaselineY: newPdfBaselineY,
          isShiftedDown: heightDelta > 0,
          shiftAmount: (sec.shiftAmount || 0) + heightDelta,
        };
      }
    }
    return sec;
  });
}

/**
 * Groups lines into coherent Section/Paragraph structures.
 * Identifies:
 * - Document title/name
 * - Contact information
 * - Section Headings
 * - Subtitles
 * - Bullet points
 * - Paragraphs (multi-line blocks sharing line spacing and margin bounds)
 * - Table cells
 * 
 * @param {Array<Object>} lines - Array of line segment objects
 * @param {number} [pagePtWidth=612]
 * @param {number} [pagePtHeight=792]
 * @returns {Array<Object>} Array of section objects (paragraphs, headings, subtitles, bullets, etc.)
 */
export function groupLinesIntoSections(lines, pagePtWidth = 612, pagePtHeight = 792) {
  if (!lines || lines.length === 0) return [];

  // Partition multi-column pages into separate sequential column clusters
  const clusters = partitionLinesIntoColumns(lines, pagePtWidth);
  const allSections = [];
  let globalSectionIndex = 0;

  for (const clusterLines of clusters) {
    if (!clusterLines || clusterLines.length === 0) continue;

    // Sort lines top-to-bottom within column
    const sortedLines = [...clusterLines].sort((a, b) => a.ptY - b.ptY);

    // Compute median body font size
    const sizes = sortedLines.map((l) => l.fontSize || 12).sort((a, b) => a - b);
    const medianBodyFontSize = sizes[Math.floor(sizes.length / 2)] || 12;

    // Classify each line
    sortedLines.forEach((l) => {
      l.semantic = classifyLineSemantic(l, medianBodyFontSize);
    });

    let currentParaLines = [];

    const flushCurrentParagraph = () => {
      if (currentParaLines.length === 0) return;

      const firstL = currentParaLines[0];
      const lastL = currentParaLines[currentParaLines.length - 1];
      const minPtX = Math.min(...currentParaLines.map((l) => l.minPtX));
      const maxPtX = Math.max(...currentParaLines.map((l) => l.maxPtX));
      const ptWidth = Math.max(20, maxPtX - minPtX);
      const ptHeight = Math.max(14, lastL.ptY + lastL.ptHeight - firstL.ptY);
      const allWords = currentParaLines.flatMap((l) => l.words);

      let avgLineHeight = 1.25;
      if (currentParaLines.length > 1) {
        const totalDist = lastL.ptY - firstL.ptY;
        const numGaps = currentParaLines.length - 1;
        const avgGap = totalDist / numGaps;
        avgLineHeight = Math.max(1.0, Math.min(2.5, Math.round((avgGap / firstL.fontSize) * 100) / 100));
      }

      const sectionType =
        currentParaLines.length === 1
          ? firstL.semantic
          : firstL.semantic === 'bullet'
          ? 'bullet'
          : 'paragraph';

      const availableWidth = Math.min(
        pagePtWidth - minPtX - 24,
        Math.max(ptWidth + 12, 100)
      );

      const hasBullet = firstL.hasBullet;
      const bulletWord = firstL.bulletWord;
      const textStartX = firstL.textStartX !== undefined ? firstL.textStartX : minPtX;
      const bulletGap = firstL.bulletGap || 0;
      const contentWords = hasBullet
        ? allWords.filter((w) => !bulletWord || w.id !== bulletWord.id)
        : allWords;
      const textOnlyOriginal = hasBullet
        ? currentParaLines.map((l) => (l.contentWords ? l.contentWords.map((w) => w.text).join(' ') : l.fullOriginalText)).join('\n')
        : currentParaLines.map((l) => l.fullOriginalText).join('\n');

      const section = {
        id: `sec_${firstL.page || 1}_${globalSectionIndex++}`,
        type: sectionType, // 'title' | 'contact' | 'heading' | 'subtitle' | 'bullet' | 'paragraph' | 'line' | 'table_cell'
        page: firstL.page || 1,
        lines: [...currentParaLines],
        words: allWords,
        contentWords,
        hasBullet,
        bulletWord,
        textStartX,
        bulletGap,
        textOnlyOriginal,
        ptX: minPtX,
        ptY: firstL.ptY,
        originalPtX: minPtX,
        originalPtY: firstL.ptY,
        originalPtWidth: ptWidth,
        originalPtHeight: ptHeight,
        baselinePtY: firstL.baselinePtY,
        pdfBaselineY: firstL.pdfBaselineY,
        pdfBaselineX: firstL.pdfBaselineX,
        ptWidth,
        ptHeight,
        fontSize: firstL.fontSize,
        fontFamily: firstL.fontFamily,
        bold: firstL.bold,
        italic: firstL.italic,
        color: firstL.color || '#111827',
        lineHeight: avgLineHeight,
        fullOriginalText: currentParaLines.map((l) => l.fullOriginalText).join('\n'),
        availableWidth,
      };

      for (const l of currentParaLines) {
        l.sectionId = section.id;
        for (const w of l.words) {
          w.sectionId = section.id;
          w.sectionType = sectionType;
        }
      }

      allSections.push(section);
      currentParaLines = [];
    };

    for (let i = 0; i < sortedLines.length; i++) {
      const curLine = sortedLines[i];

      // Detect table rows:
      // 1. Multiple lines in the same cluster share the exact same row Y
      // 2. OR 3 or more cells exist across the same row on the page
      const sameRowLinesInCluster = sortedLines.filter(
        (other) => other.id !== curLine.id && Math.abs(other.ptY - curLine.ptY) <= 3
      );
      const sameRowLinesAcrossPage = lines.filter(
        (other) => Math.abs(other.ptY - curLine.ptY) <= 3
      );

      const isTableRowCell = sameRowLinesInCluster.length > 0 || sameRowLinesAcrossPage.length >= 3;

      if (isTableRowCell) {
        flushCurrentParagraph();
        curLine.semantic = 'table_cell';
        currentParaLines.push(curLine);
        flushCurrentParagraph();
        continue;
      }

      // Standalone structural sections: Title, Contact, Heading, and Subtitle NEVER merge
      if (
        curLine.semantic === 'title' ||
        curLine.semantic === 'contact' ||
        curLine.semantic === 'heading' ||
        curLine.semantic === 'subtitle'
      ) {
        flushCurrentParagraph();
        currentParaLines.push(curLine);
        flushCurrentParagraph();
        continue;
      }

      // Bullet points: each bullet is an independent section
      if (curLine.semantic === 'bullet') {
        flushCurrentParagraph();
        currentParaLines.push(curLine);

        let nextIdx = i + 1;
        while (nextIdx < sortedLines.length) {
          const nextLine = sortedLines[nextIdx];
          const fontSize = curLine.fontSize || 12;
          const vDist = nextLine.ptY - curLine.ptY;
          const gapY = nextLine.ptY - (curLine.ptY + curLine.ptHeight);

          const isContinuation =
            nextLine.semantic === 'line' &&
            gapY <= fontSize * 0.7 &&
            vDist <= fontSize * 1.7 &&
            nextLine.minPtX >= curLine.minPtX + 4 &&
            Math.abs((nextLine.fontSize || 12) - fontSize) <= 1.5;

          if (isContinuation) {
            currentParaLines.push(nextLine);
            i = nextIdx;
            nextIdx++;
          } else {
            break;
          }
        }

        flushCurrentParagraph();
        continue;
      }

      // Standard body line: merge into paragraph if line spacing, font, and margins match
      if (currentParaLines.length === 0) {
        currentParaLines.push(curLine);
      } else {
        const prevLine = currentParaLines[currentParaLines.length - 1];
        const fontSize = curLine.fontSize || 12;
        const vDist = curLine.ptY - prevLine.ptY;
        const gapY = curLine.ptY - (prevLine.ptY + prevLine.ptHeight);
        const isSimilarMargin = Math.abs(curLine.minPtX - prevLine.minPtX) <= 24;
        const isNormalLineSpacing =
          vDist >= fontSize * 0.8 && vDist <= fontSize * 1.65 && gapY <= fontSize * 0.85;
        const isSameFont =
          curLine.fontFamily === prevLine.fontFamily &&
          Math.abs((curLine.fontSize || 12) - (prevLine.fontSize || 12)) <= 1.5;

        if (isNormalLineSpacing && isSimilarMargin && isSameFont && prevLine.semantic === 'line') {
          currentParaLines.push(curLine);
        } else {
          flushCurrentParagraph();
          currentParaLines.push(curLine);
        }
      }
    }

    flushCurrentParagraph();
  }

  return allSections;
}

/**
 * Computes the unified, non-overlapping document reflow layout for all sections on a page.
 * 
 * Guarantees:
 * 1. Preserves document reading order per column.
 * 2. Unedited sections above an edit never move (shift = 0).
 * 3. When an edited section expands by deltaH, all following sections in that column shift down by deltaH.
 * 4. Preserves the exact relative gaps between neighboring sections.
 * 5. Reclaims space if a section becomes shorter (deltaH < 0).
 * 6. Independent columns are never moved by edits in another column.
 * 7. Full-width sections (e.g. footers) below a multi-column region shift appropriately.
 * 8. Detects intersecting text boxes and prevents collisions (ptY >= prevBottom + 2).
 * 9. Detects page bottom boundary overflow and flags overflow / continuation.
 * 
 * @param {Array<Object>} sections - Original detected sections on the page
 * @param {Array<Object>} textReplacements - Committed user replacements for this page
 * @param {number} [pagePtWidth=612]
 * @param {number} [pagePtHeight=792]
 * @returns {Array<Object>} Array of layout-positioned sections
 */
export function computePageReflowLayout(sections, textReplacements = [], pagePtWidth = 612, pagePtHeight = 792) {
  if (!sections || sections.length === 0) return [];

  // Clone sections with original layout coordinates anchored
  const layoutSections = sections.map((s) => {
    const origX = s.originalPtX !== undefined ? s.originalPtX : s.ptX;
    const origY = s.originalPtY !== undefined ? s.originalPtY : s.ptY;
    const origW = s.originalPtWidth !== undefined ? s.originalPtWidth : s.ptWidth;
    const origH = s.originalPtHeight !== undefined ? s.originalPtHeight : s.ptHeight;
    const origBaseY = s.originalBaselinePtY !== undefined ? s.originalBaselinePtY : s.baselinePtY;
    const origPdfBaseY = s.originalPdfBaselineY !== undefined ? s.originalPdfBaselineY : s.pdfBaselineY;

    // Check if this section has a committed replacement
    const repl = (textReplacements || []).find(
      (r) => r.sectionId === s.id || r.targetId === s.id || (r.id && r.id === `sec_repl_${s.id}`)
    );

    const isEdited = !!repl;
    const renderedH = isEdited
      ? (repl.renderedTextHeight || repl.coverPtHeight || origH)
      : origH;
    const heightDelta = isEdited ? (renderedH - origH) : 0;

    return {
      ...s,
      originalPtX: origX,
      originalPtY: origY,
      originalPtWidth: origW,
      originalPtHeight: origH,
      originalBaselinePtY: origBaseY,
      originalPdfBaselineY: origPdfBaseY,
      ptX: origX,
      ptY: origY,
      ptWidth: origW,
      ptHeight: renderedH,
      baselinePtY: origBaseY,
      pdfBaselineY: origPdfBaseY,
      isEdited,
      replacement: repl || null,
      heightDelta,
      shiftAmount: 0,
    };
  });

  // Group sections into column streams (headers, leftCol, rightCol, footers)
  const midX = pagePtWidth / 2;
  const leftCol = [];
  const rightCol = [];
  const fullWidth = [];

  for (const sec of layoutSections) {
    const isWide = sec.originalPtWidth > pagePtWidth * 0.62;
    const centerX = sec.originalPtX + (sec.originalPtWidth / 2);
    if (isWide) {
      fullWidth.push(sec);
    } else if (centerX < midX) {
      leftCol.push(sec);
    } else {
      rightCol.push(sec);
    }
  }

  const hasColumns = leftCol.length > 0 && rightCol.length > 0;

  if (hasColumns) {
    const topColY = Math.min(...leftCol.map((s) => s.originalPtY), ...rightCol.map((s) => s.originalPtY));
    const bottomColY = Math.max(...leftCol.map((s) => s.originalPtY + s.originalPtHeight), ...rightCol.map((s) => s.originalPtY + s.originalPtHeight));

    const headers = fullWidth.filter((s) => s.originalPtY < topColY).sort((a, b) => a.originalPtY - b.originalPtY);
    const footers = fullWidth.filter((s) => s.originalPtY >= bottomColY).sort((a, b) => a.originalPtY - b.originalPtY);
    const inBetween = fullWidth.filter((s) => s.originalPtY >= topColY && s.originalPtY < bottomColY).sort((a, b) => a.originalPtY - b.originalPtY);

    leftCol.sort((a, b) => a.originalPtY - b.originalPtY);
    rightCol.sort((a, b) => a.originalPtY - b.originalPtY);

    // Compute shifts in headers
    let headerShift = 0;
    for (let idx = 0; idx < headers.length; idx++) {
      const sec = headers[idx];
      sec.shiftAmount = headerShift;
      sec.ptY = Math.round(sec.originalPtY + headerShift);
      if (sec.originalBaselinePtY !== undefined) sec.baselinePtY = Math.round(sec.originalBaselinePtY + headerShift);
      if (sec.originalPdfBaselineY !== undefined) sec.pdfBaselineY = Math.round(sec.originalPdfBaselineY - headerShift);

      if (idx > 0) {
        const prev = headers[idx - 1];
        const prevBottom = prev.ptY + prev.ptHeight;
        if (sec.ptY < prevBottom + 2) {
          const pushDelta = (prevBottom + 4) - sec.ptY;
          sec.ptY += pushDelta;
          sec.shiftAmount += pushDelta;
          if (sec.baselinePtY !== undefined) sec.baselinePtY += pushDelta;
          if (sec.pdfBaselineY !== undefined) sec.pdfBaselineY -= pushDelta;
          headerShift += pushDelta;
        }
      }

      if (sec.isEdited) headerShift += sec.heightDelta;
    }

    // Left column stream
    let leftShift = headerShift;
    for (let idx = 0; idx < leftCol.length; idx++) {
      const sec = leftCol[idx];
      sec.shiftAmount = leftShift;
      sec.ptY = Math.round(sec.originalPtY + leftShift);
      if (sec.originalBaselinePtY !== undefined) sec.baselinePtY = Math.round(sec.originalBaselinePtY + leftShift);
      if (sec.originalPdfBaselineY !== undefined) sec.pdfBaselineY = Math.round(sec.originalPdfBaselineY - leftShift);

      if (idx > 0) {
        const prev = leftCol[idx - 1];
        const prevBottom = prev.ptY + prev.ptHeight;
        if (sec.ptY < prevBottom + 2) {
          const pushDelta = (prevBottom + 4) - sec.ptY;
          sec.ptY += pushDelta;
          sec.shiftAmount += pushDelta;
          if (sec.baselinePtY !== undefined) sec.baselinePtY += pushDelta;
          if (sec.pdfBaselineY !== undefined) sec.pdfBaselineY -= pushDelta;
          leftShift += pushDelta;
        }
      }

      if (sec.isEdited) leftShift += sec.heightDelta;
    }

    // Right column stream
    let rightShift = headerShift;
    for (let idx = 0; idx < rightCol.length; idx++) {
      const sec = rightCol[idx];
      sec.shiftAmount = rightShift;
      sec.ptY = Math.round(sec.originalPtY + rightShift);
      if (sec.originalBaselinePtY !== undefined) sec.baselinePtY = Math.round(sec.originalBaselinePtY + rightShift);
      if (sec.originalPdfBaselineY !== undefined) sec.pdfBaselineY = Math.round(sec.originalPdfBaselineY - rightShift);

      if (idx > 0) {
        const prev = rightCol[idx - 1];
        const prevBottom = prev.ptY + prev.ptHeight;
        if (sec.ptY < prevBottom + 2) {
          const pushDelta = (prevBottom + 4) - sec.ptY;
          sec.ptY += pushDelta;
          sec.shiftAmount += pushDelta;
          if (sec.baselinePtY !== undefined) sec.baselinePtY += pushDelta;
          if (sec.pdfBaselineY !== undefined) sec.pdfBaselineY -= pushDelta;
          rightShift += pushDelta;
        }
      }

      if (sec.isEdited) rightShift += sec.heightDelta;
    }

    // Footers below both columns
    let footerShift = Math.max(leftShift, rightShift);
    for (let idx = 0; idx < footers.length; idx++) {
      const sec = footers[idx];
      sec.shiftAmount = footerShift;
      sec.ptY = Math.round(sec.originalPtY + footerShift);
      if (sec.originalBaselinePtY !== undefined) sec.baselinePtY = Math.round(sec.originalBaselinePtY + footerShift);
      if (sec.originalPdfBaselineY !== undefined) sec.pdfBaselineY = Math.round(sec.originalPdfBaselineY - footerShift);

      if (idx > 0) {
        const prev = footers[idx - 1];
        const prevBottom = prev.ptY + prev.ptHeight;
        if (sec.ptY < prevBottom + 2) {
          const pushDelta = (prevBottom + 4) - sec.ptY;
          sec.ptY += pushDelta;
          sec.shiftAmount += pushDelta;
          if (sec.baselinePtY !== undefined) sec.baselinePtY += pushDelta;
          if (sec.pdfBaselineY !== undefined) sec.pdfBaselineY -= pushDelta;
          footerShift += pushDelta;
        }
      }

      if (sec.isEdited) footerShift += sec.heightDelta;
    }

    for (const sec of inBetween) {
      sec.shiftAmount = headerShift;
      sec.ptY = Math.round(sec.originalPtY + headerShift);
      if (sec.originalBaselinePtY !== undefined) sec.baselinePtY = Math.round(sec.originalBaselinePtY + headerShift);
      if (sec.originalPdfBaselineY !== undefined) sec.pdfBaselineY = Math.round(sec.originalPdfBaselineY - headerShift);
    }
  } else {
    // Single column stream
    const sorted = [...layoutSections].sort((a, b) => a.originalPtY - b.originalPtY);
    let cumulativeShift = 0;

    for (let idx = 0; idx < sorted.length; idx++) {
      const sec = sorted[idx];
      sec.shiftAmount = cumulativeShift;
      sec.ptY = Math.round(sec.originalPtY + cumulativeShift);
      if (sec.originalBaselinePtY !== undefined) sec.baselinePtY = Math.round(sec.originalBaselinePtY + cumulativeShift);
      if (sec.originalPdfBaselineY !== undefined) sec.pdfBaselineY = Math.round(sec.originalPdfBaselineY - cumulativeShift);

      // Check collision with previous section in stream
      if (idx > 0) {
        const prev = sorted[idx - 1];
        const prevBottom = prev.ptY + prev.ptHeight;
        if (sec.ptY < prevBottom + 2) {
          const pushDelta = (prevBottom + 4) - sec.ptY;
          sec.ptY += pushDelta;
          sec.shiftAmount += pushDelta;
          if (sec.baselinePtY !== undefined) sec.baselinePtY += pushDelta;
          if (sec.pdfBaselineY !== undefined) sec.pdfBaselineY -= pushDelta;
          cumulativeShift += pushDelta;
        }
      }

      if (sec.isEdited) {
        cumulativeShift += sec.heightDelta;
      }
    }
  }

  // Check page bottom boundaries and overflow continuation
  const maxSafeBottomY = pagePtHeight - 24;
  for (const sec of layoutSections) {
    const secBottom = sec.ptY + sec.ptHeight;
    if (secBottom > maxSafeBottomY) {
      sec.overflowsBottom = true;
      sec.overflowBottomAmount = Math.round(secBottom - maxSafeBottomY);
    } else {
      sec.overflowsBottom = false;
      sec.overflowBottomAmount = 0;
    }
  }

  return layoutSections;
}

/**
 * Splits a long single word or URL that exceeds maxWidth into sub-chunks
 * that each fit within safeMaxWidth.
 * 
 * @param {string} word 
 * @param {string} fontFamily 
 * @param {number} fontSize 
 * @param {number} safeMaxWidth 
 * @param {boolean} bold 
 * @param {boolean} italic 
 * @returns {Array<string>}
 */
function splitLongWordChunks(word, fontFamily, fontSize, safeMaxWidth, bold, italic) {
  if (!word) return [];
  const chunks = [];
  let remaining = word;

  while (remaining.length > 0) {
    let low = 1;
    let high = remaining.length;
    let bestLen = 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const sub = remaining.slice(0, mid);
      const w = measureTextWidth(sub, fontFamily, fontSize, bold, italic);
      if (w <= safeMaxWidth) {
        bestLen = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    chunks.push(remaining.slice(0, bestLen));
    remaining = remaining.slice(bestLen);
  }

  return chunks;
}

/**
 * Wraps text into lines that strictly fit within maxWidth.
 * Prevents text from overflowing the page margin or box horizontally.
 * Respects word boundaries, keeping words together whenever possible,
 * while cleanly splitting excessively long words or URLs.
 * 
 * @param {string} text 
 * @param {string} fontFamily 
 * @param {number} fontSize 
 * @param {number} maxWidth 
 * @param {boolean} bold 
 * @param {boolean} italic 
 * @returns {Array<Object>} Wrapped lines with measured widths
 */
export function wrapTextLines(
  text,
  fontFamily = 'Helvetica',
  fontSize = 14,
  maxWidth = 400,
  bold = false,
  italic = false
) {
  if (!text && text !== '') return [];

  const safeMaxWidth = Math.max(30, maxWidth);
  const inputParagraphs = String(text).split('\n');
  const resultLines = [];

  for (const para of inputParagraphs) {
    if (!para.trim()) {
      resultLines.push({ text: '', width: 0, isEmpty: true });
      continue;
    }

    const rawWords = para.split(/\s+/).filter(Boolean);
    if (rawWords.length === 0) {
      resultLines.push({ text: '', width: 0, isEmpty: true });
      continue;
    }

    let currentLine = '';

    for (const rawWord of rawWords) {
      const wordW = measureTextWidth(rawWord, fontFamily, fontSize, bold, italic);
      const wordChunks = wordW > safeMaxWidth
        ? splitLongWordChunks(rawWord, fontFamily, fontSize, safeMaxWidth, bold, italic)
        : [rawWord];

      for (const chunk of wordChunks) {
        if (!currentLine) {
          currentLine = chunk;
        } else {
          const candidate = `${currentLine} ${chunk}`;
          const candidateWidth = measureTextWidth(candidate, fontFamily, fontSize, bold, italic);

          if (candidateWidth <= safeMaxWidth) {
            currentLine = candidate;
          } else {
            const curWidth = measureTextWidth(currentLine, fontFamily, fontSize, bold, italic);
            resultLines.push({ text: currentLine, width: curWidth, isEmpty: false });
            currentLine = chunk;
          }
        }
      }
    }

    if (currentLine) {
      const lastWidth = measureTextWidth(currentLine, fontFamily, fontSize, bold, italic);
      resultLines.push({ text: currentLine, width: lastWidth, isEmpty: false });
    }
  }

  return resultLines;
}

/**
 * Wraps replacement text naturally across lines starting from firstLineX
 * and continuing on subsequent lines from subsequentLineX.
 * Guarantees:
 * 1. Text strictly stays within page boundary (pagePtWidth - margin).
 * 2. Appropriate word spacing is maintained.
 * 3. Individual words that exceed line width are safely broken to avoid page overflow.
 * 4. Generates exact coordinates and baseline positions for each wrapped line.
 */
export function wrapTextAcrossLines({
  text,
  fontFamily = 'Helvetica',
  fontSize = 12,
  bold = false,
  italic = false,
  firstLineX = 50,
  firstLineWidth = 200,
  subsequentLineX = 50,
  subsequentLineWidth = 500,
  baselinePtY = 100,
  pdfBaselineY = 700,
  lineSpacingPt = 15,
}) {
  if (!text) return [];

  const paragraphs = String(text).split('\n');
  const wrappedLines = [];
  let lineIdx = 0;

  for (const para of paragraphs) {
    if (!para.trim()) {
      wrappedLines.push({
        text: '',
        width: 0,
        ptX: lineIdx === 0 ? firstLineX : subsequentLineX,
        baselinePtY: baselinePtY + lineIdx * lineSpacingPt,
        pdfBaselineY: pdfBaselineY !== undefined ? (pdfBaselineY - lineIdx * lineSpacingPt) : undefined,
      });
      lineIdx++;
      continue;
    }

    const words = para.split(/\s+/).filter(Boolean);
    let curLineWords = [];
    let curLineWidth = 0;

    for (let wIdx = 0; wIdx < words.length; wIdx++) {
      const curWord = words[wIdx];
      const targetMaxWidth = lineIdx === 0 ? firstLineWidth : subsequentLineWidth;
      const testWords = [...curLineWords, curWord];
      const testStr = testWords.join(' ');
      const testWidth = measureTextWidth(testStr, fontFamily, fontSize, bold, italic);

      if (curLineWords.length === 0 || testWidth <= targetMaxWidth) {
        curLineWords.push(curWord);
        curLineWidth = testWidth;
      } else {
        wrappedLines.push({
          text: curLineWords.join(' '),
          width: curLineWidth,
          ptX: lineIdx === 0 ? firstLineX : subsequentLineX,
          baselinePtY: baselinePtY + lineIdx * lineSpacingPt,
          pdfBaselineY: pdfBaselineY !== undefined ? (pdfBaselineY - lineIdx * lineSpacingPt) : undefined,
        });
        lineIdx++;
        curLineWords = [curWord];
        curLineWidth = measureTextWidth(curWord, fontFamily, fontSize, bold, italic);
      }
    }

    if (curLineWords.length > 0) {
      wrappedLines.push({
        text: curLineWords.join(' '),
        width: curLineWidth,
        ptX: lineIdx === 0 ? firstLineX : subsequentLineX,
        baselinePtY: baselinePtY + lineIdx * lineSpacingPt,
        pdfBaselineY: pdfBaselineY !== undefined ? (pdfBaselineY - lineIdx * lineSpacingPt) : undefined,
      });
      lineIdx++;
    }
  }

  return wrappedLines;
}

/**
 * Capitalization transformation matching original PDF text or user choice.
 * 
 * @param {string} text 
 * @param {'preserve' | 'upper' | 'lower' | 'title' | 'none'} mode 
 * @param {string} [originalText=''] 
 * @returns {string} Transformed text
 */
export function applyCapitalization(text, mode = 'preserve', originalText = '') {
  if (!text) return '';

  if (mode === 'none' || mode === 'as-typed') {
    return text;
  }
  if (mode === 'upper' || mode === 'uppercase') {
    return text.toUpperCase();
  }
  if (mode === 'lower' || mode === 'lowercase') {
    return text.toLowerCase();
  }
  if (mode === 'title' || mode === 'titlecase') {
    return text.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  // Preserve mode: inspect originalText casing
  if (mode === 'preserve' && originalText) {
    const hasMixedCase = /[a-z]/.test(text) && /[A-Z]/.test(text);
    if (hasMixedCase) {
      // User explicitly typed mixed case (e.g. "Hari", "iPhone") -> respect explicit casing
      return text;
    }
    const isOrigUpper = originalText === originalText.toUpperCase() && originalText !== originalText.toLowerCase();
    if (isOrigUpper) {
      return text.toUpperCase();
    }
    const isOrigLower = originalText === originalText.toLowerCase() && originalText !== originalText.toUpperCase();
    if (isOrigLower) {
      return text.toLowerCase();
    }
    const words = originalText.trim().split(/\s+/);
    const isOrigTitle = words.length > 0 && words.every((w) => w[0] === w[0].toUpperCase());
    if (isOrigTitle) {
      return text.replace(/\b\w/g, (char) => char.toUpperCase());
    }
  }

  return text;
}

/**
 * Calculates section-level or paragraph-level reflow with automatic line wrapping.
 * When replacement text is typed, wraps text within availableWidth and calculates
 * the expanded cover mask so zero original characters bleed through.
 * 
 * @param {Object} params
 * @param {Object} params.section - The target section or paragraph object
 * @param {string} params.replacementText - New replacement text
 * @param {string} [params.fontFamily]
 * @param {number} [params.fontSize]
 * @param {boolean} [params.bold]
 * @param {boolean} [params.italic]
 * @param {boolean} [params.underline]
 * @param {string} [params.color]
 * @param {string} [params.align='left']
 * @param {number} [params.lineHeight=1.25]
 * @param {number} [params.letterSpacing=0]
 * @param {string} [params.backgroundColor='#FFFFFF']
 * @param {number} [params.opacity=1.0]
 * @param {string} [params.capitalization='preserve']
 * @param {number} [params.availableWidth]
 * @param {number} [params.pagePtWidth=612]
 * @param {number} [params.pagePtHeight=792]
 * @returns {Object} Full Section Reflow calculation result
 */
export function calculateSectionReflow({
  section,
  replacementText,
  fontFamily,
  fontSize,
  bold,
  italic,
  underline = false,
  color,
  align = 'left',
  lineHeight = 1.25,
  letterSpacing = 0,
  backgroundColor = '#FFFFFF',
  opacity = 1.0,
  capitalization = 'preserve',
  availableWidth,
  pagePtWidth = 612,
  pagePtHeight = 792,
}) {
  if (!section) return null;

  const fFamily = fontFamily || section.fontFamily || 'Helvetica';
  const fSize = fontSize || section.fontSize || 14;
  const isBold = bold !== undefined ? !!bold : !!section.bold;
  const isItalic = italic !== undefined ? !!italic : !!section.italic;
  const textColor = color || section.color || '#111827';
  const lHeight = Number(lineHeight) || section.lineHeight || 1.25;

  // Transform capitalization if requested
  const transformedText = applyCapitalization(replacementText, capitalization, section.fullOriginalText);

  const isBulletSeparate = section.hasBullet && section.textStartX !== undefined;
  const effectiveStartX = isBulletSeparate ? section.textStartX : (section.ptX !== undefined ? section.ptX : (section.minPtX !== undefined ? section.minPtX : 0));

  // Available wrapping width: constrained strictly by page margin (pagePtWidth - effectiveStartX - 24)
  const maxSafePageWidth = Math.max(100, pagePtWidth - effectiveStartX - 24);

  // Measure natural unwrapped line width of the replacement text
  const unwrappedLines = transformedText.split('\n');
  const maxUnwrappedLineWidth = Math.max(
    0,
    ...unwrappedLines.map((l) => measureTextWidth(l, fFamily, fSize, isBold, isItalic))
  );

  let chosenWidth;
  if (availableWidth !== undefined && availableWidth !== null && Number(availableWidth) > 0) {
    // When availableWidth is explicitly provided (box width or user-resized width), strictly respect it
    chosenWidth = Math.min(maxSafePageWidth, Math.max(30, Number(availableWidth)));
  } else if (section.type === 'paragraph') {
    const paraBaseWidth = Math.max(section.ptWidth || 200, 240);
    chosenWidth = Math.min(maxSafePageWidth, paraBaseWidth);
  } else {
    // Single line, heading, subtitle, title, bullet without explicit availableWidth:
    const baseWidth = Math.max(section.ptWidth || 40, maxUnwrappedLineWidth + 16);
    chosenWidth = Math.min(maxSafePageWidth, baseWidth);
  }

  // Perform word wrapping strictly within chosenWidth
  const rawWrapped = wrapTextLines(transformedText, fFamily, fSize, chosenWidth, isBold, isItalic);
  const numLines = Math.max(1, rawWrapped.length);
  const lineSpacingPt = fSize * lHeight;

  const ascentRatio = getFontAscentRatio(section.fontFamily || fFamily);
  const descentRatio = getFontDescentRatio(section.fontFamily || fFamily);
  const ascent = Math.ceil(fSize * ascentRatio);
  const descent = Math.ceil(fSize * descentRatio);

  const firstBaseline = section.baselinePtY !== undefined
    ? section.baselinePtY
    : Math.round(section.ptY + ascent);
  const firstPdfBaseline = section.pdfBaselineY;

  // Build fully enriched wrapped lines with precise individual line coordinates
  const wrappedLines = rawWrapped.map((wl, idx) => {
    const lineWidth = wl.width || measureTextWidth(wl.text, fFamily, fSize, isBold, isItalic);
    let alignOffset = 0;
    if (align === 'center') {
      alignOffset = Math.max(0, (chosenWidth - lineWidth) / 2);
    } else if (align === 'right') {
      alignOffset = Math.max(0, chosenWidth - lineWidth);
    }

    const linePtX = Math.round(effectiveStartX + alignOffset);
    const lineBaselinePtY = Math.round(firstBaseline + idx * lineSpacingPt);
    const linePdfBaselineY = firstPdfBaseline !== undefined
      ? Math.round(firstPdfBaseline - idx * lineSpacingPt)
      : undefined;

    return {
      text: wl.text,
      width: lineWidth,
      isEmpty: !!wl.isEmpty,
      ptX: linePtX,
      baselinePtY: lineBaselinePtY,
      pdfBaselineY: linePdfBaselineY,
    };
  });

  // Safe minimal bleed to prevent cutting into adjacent lines or sections
  const bleedX = 0.75;
  const bleedY = 0.5;

  // Calculate new rendered text height and maximum line width
  const renderedTextHeight = Math.round(ascent + (numLines - 1) * lineSpacingPt + descent);
  const maxLineWidth = Math.max(0, ...wrappedLines.map((wl) => wl.width || 0));

  // Typographic baseline-guided cover rectangle:
  // Anchored to exact first baseline so the top of the cover aligns with ascenders.
  // Height covers all wrapped lines plus ascender and descender margins.
  const isSingleLine = (section.type === 'line' || section.type === 'title' || section.type === 'heading' || section.type === 'subtitle' || section.type === 'bullet') && numLines === 1;

  let coverPtY;
  let coverPtHeight;
  if (isSingleLine && section.baselinePtY !== undefined) {
    coverPtY = Math.round(section.baselinePtY - ascent - bleedY);
    coverPtHeight = Math.round(ascent + descent + bleedY * 2);
  } else {
    coverPtY = Math.round(firstBaseline - ascent - bleedY);
    coverPtHeight = Math.round(Math.max(section.ptHeight || 0, renderedTextHeight) + bleedY * 2);
  }

  const coverPtX = Math.round(effectiveStartX - bleedX);
  const secPtWidth = isBulletSeparate
    ? Math.max(20, (section.ptWidth - (section.textStartX - section.ptX)))
    : (section.ptWidth !== undefined ? section.ptWidth : (section.maxPtX !== undefined ? section.maxPtX - effectiveStartX : 0));
  const effectiveWidth = Math.max(secPtWidth, chosenWidth, maxLineWidth);
  const coverPtWidth = Math.round(Math.min(pagePtWidth - coverPtX - 12, effectiveWidth + bleedX * 2));

  // Overflow checks against page margins
  const maxSafeBottomY = pagePtHeight - 20;
  const overflowsBottom = coverPtY + coverPtHeight > maxSafeBottomY;
  const overflowBottomAmount = overflowsBottom ? Math.round(coverPtY + coverPtHeight - maxSafeBottomY) : 0;
  const overflowsRight = coverPtX + coverPtWidth > pagePtWidth - 20;
  const overflowRightAmount = overflowsRight ? Math.round(coverPtX + coverPtWidth - (pagePtWidth - 20)) : 0;

  const stableId = section.id
    ? (String(section.id).startsWith('sec_repl_') ? section.id : `sec_repl_${section.id}`)
    : `sec_repl_${Date.now()}`;

  const replacedWordIds = Array.isArray(section.contentWords) && section.contentWords.length > 0
    ? section.contentWords.map((w) => w.id)
    : (Array.isArray(section.words) && section.words.length > 0
      ? section.words.map((w) => w.id)
      : (section.id ? [section.id] : []));

  return {
    id: stableId,
    sectionId: section.id,
    type: 'section_reflow',
    sectionType: section.type || 'paragraph',
    page: section.page || 1,
    originalText: section.fullOriginalText,
    replacementText: transformedText,
    fontFamily: fFamily,
    fontSize: fSize,
    bold: isBold,
    italic: isItalic,
    underline: !!underline,
    color: textColor,
    backgroundColor: backgroundColor || '#FFFFFF',
    align: align || 'left',
    lineHeight: lHeight,
    lineSpacingPt: Math.round(lineSpacingPt),
    letterSpacing: Number(letterSpacing) || 0,
    opacity: Math.max(0.1, Math.min(1.0, Number(opacity) || 1.0)),
    capitalization,
    availableWidth: chosenWidth,
    wrappedLines,
    renderedTextHeight,
    origPtX: effectiveStartX,
    textStartX: section.textStartX,
    hasBullet: !!section.hasBullet,
    origPtY: section.ptY,
    origPtWidth: section.ptWidth,
    origPtHeight: section.ptHeight,
    coverPtX,
    coverPtY,
    coverPtWidth,
    coverPtHeight,
    overflowsBottom,
    overflowBottomAmount,
    overflowsRight,
    overflowRightAmount,
    baselinePtY: section.baselinePtY,
    pdfBaselineY: section.pdfBaselineY,
    pdfBaselineX: section.pdfBaselineX,
    replacedWordIds,
  };
}

/**
 * Calculates a high-precision single-word or multi-word phrase replacement bounding box.
 * Guarantees that:
 * 1. ONLY the target word(s) character range is modified.
 * 2. Left neighbor (e.g. S.P.) is NEVER touched or whited out.
 * 3. Right neighbor (e.g. | +91-...) is NEVER touched or whited out.
 * 4. Line above and line below are NEVER touched or whited out.
 * 5. Multi-word replacements (e.g. Madurai, TamilNadu -> Chennai, TamilNadu) cleanly cover all replaced words.
 * 6. Shorter replacement text covers only the original word box without erasing surrounding content.
 * 7. Longer replacement text does not overlap neighboring content; available width is adjusted.
 */
export function calculateWordReplacement({
  word,
  line,
  replacementText,
  capitalization = 'preserve',
  userFormatting = {},
  pagePtWidth = 612,
  lineAbove = null,
  lineBelow = null,
  prevWord = null,
  nextWord = null,
}) {
  if (!word) return null;

  const originalText = word.text || '';
  const transformedText = applyCapitalization(replacementText, capitalization, originalText);

  const fontSize = userFormatting.fontSize || word.fontSize || (line ? line.fontSize : 14);
  const fontFamily = userFormatting.fontFamily || word.fontFamily || (line ? line.fontFamily : 'Helvetica');
  const bold = userFormatting.bold !== undefined ? !!userFormatting.bold : (word.bold !== undefined ? !!word.bold : (line ? !!line.bold : false));
  const italic = userFormatting.italic !== undefined ? !!userFormatting.italic : (word.italic !== undefined ? !!word.italic : (line ? !!line.italic : false));
  const underline = userFormatting.underline !== undefined ? !!userFormatting.underline : false;
  const color = userFormatting.color || word.color || (line ? line.color : '#111827');

  // Measure replacement width
  const measuredW = transformedText.trim()
    ? measureTextWidth(transformedText, fontFamily, fontSize, bold, italic)
    : 0;

  // Ascent & Descent based on font metrics:
  // Exact typographic ascender covers capitals and tall letters
  // Descent covers descenders (g, j, p, q, y, comma, etc.)
  const ascentRatio = getFontAscentRatio(fontFamily);
  const descentRatio = getFontDescentRatio(fontFamily);
  const hasDesc = hasDescenderGlyphs(originalText) || hasDescenderGlyphs(transformedText);
  const ascent = Math.ceil(fontSize * ascentRatio);
  const descent = hasDesc ? Math.ceil(fontSize * descentRatio) : 0;
  const bleedY = 0.5;
  const bleedX = 0.75;

  const baselinePtY = word.baselinePtY !== undefined ? word.baselinePtY : (line?.baselinePtY !== undefined ? line.baselinePtY : (word.ptY + ascent));

  // Determine which words from the line are replaced:
  // If the user replacement text spans multiple words or absorbs following words on the line
  const replacedWords = [word];
  let effectiveNextWord = nextWord;
  let effectivePrevWord = prevWord;

  if (line && Array.isArray(line.words) && line.words.length > 0) {
    const wIdx = line.words.findIndex((w) => w.id === word.id);
    if (wIdx > 0 && !effectivePrevWord) {
      effectivePrevWord = line.words[wIdx - 1];
    }
    if (wIdx !== -1) {
      // Check subsequent words on this line
      const replTokens = transformedText.trim().split(/\s+/).filter(Boolean);
      for (let i = wIdx + 1; i < line.words.length; i++) {
        const candidateW = line.words[i];
        // Stop if candidate is a delimiter / separator (| or • or -)
        if (candidateW.text === '|' || candidateW.text === '•' || candidateW.text === '-') {
          break;
        }
        // Candidate word is absorbed ONLY if replacement text explicitly contains it
        // (e.g. "TamilNadu" in "Chennai, TamilNadu")
        const candidateClean = candidateW.text.replace(/[,;.:]/g, '').toLowerCase();
        const matchesToken = replTokens.some((tok) => tok.replace(/[,;.:]/g, '').toLowerCase() === candidateClean);

        if (matchesToken) {
          replacedWords.push(candidateW);
        } else {
          break;
        }
      }
      // The real neighbor word to avoid touching is the word immediately following the last replaced word
      const lastReplacedIdx = wIdx + replacedWords.length - 1;
      if (lastReplacedIdx < line.words.length - 1) {
        effectiveNextWord = line.words[lastReplacedIdx + 1];
      } else {
        effectiveNextWord = null;
      }
    }
  }

  const origPtX = Math.min(...replacedWords.map((w) => w.ptX));
  const origPtY = Math.min(...replacedWords.map((w) => w.ptY));
  const lastReplacedWord = replacedWords[replacedWords.length - 1];
  const origPtWidth = (lastReplacedWord.ptX + lastReplacedWord.ptWidth) - origPtX;
  const origPtHeight = Math.max(...replacedWords.map((w) => w.ptHeight));

  // Horizontal boundaries:
  // Left: strictly bounded by effectivePrevWord right edge
  let coverPtX = origPtX;
  if (effectivePrevWord) {
    const prevEnd = effectivePrevWord.ptX + effectivePrevWord.ptWidth;
    const gapLeft = origPtX - prevEnd;
    const safeBleed = Math.min(bleedX, Math.max(0, (gapLeft - 0.5) / 2));
    coverPtX = Math.max(prevEnd + 0.5, origPtX - safeBleed);
  } else {
    coverPtX = Math.max(0, origPtX - bleedX);
  }

  let effectiveFontSize = fontSize;
  let effectiveMeasuredW = measuredW;
  let isAutoFitted = false;

  let availableWidth = effectiveNextWord
    ? Math.max(10, effectiveNextWord.ptX - origPtX - 2)
    : Math.max(10, pagePtWidth - origPtX - 24);

  // Available width on the current line
  const maxSafePageX = pagePtWidth - 24;
  const availWidthFirstLine = effectiveNextWord ? availableWidth : Math.max(30, maxSafePageX - origPtX);
  const indentX = line && line.minPtX !== undefined ? line.minPtX : Math.max(36, origPtX);
  const availWidthSubsequent = Math.max(40, maxSafePageX - indentX);
  const lineSpacingPt = Math.round(effectiveFontSize * 1.25);

  const hasExplicitNewline = transformedText.includes('\n');
  const hasMultipleWords = /\s+/.test(transformedText.trim());
  const overflowsFirstLine = effectiveMeasuredW > availWidthFirstLine;
  const shouldWrap = hasExplicitNewline || (overflowsFirstLine && (hasMultipleWords || !effectiveNextWord));

  // Controlled safe font-size adjustment when single replacement word is longer and constrained by adjacent word
  if (!shouldWrap && effectiveNextWord && measuredW > availableWidth) {
    const fitRatio = (availableWidth - 1) / measuredW;
    if (fitRatio < 1.0) {
      effectiveFontSize = Math.max(7.5, Math.floor(fontSize * fitRatio * 10) / 10);
      effectiveMeasuredW = measureTextWidth(transformedText, fontFamily, effectiveFontSize, bold, italic);
      isAutoFitted = true;
    }
  }

  let wrappedLines = [];
  let isWrapped = false;

  if (shouldWrap) {
    wrappedLines = wrapTextAcrossLines({
      text: transformedText,
      fontFamily,
      fontSize: effectiveFontSize,
      bold,
      italic,
      firstLineX: origPtX,
      firstLineWidth: availWidthFirstLine,
      subsequentLineX: indentX,
      subsequentLineWidth: availWidthSubsequent,
      baselinePtY,
      pdfBaselineY: word.pdfBaselineY !== undefined ? word.pdfBaselineY : line?.pdfBaselineY,
      lineSpacingPt,
    });
    isWrapped = wrappedLines.length > 1;
  } else {
    wrappedLines = [
      {
        text: transformedText,
        width: effectiveMeasuredW,
        ptX: origPtX,
        baselinePtY,
        pdfBaselineY: word.pdfBaselineY !== undefined ? word.pdfBaselineY : line?.pdfBaselineY,
      },
    ];
  }

  let coverPtWidth;
  let coverPtHeight;
  let coverPtY = Math.round(baselinePtY - ascent - bleedY);
  let overflowsBoundary = false;
  let overflowWarning = null;

  if (isWrapped && wrappedLines.length > 1) {
    const minLineX = Math.min(origPtX, indentX);
    const maxLineRight = Math.max(...wrappedLines.map((wl) => wl.ptX + wl.width));
    coverPtX = Math.max(0, minLineX - bleedX);
    coverPtWidth = Math.round(Math.min(pagePtWidth - coverPtX - 12, maxLineRight - coverPtX + bleedX * 2));
    coverPtHeight = Math.round(ascent + descent + (wrappedLines.length - 1) * lineSpacingPt + bleedY * 2);
  } else {
    // Single line
    let maxCoverRight = origPtX + Math.max(origPtWidth, effectiveMeasuredW) + bleedX;

    if (effectiveNextWord) {
      const nextStart = effectiveNextWord.ptX;
      if (maxCoverRight > nextStart - 1.0) {
        maxCoverRight = nextStart - 1.0; // Strictly clamp to avoid overlapping effectiveNextWord
        if (origPtX + effectiveMeasuredW > nextStart - 1.0) {
          overflowsBoundary = true;
          overflowWarning = `Replacement text exceeds available word gap by ${Math.round(effectiveMeasuredW - availableWidth)}pt`;
        }
      }
    } else {
      const maxSafeX = pagePtWidth - 12;
      if (maxCoverRight > maxSafeX) {
        maxCoverRight = maxSafeX;
      }
    }

    coverPtWidth = Math.max(4, Math.round(maxCoverRight - coverPtX));
    coverPtHeight = Math.round(ascent + descent + bleedY * 2);

    // Clamp against line above
    if (lineAbove) {
      const lineAboveBottom = lineAbove.baselinePtY !== undefined
        ? (lineAbove.baselinePtY + (hasDescenderGlyphs(lineAbove.fullOriginalText) ? Math.ceil((lineAbove.fontSize || 12) * 0.25) : 1))
        : (lineAbove.ptY + lineAbove.ptHeight);
      const minSafeY = lineAboveBottom + 0.5;
      if (coverPtY < minSafeY) {
        const diff = minSafeY - coverPtY;
        coverPtY = minSafeY;
        coverPtHeight = Math.max(4, coverPtHeight - diff);
      }
    }

    // Clamp against line below
    if (lineBelow) {
      const lineBelowTop = lineBelow.baselinePtY !== undefined
        ? (lineBelow.baselinePtY - Math.ceil((lineBelow.fontSize || 12) * getFontAscentRatio(lineBelow.fontFamily)))
        : lineBelow.ptY;
      const maxSafeY = lineBelowTop - 0.5;
      if (coverPtY + coverPtHeight > maxSafeY) {
        coverPtHeight = Math.max(4, maxSafeY - coverPtY);
      }
    }
  }

  const renderedTextHeight = Math.ceil(effectiveFontSize * 1.25);
  const renderedTextWidth = effectiveMeasuredW;

  return {
    id: `word_repl_${word.id || Date.now()}`,
    targetWordId: word.id,
    type: 'word_replacement',
    originalText,
    replacementText: transformedText,
    origPtX,
    origPtY,
    origPtWidth,
    origPtHeight,
    renderedTextWidth,
    renderedTextHeight,
    ascentRatio,
    ascent,
    descent,
    coverPtX: Math.round(coverPtX),
    coverPtY: Math.round(coverPtY),
    coverPtWidth: Math.round(coverPtWidth),
    coverPtHeight: Math.round(coverPtHeight),
    baselinePtY,
    pdfBaselineY: word.pdfBaselineY !== undefined ? word.pdfBaselineY : line?.pdfBaselineY,
    pdfBaselineX: word.pdfBaselineX !== undefined ? word.pdfBaselineX : line?.pdfBaselineX,
    replacedWordIds: replacedWords.map((w) => w.id),
    replacedWords,
    fontSize: effectiveFontSize,
    originalFontSize: fontSize,
    isAutoFitted,
    isWrapped,
    wrappedLines,
    indentX,
    lineSpacingPt,
    fontFamily,
    bold,
    italic,
    underline,
    color,
    availableWidth,
    overflowsBoundary,
    overflowWarning,
  };
}

/**
 * Calculates automatic line reflow when one or more words on a single line are replaced.
 * Ensures zero bleed into adjacent lines above/below and preceding words to the left.
 */
export function calculateLineReflow({
  line,
  targetWordId,
  replacementText,
  wordEdits = {},
  wordStyles = {},
  capitalization = 'preserve',
  align = 'left',
  pagePtWidth = 612,
  reflowFollowingWords = true,
  lineAbove = null,
  lineBelow = null,
}) {
  if (!line || !line.words || line.words.length === 0) {
    return null;
  }

  const activeEdits = { ...wordEdits };
  if (targetWordId && replacementText !== undefined) {
    activeEdits[targetWordId] = replacementText;
  }

  const wordCount = line.words.length;

  let firstEditedIdx = -1;
  for (let i = 0; i < wordCount; i++) {
    const w = line.words[i];
    if (activeEdits[w.id] !== undefined && activeEdits[w.id] !== w.text) {
      firstEditedIdx = i;
      break;
    }
  }

  if (firstEditedIdx === -1) {
    const tIdx = line.words.findIndex((w) => w.id === targetWordId);
    if (tIdx === -1) return null;
    firstEditedIdx = tIdx;
  }

  const firstEditedWord = line.words[firstEditedIdx];
  const fontSize = firstEditedWord.fontSize || line.fontSize || 14;
  const fontFamily = firstEditedWord.fontFamily || line.fontFamily || 'Helvetica';
  const bold = !!firstEditedWord.bold;
  const italic = !!firstEditedWord.italic;
  const color = firstEditedWord.color || line.color || '#111827';

  const reflowWords = [];
  let prevEnd = firstEditedWord.ptX;
  let accumulatedShift = 0;

  const lastIdx = reflowFollowingWords ? wordCount : firstEditedIdx + 1;

  for (let i = firstEditedIdx; i < lastIdx; i++) {
    const origWord = line.words[i];
    const isTarget = origWord.id === targetWordId;
    const isEdited = activeEdits[origWord.id] !== undefined;
    let currentWordText = isEdited ? activeEdits[origWord.id] : origWord.text;
    if (isEdited) {
      currentWordText = applyCapitalization(currentWordText, capitalization, origWord.text);
    }

    const customStyle = wordStyles[origWord.id] || {};
    const curFontFamily = customStyle.fontFamily || origWord.fontFamily || fontFamily;
    const curFontSize = customStyle.fontSize || origWord.fontSize || fontSize;
    const curBold = customStyle.bold !== undefined ? !!customStyle.bold : (origWord.bold !== undefined ? !!origWord.bold : bold);
    const curItalic = customStyle.italic !== undefined ? !!customStyle.italic : (origWord.italic !== undefined ? !!origWord.italic : italic);
    const curUnderline = customStyle.underline !== undefined ? !!customStyle.underline : false;
    const curColor = customStyle.color || origWord.color || color;

    const measuredW = currentWordText.trim()
      ? measureTextWidth(currentWordText, curFontFamily, curFontSize, curBold, curItalic)
      : 0;

    let wordX;
    if (i === firstEditedIdx) {
      wordX = origWord.ptX;
      accumulatedShift = (wordX + measuredW) - (origWord.ptX + origWord.ptWidth);
      prevEnd = wordX + measuredW;
    } else {
      const prevOrigWord = line.words[i - 1];
      // Exact original gap in the PDF between word i-1 and word i
      const origGap = Math.max(3.5, origWord.ptX - (prevOrigWord.ptX + prevOrigWord.ptWidth));
      const minSpaceW = Math.max(3.5, curFontSize * 0.28);
      const naturalGap = Math.max(origGap, minSpaceW);

      if (isEdited) {
        wordX = Math.round(prevEnd + naturalGap);
        accumulatedShift += (wordX + measuredW) - (origWord.ptX + origWord.ptWidth);
        prevEnd = wordX + measuredW;
      } else {
        // Unchanged following word:
        if (accumulatedShift < 0) {
          // Shorter replacement: close gap towards left to keep natural flow
          // while strictly maintaining natural gap
          wordX = Math.max(Math.round(prevEnd + naturalGap), Math.round(origWord.ptX + accumulatedShift));
          prevEnd = wordX + (measuredW || origWord.ptWidth);
        } else if (accumulatedShift === 0) {
          wordX = origWord.ptX;
          prevEnd = wordX + origWord.ptWidth;
        } else {
          // Longer replacement: shift following words right by accumulatedShift,
          // perfectly preserving the exact original gap between all following words!
          wordX = Math.max(Math.round(origWord.ptX + accumulatedShift), Math.round(prevEnd + naturalGap));
          prevEnd = wordX + (measuredW || origWord.ptWidth);
        }
      }
    }

    reflowWords.push({
      id: origWord.id,
      originalText: origWord.text,
      text: currentWordText,
      origPtX: origWord.ptX,
      reflowPtX: wordX,
      ptWidth: measuredW || origWord.ptWidth,
      ptHeight: origWord.ptHeight,
      baselinePtY: origWord.baselinePtY !== undefined ? origWord.baselinePtY : line.baselinePtY,
      pdfBaselineY: origWord.pdfBaselineY !== undefined ? origWord.pdfBaselineY : line.pdfBaselineY,
      pdfBaselineX: origWord.pdfBaselineX,
      fontSize: curFontSize,
      fontFamily: curFontFamily,
      bold: curBold,
      italic: curItalic,
      underline: curUnderline,
      color: curColor,
      isTarget,
      isEdited,
    });

    prevEnd = wordX + measuredW;
  }

  const lastOrigWord = line.words[lastIdx - 1];
  const origEnd = lastOrigWord.ptX + lastOrigWord.ptWidth;
  const lastReflowWord = reflowWords[reflowWords.length - 1];
  const reflowEnd = lastReflowWord.reflowPtX + lastReflowWord.ptWidth;
  const deltaTotal = reflowEnd - origEnd;

  if (align === 'right') {
    for (const rw of reflowWords) {
      rw.reflowPtX = Math.round(rw.reflowPtX - deltaTotal);
    }
  } else if (align === 'center') {
    const shift = Math.round(deltaTotal / 2);
    for (const rw of reflowWords) {
      rw.reflowPtX = Math.round(rw.reflowPtX - shift);
    }
  }

  const minX = Math.min(firstEditedWord.ptX, reflowWords[0].reflowPtX);
  const maxX = Math.max(origEnd, reflowWords[reflowWords.length - 1].reflowPtX + reflowWords[reflowWords.length - 1].ptWidth);

  // Exact typographic ascent & descent: descent is ONLY added if words have descender glyphs
  const hasAnyDescenders = reflowWords.some((rw) =>
    hasDescenderGlyphs(rw.originalText) || hasDescenderGlyphs(rw.text)
  );
  const lineFont = line.fontFamily || (reflowWords[0] && reflowWords[0].fontFamily);
  const ascentRatio = getFontAscentRatio(lineFont);
  const descentRatio = getFontDescentRatio(lineFont);
  const ascent = Math.ceil(fontSize * ascentRatio);
  const descent = hasAnyDescenders ? Math.ceil(fontSize * descentRatio) : 0;
  const baselinePtY = line.baselinePtY !== undefined ? line.baselinePtY : (line.ptY + ascent);

  // Minimal safe bleed (<= 0.75pt)
  const bleedX = 0.75;
  const bleedY = 0.5;

  // Clamp left boundary against preceding word (e.g. S.P.)
  let safeMinX = minX;
  if (firstEditedIdx > 0) {
    const prevWord = line.words[firstEditedIdx - 1];
    const prevEnd = prevWord.ptX + prevWord.ptWidth;
    const gapLeft = minX - prevEnd;
    const safeBleedLeft = Math.min(bleedX, Math.max(0, (gapLeft - 0.5) / 2));
    safeMinX = Math.max(prevEnd + 0.5, minX - safeBleedLeft);
  } else {
    safeMinX = Math.max(0, minX - bleedX);
  }
  const coverPtX = Math.round(safeMinX);

  // Clamp right boundary
  const safeMaxX = Math.min(pagePtWidth - 12, maxX + bleedX);
  const coverPtWidth = Math.max(4, Math.round(safeMaxX - coverPtX));

  // Vertical bounds
  let coverPtY = Math.round(baselinePtY - ascent - bleedY);
  let coverPtHeight = Math.round(ascent + descent + bleedY * 2);

  // Clamp against line above
  if (lineAbove) {
    const lineAboveBottom = lineAbove.baselinePtY !== undefined
      ? (lineAbove.baselinePtY + (hasDescenderGlyphs(lineAbove.fullOriginalText) ? Math.ceil((lineAbove.fontSize || 12) * 0.20) : 0))
      : (lineAbove.ptY + lineAbove.ptHeight);
    const minSafeY = lineAboveBottom + 0.5;
    if (coverPtY < minSafeY) {
      const diff = minSafeY - coverPtY;
      coverPtY = minSafeY;
      coverPtHeight = Math.max(4, coverPtHeight - diff);
    }
  }

  // Clamp against line below
  if (lineBelow) {
    const lineBelowTop = lineBelow.baselinePtY !== undefined
      ? (lineBelow.baselinePtY - Math.ceil((lineBelow.fontSize || 12) * getFontAscentRatio(lineBelow.fontFamily)))
      : lineBelow.ptY;
    const maxSafeY = lineBelowTop - 0.5;
    if (coverPtY + coverPtHeight > maxSafeY) {
      coverPtHeight = Math.max(4, maxSafeY - coverPtY);
    }
  }

  const maxSafeX = pagePtWidth - 24;
  const finalEnd = reflowWords[reflowWords.length - 1].reflowPtX + reflowWords[reflowWords.length - 1].ptWidth;
  const overflowsBoundary = finalEnd > maxSafeX;
  const overflowAmount = overflowsBoundary ? Math.round(finalEnd - maxSafeX) : 0;
  const overflowWarning = overflowsBoundary
    ? `Line reflow extends ${overflowAmount}pt beyond page margin`
    : null;

  const stableLineReplId = line.id
    ? (String(line.id).startsWith('line_repl_') ? line.id : `line_repl_${line.id}`)
    : `line_repl_${Date.now()}`;

  return {
    id: stableLineReplId,
    lineId: line.id,
    page: line.page,
    ptY: line.ptY,
    baselinePtY,
    pdfBaselineY: line.pdfBaselineY,
    pdfBaselineX: line.pdfBaselineX,
    ptHeight: line.ptHeight,
    coverPtX,
    coverPtY,
    coverPtWidth,
    coverPtHeight,
    coverColor: '#FFFFFF',
    deltaWidth: deltaTotal,
    reflowWords,
    activeEdits,
    wordStyles,
    firstEditedIdx,
    align,
    overflowsBoundary,
    overflowAmount,
    overflowWarning,
  };
}
