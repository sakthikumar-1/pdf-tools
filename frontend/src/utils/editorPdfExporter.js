/**
 * Simatrix PDF Tools - Client-Side PDF Editor Export Engine
 * 
 * Uses pdf-lib to embed all Phase 2A inserted text boxes and Phase 2B text
 * replacements/cover overlays into the original PDF document.
 * 
 * Features:
 * - Preserves original vector, image, and text content of every page.
 * - Supports standard PDF fonts (Helvetica, Times Roman, Courier) in Regular, Bold, Italic, and Bold-Italic.
 * - Handles solid cover backgrounds (for existing text replacement / whiteout) and transparent backgrounds.
 * - Performs word wrapping for multiline text boxes.
 * - Accurate Left, Center, and Right text alignment.
 * - Rotated page transformation (0°, 90°, 180°, 270°).
 * - Multi-page document support with per-page layer isolation.
 * - Full validation of the exported PDF binary before returning the Blob.
 */

import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { normalizeRotation } from './editorCoordinates.js';
import { getFontAscentRatio } from './editorReflow.js';

/**
 * Converts a hex color string (e.g. #2563EB or #FFF) to pdf-lib rgb(r, g, b)
 * Returns null if transparent or invalid.
 */
export function hexToPdfRgb(hex) {
  if (!hex || hex === 'transparent' || hex === 'none') return null;
  let clean = hex.trim().replace(/^#/, '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  if (clean.length !== 6) return null;
  const num = parseInt(clean, 16);
  if (isNaN(num)) return null;
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  return rgb(r, g, b);
}

/**
 * Splits text into lines wrapped to maxWidth in PDF points using the embedded font.
 * Supports long words and URLs with character-level breaking to prevent overflowing maxWidth.
 */
export function wrapTextToWidth(text, font, fontSize, maxWidth) {
  const paragraphs = String(text || '').split('\n');
  const lines = [];
  const safeMaxWidth = Math.max(20, maxWidth);

  const measureW = (str) => {
    try {
      return font.widthOfTextAtSize(str, fontSize);
    } catch (_) {
      return str.length * fontSize * 0.55;
    }
  };

  const splitLongWord = (word) => {
    const chunks = [];
    let rem = word;
    while (rem.length > 0) {
      let low = 1;
      let high = rem.length;
      let best = 1;
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const sub = rem.slice(0, mid);
        if (measureW(sub) <= safeMaxWidth) {
          best = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }
      chunks.push(rem.slice(0, best));
      rem = rem.slice(best);
    }
    return chunks;
  };

  for (const para of paragraphs) {
    if (!para.trim()) {
      lines.push('');
      continue;
    }

    const words = para.split(/\s+/).filter(Boolean);
    let currentLine = '';

    for (const rawWord of words) {
      const wordChunks = measureW(rawWord) > safeMaxWidth ? splitLongWord(rawWord) : [rawWord];

      for (const chunk of wordChunks) {
        if (!currentLine) {
          currentLine = chunk;
        } else {
          const testLine = `${currentLine} ${chunk}`;
          if (measureW(testLine) <= safeMaxWidth) {
            currentLine = testLine;
          } else {
            lines.push(currentLine);
            currentLine = chunk;
          }
        }
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines;
}

/**
 * Safely draws text and custom vector symbols (like diamond bullets ◆, circles ●,
 * squares ■, checkmarks ✔, arrows →) onto a pdf-lib PDFPage.
 * Standard PDF fonts (Helvetica, Times Roman) use WinAnsiEncoding which throws
 * on unicode characters like ◆ (0x25C6).
 * This function renders special bullet/symbol glyphs as crisp native PDF vector graphics
 * and standard text segments using page.drawText, eliminating crashes and tofu/square glyph bugs.
 * 
 * @param {import('pdf-lib').PDFPage} page 
 * @param {string} textStr 
 * @param {Object} options 
 * @returns {number} Measured total width of rendered text and symbols
 */
export function safeDrawTextAndSymbols(page, textStr, options = {}) {
  if (!textStr || !page) return 0;
  const {
    x = 0,
    y = 0,
    size = 12,
    font,
    color = rgb(0.07, 0.09, 0.15),
    opacity = 1,
    rotate,
  } = options;

  const str = String(textStr);

  // Quick check: if the font can encode the text directly with no non-standard symbols, draw directly
  let canDirectEncode = true;
  try {
    if (font && typeof font.encodeText === 'function') {
      font.encodeText(str);
    }
  } catch (_) {
    canDirectEncode = false;
  }

  if (canDirectEncode) {
    page.drawText(str, {
      x,
      y,
      size,
      font,
      color,
      opacity,
      ...(rotate ? { rotate } : {}),
    });
    try {
      return font.widthOfTextAtSize(str, size);
    } catch (_) {
      return str.length * size * 0.55;
    }
  }

  // Regex splitting on known special symbols
  const SYMBOL_REGEX = /([◆◇◈❖✦✧●○⦿■□▪▫▲►▸▼✔✓☑➔➜➤→])/u;
  const parts = str.split(SYMBOL_REGEX);

  let curX = x;
  let totalWidth = 0;

  for (const part of parts) {
    if (!part) continue;

    if (part.length === 1 && SYMBOL_REGEX.test(part)) {
      const sym = part;
      const cy = y + size * 0.32;
      const rad = size * 0.28;

      if (['◆', '◇', '◈', '❖', '✦', '✧'].includes(sym)) {
        // Vector Diamond
        const cx = curX + rad;
        const d = `M ${cx} ${cy + rad} L ${cx + rad} ${cy} L ${cx} ${cy - rad} L ${cx - rad} ${cy} Z`;
        const isFilled = ['◆', '◈', '❖', '✦'].includes(sym);
        page.drawSvgPath(d, {
          color: isFilled ? color : undefined,
          borderColor: color,
          borderWidth: Math.max(0.75, size * 0.08),
          opacity,
          ...(rotate ? { rotate } : {}),
        });
        const symWidth = rad * 2 + size * 0.15;
        curX += symWidth;
        totalWidth += symWidth;
      } else if (['●', '○', '⦿'].includes(sym)) {
        // Vector Circle
        const cx = curX + rad;
        const isFilled = ['●', '⦿'].includes(sym);
        if (isFilled) {
          page.drawCircle({
            x: cx,
            y: cy,
            size: rad,
            color,
            opacity,
          });
        } else {
          page.drawCircle({
            x: cx,
            y: cy,
            size: rad,
            borderColor: color,
            borderWidth: Math.max(0.75, size * 0.08),
            opacity,
          });
        }
        const symWidth = rad * 2 + size * 0.15;
        curX += symWidth;
        totalWidth += symWidth;
      } else if (['■', '□', '▪', '▫'].includes(sym)) {
        // Vector Square
        const side = ['▪', '▫'].includes(sym) ? size * 0.36 : size * 0.52;
        const isFilled = ['■', '▪'].includes(sym);
        const sx = curX;
        const sy = cy - side / 2;
        if (isFilled) {
          page.drawSquare({
            x: sx,
            y: sy,
            size: side,
            color,
            opacity,
            ...(rotate ? { rotate } : {}),
          });
        } else {
          page.drawSquare({
            x: sx,
            y: sy,
            size: side,
            borderColor: color,
            borderWidth: Math.max(0.75, size * 0.08),
            opacity,
            ...(rotate ? { rotate } : {}),
          });
        }
        const symWidth = side + size * 0.15;
        curX += symWidth;
        totalWidth += symWidth;
      } else if (['✔', '✓', '☑'].includes(sym)) {
        // Vector Checkmark
        const chkH = size * 0.5;
        const d = `M ${curX} ${cy} L ${curX + chkH * 0.35} ${cy - chkH * 0.35} L ${curX + chkH} ${cy + chkH * 0.5}`;
        page.drawSvgPath(d, {
          borderColor: color,
          borderWidth: Math.max(1, size * 0.1),
          opacity,
          ...(rotate ? { rotate } : {}),
        });
        const symWidth = chkH + size * 0.2;
        curX += symWidth;
        totalWidth += symWidth;
      } else if (['➔', '➜', '➤', '→'].includes(sym)) {
        // Vector Arrow
        const arrW = size * 0.55;
        const d = `M ${curX} ${cy} L ${curX + arrW} ${cy} M ${curX + arrW - size * 0.2} ${cy + size * 0.2} L ${curX + arrW} ${cy} L ${curX + arrW - size * 0.2} ${cy - size * 0.2}`;
        page.drawSvgPath(d, {
          borderColor: color,
          borderWidth: Math.max(0.8, size * 0.08),
          opacity,
          ...(rotate ? { rotate } : {}),
        });
        const symWidth = arrW + size * 0.2;
        curX += symWidth;
        totalWidth += symWidth;
      } else {
        // Fallback bullet dot
        page.drawCircle({
          x: curX + rad,
          y: cy,
          size: rad,
          color,
          opacity,
        });
        const symWidth = rad * 2 + size * 0.15;
        curX += symWidth;
        totalWidth += symWidth;
      }
    } else {
      // Safe plain text segment: ensure each character can be safely encoded without throwing
      let safeSegment = '';
      for (const char of part) {
        try {
          if (font && typeof font.encodeText === 'function') {
            font.encodeText(char);
            safeSegment += char;
          } else {
            safeSegment += char;
          }
        } catch (_) {
          safeSegment += ' ';
        }
      }

      if (safeSegment) {
        page.drawText(safeSegment, {
          x: curX,
          y,
          size,
          font,
          color,
          opacity,
          ...(rotate ? { rotate } : {}),
        });
        let segW = 0;
        try {
          segW = font.widthOfTextAtSize(safeSegment, size);
        } catch (_) {
          segW = safeSegment.length * size * 0.55;
        }
        curX += segW;
        totalWidth += segW;
      }
    }
  }

  return totalWidth;
}

/**
 * Exports the edited PDF document client-side using pdf-lib.
 * 
 * @param {Object} options
 * @param {File|Blob|ArrayBuffer} options.file - Original uploaded PDF file
 * @param {Array<Object>} [options.textBoxes] - Array of user-inserted text boxes
 * @param {Array<Object>} [options.textReplacements] - Array of existing PDF text replacements
 * @param {Function} [options.onProgress] - Callback reporting percentage (0 to 100)
 * @returns {Promise<Blob>} The generated PDF as an application/pdf Blob
 */
export async function exportEditedPdf({ file, textBoxes = [], textReplacements = [], onProgress }) {
  if (!file) {
    throw new Error('No PDF file provided for export.');
  }

  if (typeof onProgress === 'function') onProgress(10);

  // 1. Read file as ArrayBuffer
  let arrayBuffer;
  if (file instanceof ArrayBuffer) {
    arrayBuffer = file;
  } else if (file instanceof Blob || typeof file.arrayBuffer === 'function') {
    arrayBuffer = await file.arrayBuffer();
  } else {
    throw new Error('Unsupported file input format.');
  }

  if (typeof onProgress === 'function') onProgress(20);

  // 2. Load PDF into pdf-lib (preserving original structure & metadata)
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const totalPages = pdfDoc.getPageCount();

  if (totalPages === 0) {
    throw new Error('PDF document contains no pages.');
  }

  if (typeof onProgress === 'function') onProgress(30);

  // 3. Embed Standard 14 Fonts (Universal, zero CDN dependency)
  const fontCache = {
    'Helvetica': {
      regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
      bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
      italic: await pdfDoc.embedFont(StandardFonts.HelveticaOblique),
      boldItalic: await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique),
    },
    'Times Roman': {
      regular: await pdfDoc.embedFont(StandardFonts.TimesRoman),
      bold: await pdfDoc.embedFont(StandardFonts.TimesRomanBold),
      italic: await pdfDoc.embedFont(StandardFonts.TimesRomanItalic),
      boldItalic: await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic),
    },
    'Courier': {
      regular: await pdfDoc.embedFont(StandardFonts.Courier),
      bold: await pdfDoc.embedFont(StandardFonts.CourierBold),
      italic: await pdfDoc.embedFont(StandardFonts.CourierOblique),
      boldItalic: await pdfDoc.embedFont(StandardFonts.CourierBoldOblique),
    },
  };

  if (typeof onProgress === 'function') onProgress(40);

  // Helper to select the correct embedded font variant
  const getEmbeddedFont = (family = 'Helvetica', isBold = false, isItalic = false) => {
    const fam = fontCache[family] || fontCache['Helvetica'];
    if (isBold && isItalic) return fam.boldItalic;
    if (isBold) return fam.bold;
    if (isItalic) return fam.italic;
    return fam.regular;
  };

  // 4. Process each page
  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const pageNum = pageIdx + 1;
    const page = pdfDoc.getPage(pageIdx);
    const { width: W, height: H } = page.getSize();
    const rawRotation = page.getRotation().angle;
    const rotation = normalizeRotation(rawRotation);

    // 4A. Process Existing PDF Text Replacements on this page
    const pageReplacements = textReplacements.filter((r) => (r.page || r.pageNumber || 1) === pageNum);
    const processedShiftedSectionIds = new Set();

    for (const repl of pageReplacements) {
      // 1. Draw solid cover rectangle over original text (with bleed) to visually mask original glyphs
      const coverX = Math.round(Number(repl.coverPtX ?? repl.ptX) || 0);
      const coverY = Math.round(Number(repl.coverPtY ?? repl.ptY) || 0);
      const coverW = Math.max(1, Math.round(Number(repl.coverPtWidth ?? repl.ptWidth) || 10));
      const coverH = Math.max(1, Math.round(Number(repl.coverPtHeight ?? repl.ptHeight) || 10));

      const bgRgb = hexToPdfRgb(repl.coverColor || repl.backgroundColor || '#FFFFFF') || rgb(1, 1, 1);
      if (bgRgb) {
        let rx = coverX;
        let ry = H - coverY - coverH;
        let rw = coverW;
        let rh = coverH;

        if (rotation === 90) {
          rx = coverY;
          ry = coverX;
          rw = coverH;
          rh = coverW;
        } else if (rotation === 180) {
          rx = W - coverX - coverW;
          ry = coverY;
          rw = coverW;
          rh = coverH;
        } else if (rotation === 270) {
          rx = W - coverY - coverH;
          ry = H - coverX - coverW;
          rw = coverH;
          rh = coverW;
        }

        page.drawRectangle({
          x: rx,
          y: ry,
          width: rw,
          height: rh,
          color: bgRgb,
        });
      }

      // Case 0: Section Reflow Replacement (Paragraph, Line, Heading, Subtitle)
      if (repl.type === 'section_reflow') {
        const font = getEmbeddedFont(repl.fontFamily, repl.bold, repl.italic);
        const fontSize = Math.max(6, Math.min(144, Math.round(Number(repl.fontSize) || 14)));
        const textRgb = hexToPdfRgb(repl.color) || rgb(0.07, 0.09, 0.15);
        const textOpacity = Math.max(0.1, Math.min(1.0, Number(repl.opacity) || 1.0));
        const lHeightMultiplier = Number(repl.lineHeight) || 1.25;
        const lineSpacingPt = fontSize * lHeightMultiplier;
        const align = repl.align || 'left';
        const availWidth = Math.max(20, (repl.availableWidth || repl.ptWidth || 300));

        let linesToDraw = [];
        if (Array.isArray(repl.wrappedLines) && repl.wrappedLines.length > 0) {
          linesToDraw = repl.wrappedLines.map((l) =>
            typeof l === 'object' && l !== null ? (l.text !== undefined ? l.text : '') : String(l)
          );
        } else {
          linesToDraw = wrapTextToWidth(repl.replacementText || '', font, fontSize, availWidth);
        }

        const startX = repl.textStartX !== undefined ? repl.textStartX : (repl.origPtX !== undefined ? repl.origPtX : (repl.ptX !== undefined ? repl.ptX : coverX));
        const startY = repl.origPtY !== undefined ? repl.origPtY : (repl.ptY !== undefined ? repl.ptY : coverY);

        for (let lIdx = 0; lIdx < linesToDraw.length; lIdx++) {
          const lineStr = linesToDraw[lIdx];
          if (!lineStr || !lineStr.trim()) continue;

          let lineWidth = 0;
          try {
            lineWidth = font.widthOfTextAtSize(lineStr, fontSize);
          } catch (_) {
            lineWidth = lineStr.length * fontSize * 0.55;
          }

          let alignOffset = 0;
          if (align === 'center') {
            alignOffset = Math.max(0, (availWidth - lineWidth) / 2);
          } else if (align === 'right') {
            alignOffset = Math.max(0, availWidth - lineWidth);
          }

          const wl = Array.isArray(repl.wrappedLines) && repl.wrappedLines[lIdx] && typeof repl.wrappedLines[lIdx] === 'object'
            ? repl.wrappedLines[lIdx]
            : null;

          const ascentRatio = getFontAscentRatio(repl.fontFamily);
          const lineX = wl && wl.ptX !== undefined ? wl.ptX : (startX + alignOffset);
          const lineY = startY + (lIdx * lineSpacingPt) + (fontSize * ascentRatio);
          const exactBaseline = wl && wl.pdfBaselineY !== undefined
            ? wl.pdfBaselineY
            : (repl.pdfBaselineY !== undefined
              ? (repl.pdfBaselineY - (lIdx * lineSpacingPt))
              : (H - lineY));

          let targetPage = page;
          let drawTy = exactBaseline;
          if (exactBaseline < 24) {
            // Requirement 6: Graceful page continuation if content exceeds bottom margin
            if (pageIdx + 1 < pdfDoc.getPageCount()) {
              targetPage = pdfDoc.getPage(pageIdx + 1);
            } else {
              targetPage = pdfDoc.addPage([W, H]);
            }
            drawTy = H - 36 - (lIdx * lineSpacingPt);
          }

          let tx = lineX;
          let ty = drawTy;
          let textAngle = 0;

          if (rotation === 90) {
            tx = H - drawTy;
            ty = lineX;
            textAngle = 90;
          } else if (rotation === 180) {
            tx = W - lineX;
            ty = drawTy;
            textAngle = 180;
          } else if (rotation === 270) {
            tx = drawTy;
            ty = H - lineX;
            textAngle = 270;
          }

          try {
            safeDrawTextAndSymbols(targetPage, lineStr, {
              x: tx,
              y: ty,
              size: fontSize,
              font: font,
              color: textRgb,
              opacity: textOpacity,
              rotate: degrees(textAngle),
            });

            // Underline support if requested
            if (repl.underline && rotation === 0) {
              targetPage.drawLine({
                start: { x: tx, y: ty - 2 },
                end: { x: tx + lineWidth, y: ty - 2 },
                thickness: Math.max(0.75, fontSize * 0.06),
                color: textRgb,
                opacity: textOpacity,
              });
            }
          } catch (drawErr) {
            console.warn('[PDFExporter Section Line Draw Error]:', drawErr);
          }
        }

        // Draw shifted lower sections attached to this reflow replacement
        if (Array.isArray(repl.shiftedSections)) {
          for (const s of repl.shiftedSections) {
            if (pageReplacements.some((r) => r.sectionId === s.id || r.targetId === s.id)) {
              continue; // If section has its own explicit replacement, let that replacement handle it
            }
            if (processedShiftedSectionIds.has(s.id)) {
              continue;
            }
            processedShiftedSectionIds.add(s.id);

            // 1. Solid whiteout cover over s's ORIGINAL bounds to mask the original PDF text
            const origMaskX = Math.round(s.originalPtX !== undefined ? s.originalPtX : s.ptX);
            const origMaskY = Math.round(s.originalPtY !== undefined ? s.originalPtY : s.ptY);
            const origMaskW = Math.max(1, Math.round(s.originalPtWidth !== undefined ? s.originalPtWidth : s.ptWidth) + 1);
            const origMaskH = Math.max(1, Math.round(s.originalPtHeight !== undefined ? s.originalPtHeight : s.ptHeight) + 1);

            let mx = origMaskX;
            let my = H - origMaskY - origMaskH;
            let mw = origMaskW;
            let mh = origMaskH;

            if (rotation === 90) {
              mx = origMaskY;
              my = origMaskX;
              mw = origMaskH;
              mh = origMaskW;
            } else if (rotation === 180) {
              mx = W - origMaskX - origMaskW;
              my = origMaskY;
              mw = origMaskW;
              mh = origMaskH;
            } else if (rotation === 270) {
              mx = W - origMaskY - origMaskH;
              my = H - origMaskX - origMaskW;
              mw = origMaskH;
              mh = origMaskW;
            }

            page.drawRectangle({
              x: mx,
              y: my,
              width: mw,
              height: mh,
              color: rgb(1, 1, 1),
            });

            // 2. Solid whiteout cover over s's NEW shifted bounds
            const shiftMaskX = Math.round(s.ptX);
            const shiftMaskY = Math.round(s.ptY);
            const shiftMaskW = Math.max(1, Math.round(s.ptWidth) + 1);
            const shiftMaskH = Math.max(1, Math.round(s.ptHeight) + 1);

            let smx = shiftMaskX;
            let smy = H - shiftMaskY - shiftMaskH;
            let smw = shiftMaskW;
            let smh = shiftMaskH;

            if (rotation === 90) {
              smx = shiftMaskY;
              smy = shiftMaskX;
              smw = shiftMaskH;
              smh = shiftMaskW;
            } else if (rotation === 180) {
              smx = W - shiftMaskX - shiftMaskW;
              smy = shiftMaskY;
              smw = shiftMaskW;
              smh = shiftMaskH;
            } else if (rotation === 270) {
              smx = W - shiftMaskY - shiftMaskH;
              smy = H - shiftMaskX - shiftMaskW;
              smw = shiftMaskH;
              smh = shiftMaskW;
            }

            page.drawRectangle({
              x: smx,
              y: smy,
              width: smw,
              height: smh,
              color: rgb(1, 1, 1),
            });

            // 3. Draw s's lines at their new shifted coordinates
            if (Array.isArray(s.lines)) {
              for (let lineIdx = 0; lineIdx < s.lines.length; lineIdx++) {
                const line = s.lines[lineIdx];
                const lineText = String(line.text || '').trim();
                if (!lineText) continue;

                const font = getEmbeddedFont(line.fontFamily || s.fontFamily, line.bold || s.bold, line.italic || s.italic);
                const fontSize = Math.max(6, Math.min(144, Math.round(Number(line.fontSize || s.fontSize) || 14)));
                const textRgb = hexToPdfRgb(line.color || s.color) || rgb(0.07, 0.09, 0.15);
                const ascentRatio = getFontAscentRatio(line.fontFamily || s.fontFamily);

                const exactBaseline = line.pdfBaselineY !== undefined
                  ? line.pdfBaselineY
                  : (H - line.ptY - (fontSize * ascentRatio));

                let targetPage = page;
                let drawTy = exactBaseline;
                if (exactBaseline < 24) {
                  // Requirement 6: Handle page bottom margin overflow continuation cleanly without clipping
                  if (pageIdx + 1 < pdfDoc.getPageCount()) {
                    targetPage = pdfDoc.getPage(pageIdx + 1);
                  } else {
                    targetPage = pdfDoc.addPage([W, H]);
                  }
                  drawTy = H - 36 - (lineIdx * (fontSize * 1.25));
                }

                let tx = line.ptX !== undefined ? line.ptX : s.ptX;
                let ty = drawTy;
                let textAngle = 0;

                if (rotation === 90) {
                  tx = H - drawTy;
                  ty = line.ptX !== undefined ? line.ptX : s.ptX;
                  textAngle = 90;
                } else if (rotation === 180) {
                  tx = W - (line.ptX !== undefined ? line.ptX : s.ptX);
                  ty = drawTy;
                  textAngle = 180;
                } else if (rotation === 270) {
                  tx = drawTy;
                  ty = H - (line.ptX !== undefined ? line.ptX : s.ptX);
                  textAngle = 270;
                }

                try {
                  safeDrawTextAndSymbols(targetPage, lineText, {
                    x: tx,
                    y: ty,
                    size: fontSize,
                    font: font,
                    color: textRgb,
                    rotate: degrees(textAngle),
                  });
                } catch (drawErr) {
                  console.warn('[PDFExporter Shifted Line Draw Error]:', drawErr);
                }
              }
            }
          }
        }
      } else if (repl.reflowLine && Array.isArray(repl.reflowLine.reflowWords)) {
        // Case 1: Intelligent Line Reflow Replacement
        for (const rwItem of repl.reflowLine.reflowWords) {
          const text = String(rwItem.text || '').trim();
          if (!text) continue;

          const wordFontSize = Math.max(6, Math.min(144, Math.round(Number(rwItem.fontSize) || 14)));
          const font = getEmbeddedFont(rwItem.fontFamily, rwItem.bold, rwItem.italic);
          const textRgb = hexToPdfRgb(rwItem.color) || rgb(0.07, 0.09, 0.15);

          let tx = rwItem.reflowPtX;
          const ascentRatio = getFontAscentRatio(rwItem.fontFamily);
          const exactBaseline = rwItem.pdfBaselineY !== undefined
            ? rwItem.pdfBaselineY
            : (repl.pdfBaselineY !== undefined ? repl.pdfBaselineY : (H - repl.reflowLine.ptY - wordFontSize * ascentRatio));
          let ty = exactBaseline;
          let textAngle = 0;

          if (rotation === 90) {
            tx = H - exactBaseline;
            ty = rwItem.reflowPtX;
            textAngle = 90;
          } else if (rotation === 180) {
            tx = W - rwItem.reflowPtX;
            ty = exactBaseline;
            textAngle = 180;
          } else if (rotation === 270) {
            tx = exactBaseline;
            ty = H - rwItem.reflowPtX;
            textAngle = 270;
          }

          try {
            safeDrawTextAndSymbols(page, text, {
              x: tx,
              y: ty,
              size: wordFontSize,
              font: font,
              color: textRgb,
              rotate: degrees(textAngle),
            });

            if (rwItem.underline && rotation === 0) {
              let wordWidth = 0;
              try {
                wordWidth = font.widthOfTextAtSize(text, wordFontSize);
              } catch (_) {
                wordWidth = text.length * wordFontSize * 0.55;
              }
              page.drawLine({
                start: { x: tx, y: ty - 2 },
                end: { x: tx + wordWidth, y: ty - 2 },
                thickness: Math.max(0.75, wordFontSize * 0.06),
                color: textRgb,
              });
            }
          } catch (err) {
            console.warn('[PDFExporter Reflow Word Draw Error]:', err);
          }
        }
      } else {
        // Case 2: Standalone Single-Word or Manual Area Replacement
        const origX = Math.round(Number(repl.origPtX ?? repl.ptX) || 0);
        const origY = Math.round(Number(repl.origPtY ?? repl.ptY) || 0);
        const fontSize = Math.max(6, Math.min(144, Math.round(Number(repl.fontSize) || 14)));
        const textContent = String(repl.replacementText ?? repl.text ?? '');

        if (textContent.trim()) {
          const font = getEmbeddedFont(repl.fontFamily, repl.bold, repl.italic);
          const textRgb = hexToPdfRgb(repl.color) || rgb(0.07, 0.09, 0.15);

          let tx = origX;
          const ascentRatio = getFontAscentRatio(repl.fontFamily);
          const exactBaseline = repl.pdfBaselineY !== undefined
            ? repl.pdfBaselineY
            : (H - origY - fontSize * ascentRatio);
          let ty = exactBaseline;
          let textAngle = 0;

          if (rotation === 90) {
            tx = H - exactBaseline;
            ty = origX;
            textAngle = 90;
          } else if (rotation === 180) {
            tx = W - origX;
            ty = exactBaseline;
            textAngle = 180;
          } else if (rotation === 270) {
            tx = exactBaseline;
            ty = H - origX;
            textAngle = 270;
          }

          try {
            if (Array.isArray(repl.wrappedLines) && repl.wrappedLines.length > 1) {
              const lineSpacingPt = Number(repl.lineSpacingPt) || Math.round(fontSize * 1.25);
              for (let lIdx = 0; lIdx < repl.wrappedLines.length; lIdx++) {
                const wl = repl.wrappedLines[lIdx];
                const lineStr = typeof wl === 'object' ? wl.text : String(wl);
                if (!lineStr || !lineStr.trim()) continue;

                const lx = typeof wl === 'object' && wl.ptX !== undefined ? wl.ptX : (lIdx === 0 ? origX : (repl.indentX || origX));
                const ly = typeof wl === 'object' && wl.pdfBaselineY !== undefined
                  ? wl.pdfBaselineY
                  : (exactBaseline - lIdx * lineSpacingPt);

                let lineTx = lx;
                let lineTy = ly;
                let lineAngle = 0;
                if (rotation === 90) {
                  lineTx = H - ly;
                  lineTy = lx;
                  lineAngle = 90;
                } else if (rotation === 180) {
                  lineTx = W - lx;
                  lineTy = ly;
                  lineAngle = 180;
                } else if (rotation === 270) {
                  lineTx = ly;
                  lineTy = H - lx;
                  lineAngle = 270;
                }

                safeDrawTextAndSymbols(page, lineStr, {
                  x: lineTx,
                  y: lineTy,
                  size: fontSize,
                  font: font,
                  color: textRgb,
                  rotate: degrees(lineAngle),
                });
              }
            } else {
              safeDrawTextAndSymbols(page, textContent, {
                x: tx,
                y: ty,
                size: fontSize,
                font: font,
                color: textRgb,
                rotate: degrees(textAngle),
              });
            }

            if (repl.underline && rotation === 0) {
              let textWidth = 0;
              try {
                textWidth = font.widthOfTextAtSize(textContent, fontSize);
              } catch (_) {
                textWidth = textContent.length * fontSize * 0.55;
              }
              page.drawLine({
                start: { x: tx, y: ty - 2 },
                end: { x: tx + textWidth, y: ty - 2 },
                thickness: Math.max(0.75, fontSize * 0.06),
                color: textRgb,
              });
            }
          } catch (drawErr) {
            console.warn('[PDFExporter Replacement Draw Error]:', drawErr);
          }
        }
      }
    }

    // 4B. Process User-Inserted Floating Text Boxes on this page
    const pageBoxes = textBoxes.filter((b) => (b.page || b.pageNumber || 1) === pageNum);

    for (const box of pageBoxes) {
      const ptX = Math.round(Number(box.ptX) || 0);
      const ptY = Math.round(Number(box.ptY) || 0);
      const ptW = Math.max(20, Math.round(Number(box.ptWidth) || 120));
      const ptH = Math.max(16, Math.round(Number(box.ptHeight) || 36));
      const fontSize = Math.max(6, Math.min(144, Math.round(Number(box.fontSize) || 14)));
      const lineHeightMultiplier = Number(box.lineHeight) || 1.25;
      const lineHeightPt = fontSize * lineHeightMultiplier;
      const align = box.align || 'left';
      const textContent = String(box.text || '');

      // 4A. Draw Background Cover Rectangle (if colored or replacement whiteout)
      const bgRgb = hexToPdfRgb(box.backgroundColor);
      if (bgRgb) {
        let rx = ptX;
        let ry = H - ptY - ptH;
        let rw = ptW;
        let rh = ptH;

        if (rotation === 90) {
          rx = ptY;
          ry = ptX;
          rw = ptH;
          rh = ptW;
        } else if (rotation === 180) {
          rx = W - ptX - ptW;
          ry = ptY;
          rw = ptW;
          rh = ptH;
        } else if (rotation === 270) {
          rx = W - ptY - ptH;
          ry = H - ptX - ptW;
          rw = ptH;
          rh = ptW;
        }

        page.drawRectangle({
          x: rx,
          y: ry,
          width: rw,
          height: rh,
          color: bgRgb,
        });
      }

      // 4B. Draw Text Content
      if (textContent.trim()) {
        const font = getEmbeddedFont(box.fontFamily, box.bold, box.italic);
        const textRgb = hexToPdfRgb(box.color) || rgb(0.07, 0.09, 0.15); // default #111827

        const padX = 4;
        const padY = 4;
        const availWidth = ptW - padX * 2;
        const lines = wrapTextToWidth(textContent, font, fontSize, availWidth);

        for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
          const lineStr = lines[lineIdx];
          if (!lineStr) continue;

          let lineWidth = 0;
          try {
            lineWidth = font.widthOfTextAtSize(lineStr, fontSize);
          } catch (_) {
            lineWidth = lineStr.length * fontSize * 0.55;
          }

          // Calculate horizontal alignment offset
          let alignOffset = 0;
          if (align === 'center') {
            alignOffset = Math.max(0, (availWidth - lineWidth) / 2);
          } else if (align === 'right') {
            alignOffset = Math.max(0, availWidth - lineWidth);
          }

          const ascentRatio = getFontAscentRatio(textItem.fontFamily);
          const lineXOffset = padX + alignOffset;
          const lineYOffset = padY + fontSize * ascentRatio + lineIdx * lineHeightPt;

          // Stop drawing if line overflows bottom boundary by too much
          if (lineYOffset > ptH + fontSize) break;

          let tx = ptX + lineXOffset;
          let ty = H - ptY - lineYOffset;
          let textAngle = 0;

          if (rotation === 90) {
            tx = ptY + lineYOffset;
            ty = ptX + lineXOffset;
            textAngle = 90;
          } else if (rotation === 180) {
            tx = W - (ptX + lineXOffset);
            ty = ptY + lineYOffset;
            textAngle = 180;
          } else if (rotation === 270) {
            tx = W - (ptY + lineYOffset);
            ty = H - (ptX + lineXOffset);
            textAngle = 270;
          }

          try {
            safeDrawTextAndSymbols(page, lineStr, {
              x: tx,
              y: ty,
              size: fontSize,
              font: font,
              color: textRgb,
              rotate: degrees(textAngle),
            });
          } catch (lineErr) {
            console.warn('[PDFExporter Line Draw Error]:', lineErr);
          }
        }
      }
    }

    if (typeof onProgress === 'function') {
      const pageProgress = 40 + Math.round(((pageIdx + 1) / totalPages) * 45);
      onProgress(Math.min(85, pageProgress));
    }
  }

  if (typeof onProgress === 'function') onProgress(90);

  // 5. Save the generated PDF
  const pdfBytes = await pdfDoc.save();

  if (!pdfBytes || pdfBytes.length === 0) {
    throw new Error('Exported PDF byte stream is empty.');
  }

  // 6. Verification: Load the generated PDF back to ensure integrity
  try {
    const verifyDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    if (verifyDoc.getPageCount() !== pdfDoc.getPageCount()) {
      throw new Error(`Page count mismatch: expected ${pdfDoc.getPageCount()}, found ${verifyDoc.getPageCount()}`);
    }
  } catch (verifyErr) {
    throw new Error(`Verification of generated PDF failed: ${verifyErr.message}`);
  }

  if (typeof onProgress === 'function') onProgress(100);

  // 7. Return safe application/pdf Blob
  return new Blob([pdfBytes], { type: 'application/pdf' });
}
