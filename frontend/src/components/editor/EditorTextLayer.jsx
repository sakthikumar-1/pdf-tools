/**
 * Simatrix PDF Tools - Editor Existing Text Layer (Direct Editing, Reflow & Area Cover)
 * 
 * Provides:
 * 1. Direct Word-by-Word Click-to-Edit with Intelligent Line Reflow:
 *    - Extracts existing PDF text streams via PDF.js getTextContent().
 *    - Groups word tokens into coherent horizontal visual lines.
 *    - Opens an inline editable field directly over the clicked word.
 *    - Automatically reflows surrounding text on that line:
 *      * Shorter words: Shifts following words left to close gaps naturally.
 *      * Longer words: Shifts following words right to prevent collisions.
 *      * Maintains natural inter-word spacing and original font styles.
 *      * Completely masks original text with an opaque background.
 *      * Supports multiple word edits on the same line.
 *      * Warns if a line reflow expands beyond page margins.
 * 2. Manual Area Replacement Tool:
 *    - Allows dragging a rectangular marquee box over any region to cover and replace.
 * 3. Scanned PDF Detection:
 *    - Detects pages with 0 selectable text streams and clearly explains that direct editing requires OCR.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheck,
  faXmark,
  faCropSimple,
  faInfoCircle,
  faRotateLeft,
  faPen,
  faArrowsUpDownLeftRight,
} from '@fortawesome/free-solid-svg-icons';
import {
  groupWordsIntoLines,
  groupLinesIntoSections,
  calculateLineReflow,
  calculateSectionReflow,
  calculateWordReplacement,
  calculateDownwardSectionShift,
  computePageReflowLayout,
  wrapTextLines,
  applyCapitalization,
  measureTextWidth,
  isBulletWord,
  BULLET_SYMBOLS,
  getFontAscentRatio,
  getFontDescentRatio,
} from '../../utils/editorReflow';

export default function EditorTextLayer({
  pdfDocProxy,
  currentPage = 1,
  zoom = 1.0,
  pagePtWidth = 612,
  pagePtHeight = 792,
  activeTool = 'select',
  textReplacements = [],
  onApplyReplacement,
  onDeleteReplacement,
  onRevertReplacement,
  onApplyDirectEdit,
  onRequestAreaTool,
  // Section-based Selection Scope & Word-Style Editing Props
  selectionLevel = 'word',
  activeTextEdit = null,
  onSetActiveTextEdit,
  onUpdateActiveTextEdit,
  onApplyActiveTextEdit,
  onCancelActiveTextEdit,
  onRevertActiveTextEdit,
  sampleTextColor,
}) {
  const [textItems, setTextItems] = useState([]);
  const [lines, setLines] = useState([]);
  const [sections, setSections] = useState([]);
  const [hoveredTarget, setHoveredTarget] = useState(null);
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [hasTextContent, setHasTextContent] = useState(true);

  // Automatic detected section boxes & interactive selection state (iLovePDF Experience)
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [hoveredSectionId, setHoveredSectionId] = useState(null);
  const [sectionLayouts, setSectionLayouts] = useState({});
  const [downwardShiftDelta, setDownwardShiftDelta] = useState(0);
  const sectionInteractionRef = useRef(null);

  // Guard against blur committing when Cancel or Revert is clicked
  const isActionClickedRef = useRef(false);

  // Resize handle tracking ref
  const resizeRef = useRef(null);

  // Active inline editing session:
  // { id, lineReplId, targetId, lineId, line, word, originalText, replacementText, currentVal, ptX, ptY, ptWidth, ptHeight, bleedX, bleedY, fontSize, fontFamily, bold, italic, underline, color, align, lineHeight, letterSpacing, opacity, backgroundColor, isArea, isExistingReplacement, existingWordEdits }
  const [activeInlineEdit, setActiveInlineEdit] = useState(null);
  const inlineInputRef = useRef(null);
  const activeEditId = activeInlineEdit?.id;
  const initialSelectionDoneRef = useRef(false);

  // Resize handler for interactive 8-point handles (Requirement 3)
  const handleResizeStart = (e, handle) => {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();

    isActionClickedRef.current = true; // prevent textarea blur during resize

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    resizeRef.current = {
      handle,
      startX: clientX,
      startY: clientY,
      startPtX: activeInlineEdit.ptX,
      startPtY: activeInlineEdit.ptY,
      startWidth: activeInlineEdit.availableWidth || activeInlineEdit.ptWidth || 60,
      startHeight: activeInlineEdit.ptHeight || 20,
    };

    const handleResizeMove = (moveEvt) => {
      if (!resizeRef.current) return;
      if (moveEvt.cancelable && moveEvt.touches) {
        moveEvt.preventDefault();
      }

      const curX = moveEvt.touches ? moveEvt.touches[0].clientX : moveEvt.clientX;
      const curY = moveEvt.touches ? moveEvt.touches[0].clientY : moveEvt.clientY;

      const deltaPtX = (curX - resizeRef.current.startX) / zoom;
      const deltaPtY = (curY - resizeRef.current.startY) / zoom;

      const h = resizeRef.current.handle;
      let newPtX = resizeRef.current.startPtX;
      let newPtY = resizeRef.current.startPtY;
      let newWidth = resizeRef.current.startWidth;
      let newHeight = resizeRef.current.startHeight;

      // Horizontal resize
      if (h.includes('e')) {
        newWidth = Math.max(16, Math.min(pagePtWidth - newPtX - 16, resizeRef.current.startWidth + deltaPtX));
      } else if (h.includes('w')) {
        const candidateWidth = resizeRef.current.startWidth - deltaPtX;
        if (candidateWidth >= 16) {
          newWidth = candidateWidth;
          newPtX = resizeRef.current.startPtX + deltaPtX;
        }
      }

      // Vertical resize
      if (h.includes('s')) {
        newHeight = Math.max(14, Math.min(pagePtHeight - newPtY - 16, resizeRef.current.startHeight + deltaPtY));
      } else if (h.includes('n')) {
        const candidateHeight = resizeRef.current.startHeight - deltaPtY;
        if (candidateHeight >= 14) {
          newHeight = candidateHeight;
          newPtY = resizeRef.current.startPtY + deltaPtY;
        }
      }

      setActiveInlineEdit((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          ptX: Math.round(newPtX),
          ptY: Math.round(newPtY),
          ptWidth: Math.round(newWidth),
          availableWidth: Math.round(newWidth),
          ptHeight: Math.round(newHeight),
        };
      });

      if (typeof onUpdateActiveTextEdit === 'function') {
        onUpdateActiveTextEdit({
          ptX: Math.round(newPtX),
          ptY: Math.round(newPtY),
          ptWidth: Math.round(newWidth),
          availableWidth: Math.round(newWidth),
          ptHeight: Math.round(newHeight),
        });
      }
    };

    const handleResizeEnd = () => {
      resizeRef.current = null;
      setTimeout(() => {
        isActionClickedRef.current = false;
      }, 50);
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
      window.removeEventListener('touchmove', handleResizeMove);
      window.removeEventListener('touchend', handleResizeEnd);
    };

    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeEnd);
    window.addEventListener('touchmove', handleResizeMove, { passive: false });
    window.addEventListener('touchend', handleResizeEnd);
  };

  // Separate Floating Toolbar Position Calculation (Requirement 1)
  const computeFloatingToolbarPosition = useCallback(() => {
    if (!activeInlineEdit) return { left: 0, top: 0, placement: 'below' };

    const isSingleWord = activeInlineEdit.selectionLevel === 'word';
    const measuredReplW = isSingleWord
      ? measureTextWidth(
          activeInlineEdit.replacementText || activeInlineEdit.originalText || '',
          activeInlineEdit.fontFamily,
          activeInlineEdit.fontSize,
          activeInlineEdit.bold,
          activeInlineEdit.italic
        )
      : 0;

    const maxAllowedW = Math.max(60, pagePtWidth - activeInlineEdit.ptX - 24);
    const editorWidthPt = isSingleWord
      ? Math.min(maxAllowedW, Math.max(activeInlineEdit.ptWidth, measuredReplW) + 16)
      : Math.min(
          activeInlineEdit.maxWidth || maxAllowedW,
          Math.max(60, (activeInlineEdit.availableWidth || activeInlineEdit.ptWidth) + 12)
        );

    const editorHeightPt = activeInlineEdit.ptHeight || 20;

    const screenLeft = Math.round(activeInlineEdit.ptX * zoom);
    const screenTop = Math.round(activeInlineEdit.ptY * zoom);
    const screenWidth = Math.round(editorWidthPt * zoom);
    const screenHeight = Math.max(24, Math.round(editorHeightPt * zoom));

    const pagePixelWidth = Math.round(pagePtWidth * zoom);
    const pagePixelHeight = Math.round(pagePtHeight * zoom);

    const toolbarWidth = 230;
    const toolbarHeight = 34;
    const gap = 8; // Margin between text and toolbar

    // 1. Vertical positioning: prefer below, flip above if space is tight
    const spaceBelow = pagePixelHeight - (screenTop + screenHeight + gap);
    let finalTop;
    let placement = 'below';

    if (spaceBelow >= toolbarHeight + 4) {
      finalTop = screenTop + screenHeight + gap;
      placement = 'below';
    } else if (screenTop >= toolbarHeight + gap + 4) {
      finalTop = screenTop - toolbarHeight - gap;
      placement = 'above';
    } else {
      if (screenTop > pagePixelHeight / 2) {
        finalTop = Math.max(4, screenTop - toolbarHeight - gap);
        placement = 'above';
      } else {
        finalTop = Math.min(pagePixelHeight - toolbarHeight - 4, screenTop + screenHeight + gap);
        placement = 'below';
      }
    }

    // 2. Horizontal positioning: center over the selection, clamp strictly within page bounds
    let finalLeft = screenLeft + Math.round((screenWidth - toolbarWidth) / 2);
    const minLeft = 8;
    const maxLeft = Math.max(minLeft, pagePixelWidth - toolbarWidth - 8);
    finalLeft = Math.max(minLeft, Math.min(maxLeft, finalLeft));

    return { left: finalLeft, top: finalTop, placement };
  }, [activeInlineEdit, zoom, pagePtWidth, pagePtHeight]);

  // Sync external activeTextEdit (e.g. from properties panel) with local inline editor state
  useEffect(() => {
    if (activeTextEdit) {
      setActiveInlineEdit((prev) => {
        if (!prev) return activeTextEdit;
        return { ...prev, ...activeTextEdit };
      });
    }
  }, [activeTextEdit]);

  // Marquee drag state for manual area replacement
  const [marquee, setMarquee] = useState(null);
  const layerRef = useRef(null);

  // Replacements belonging to the current page
  const pageReplacements = textReplacements.filter((r) => (r.page || 1) === currentPage);

  // Unified non-overlapping layout computed from sections and committed replacements
  const pageLayout = React.useMemo(() => {
    return computePageReflowLayout(sections, pageReplacements, pagePtWidth, pagePtHeight);
  }, [sections, pageReplacements, pagePtWidth, pagePtHeight]);

  // Live reflow layout responding in real time during active inline editing
  const liveLayout = React.useMemo(() => {
    if (!activeInlineEdit || activeInlineEdit.type !== 'section_reflow' || !activeInlineEdit.sectionId) {
      return pageLayout;
    }
    const secFont = activeInlineEdit.fontFamily || 'Helvetica';
    const secSize = activeInlineEdit.fontSize || 14;
    const secLHeight = activeInlineEdit.lineHeight || 1.25;
    const secSpacing = Math.round(secSize * secLHeight);
    const boxW = activeInlineEdit.availableWidth || activeInlineEdit.ptWidth || 200;
    const currentTyped = activeInlineEdit.replacementText ?? activeInlineEdit.currentVal ?? '';
    const previewLines = wrapTextLines(
      currentTyped,
      secFont,
      secSize,
      boxW,
      activeInlineEdit.bold,
      activeInlineEdit.italic
    );
    const lineCount = Math.max(1, previewLines.length);
    const neededH = Math.round(lineCount * secSpacing);

    const virtualRepl = {
      sectionId: activeInlineEdit.sectionId,
      renderedTextHeight: neededH,
      coverPtHeight: neededH,
    };

    const otherRepls = pageReplacements.filter((r) => r.sectionId !== activeInlineEdit.sectionId);
    return computePageReflowLayout(sections, [...otherRepls, virtualRepl], pagePtWidth, pagePtHeight);
  }, [pageLayout, activeInlineEdit, sections, pageReplacements, pagePtWidth, pagePtHeight]);

  // Collect all target word IDs that have been replaced or reflowed, to hide their background tokens
  const replacedTargetIds = new Set();
  pageReplacements.forEach((r) => {
    if (r.targetId) replacedTargetIds.add(r.targetId);
    if (r.id) replacedTargetIds.add(r.id);
    if (r.sectionId) replacedTargetIds.add(r.sectionId);
    if (Array.isArray(r.replacedWordIds)) {
      r.replacedWordIds.forEach((wId) => replacedTargetIds.add(wId));
    }
    if (Array.isArray(r.words)) {
      r.words.forEach((w) => replacedTargetIds.add(w.id || w));
    }
    if (r.reflowLine && Array.isArray(r.reflowLine.reflowWords)) {
      r.reflowLine.reflowWords.forEach((rw) => replacedTargetIds.add(rw.id));
    }
    if (r.type === 'section_reflow') {
      const sec = sections.find((s) => s.id === r.sectionId);
      if (sec && Array.isArray(sec.words)) {
        const wordsToHide = sec.hasBullet && Array.isArray(sec.contentWords) ? sec.contentWords : sec.words;
        wordsToHide.forEach((w) => replacedTargetIds.add(w.id));
      }
    }
  });

  // Also hide tokens of any section that has been shifted or is actively being edited
  (liveLayout || []).forEach((sec) => {
    if (Math.abs(sec.shiftAmount || 0) > 0.5 || sec.isEdited) {
      if (Array.isArray(sec.words)) {
        sec.words.forEach((w) => replacedTargetIds.add(w.id));
      }
    }
  });

  // 1. Extract text items, word tokens & group into visual lines from PDF.js
  useEffect(() => {
    if (!pdfDocProxy) return;
    let isCancelled = false;

    const extractPageText = async () => {
      try {
        setIsLoadingText(true);
        setActiveInlineEdit(null);

        const page = await pdfDocProxy.getPage(currentPage);
        if (isCancelled) return;

        // Ensure page operator list is loaded so commonObjs has the fonts
        try {
          await page.getOperatorList();
        } catch (_) {}
        if (isCancelled) return;

        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const textContent = await page.getTextContent();
        if (isCancelled) return;

        const rawItems = textContent.items || [];
        const styles = textContent.styles || {};

        if (rawItems.length === 0) {
          setHasTextContent(false);
          setTextItems([]);
          setLines([]);
          setIsLoadingText(false);
          return;
        }

        const parsedItems = [];
        const rawChunks = [];
        let itemIndex = 0;

        for (const item of rawItems) {
          const currentItemIdx = itemIndex++;
          if (!item.str) continue;

          const itemW = Number(item.width) || 0;
          const itemH = Number(item.height) || Math.hypot(item.transform[0], item.transform[1]) || 12;

          // Exact baseline in PDF coordinates (from transformation matrix)
          const pdfBaselineX = item.transform[4];
          const pdfBaselineY = item.transform[5];

          // Exact baseline in viewport points
          const [baselinePtX, baselinePtY] = unscaledViewport.convertToViewportPoint(pdfBaselineX, pdfBaselineY);

          // Detect font styling with extended font family, weight, and embedded font dictionary support
          const styleObj = styles[item.fontName] || {};
          let fontObj = null;
          try {
            if (page.commonObjs && typeof page.commonObjs.has === 'function' && page.commonObjs.has(item.fontName)) {
              fontObj = page.commonObjs.get(item.fontName);
            }
          } catch (_) {}

          const fontObjName = (fontObj?.name || fontObj?.loadedName || '').toLowerCase();
          const rawFam = (styleObj.fontFamily || fontObj?.fallbackName || '').toLowerCase();
          const rawName = (item.fontName || '').toLowerCase();
          const combinedFontName = `${rawName} ${rawFam} ${fontObjName}`;

          let fontFamily = 'Helvetica';
          if (
            combinedFontName.includes('times') ||
            combinedFontName.includes('serif') ||
            combinedFontName.includes('roman') ||
            combinedFontName.includes('georgia') ||
            combinedFontName.includes('cambria') ||
            combinedFontName.includes('garamond') ||
            combinedFontName.includes('minion') ||
            combinedFontName.includes('baskerville')
          ) {
            fontFamily = 'Times Roman';
          } else if (
            combinedFontName.includes('courier') ||
            combinedFontName.includes('mono') ||
            combinedFontName.includes('consolas') ||
            combinedFontName.includes('menlo') ||
            combinedFontName.includes('sourcecode')
          ) {
            fontFamily = 'Courier';
          }

          const bold =
            !!fontObj?.bold ||
            !!fontObj?.black ||
            combinedFontName.includes('bold') ||
            combinedFontName.includes('black') ||
            combinedFontName.includes('heavy') ||
            combinedFontName.includes('semibold') ||
            combinedFontName.includes('demi') ||
            combinedFontName.includes('medium') ||
            /-b\b/i.test(combinedFontName) ||
            /_b\b/i.test(combinedFontName) ||
            combinedFontName.includes('w7') ||
            combinedFontName.includes('w8') ||
            combinedFontName.includes('w9');

          const italic =
            !!fontObj?.italic ||
            combinedFontName.includes('italic') ||
            combinedFontName.includes('oblique') ||
            combinedFontName.includes('slanted') ||
            /-i\b/i.test(combinedFontName) ||
            /_i\b/i.test(combinedFontName);

          const fontSize = Math.max(8, Math.min(144, Math.round(itemH)));

          const fontAscentRatio = typeof fontObj?.ascent === 'number' && fontObj.ascent > 0
            ? fontObj.ascent
            : (typeof styleObj.ascent === 'number' && styleObj.ascent > 0 ? styleObj.ascent : getFontAscentRatio(fontFamily));
          const fontDescentRatio = typeof fontObj?.descent === 'number' && fontObj.descent < 0
            ? Math.abs(fontObj.descent)
            : (typeof styleObj.descent === 'number' && styleObj.descent < 0 ? Math.abs(styleObj.descent) : getFontDescentRatio(fontFamily));

          const ascent = Math.ceil(fontSize * fontAscentRatio);
          const descent = Math.ceil(fontSize * fontDescentRatio);
          const ptY = Math.round(baselinePtY - ascent);
          const ptHeight = ascent + descent;

          // Parse contiguous non-whitespace character runs within this text item
          const regex = /\S+/g;
          let m;
          const matches = [];
          while ((m = regex.exec(item.str)) !== null) {
            matches.push({
              chunkStr: m[0],
              startCharIdx: m.index,
              endCharIdx: m.index + m[0].length,
            });
          }

          // Calibrate against PDF.js exact rendered item.width to guarantee 100% of characters are covered
          const isSingleTokenItem = matches.length === 1 && matches[0].chunkStr === item.str.trim();
          const totalMeasured = measureTextWidth(item.str, fontFamily, fontSize, bold, italic) || 1;
          const scaleFactor = itemW > 0 && totalMeasured > 0 ? itemW / totalMeasured : 1.0;

          for (const match of matches) {
            const { chunkStr, startCharIdx, endCharIdx } = match;
            const prefixStr = item.str.slice(0, startCharIdx);

            let prefixW;
            let chunkW;
            if (isSingleTokenItem) {
              prefixW = startCharIdx > 0 ? (prefixStr ? measureTextWidth(prefixStr, fontFamily, fontSize, bold, italic) * scaleFactor : 0) : 0;
              chunkW = Math.max(itemW, measureTextWidth(chunkStr, fontFamily, fontSize, bold, italic));
            } else {
              prefixW = (prefixStr ? measureTextWidth(prefixStr, fontFamily, fontSize, bold, italic) : 0) * scaleFactor;
              chunkW = Math.max(
                measureTextWidth(chunkStr, fontFamily, fontSize, bold, italic) * scaleFactor,
                itemW * (chunkStr.length / Math.max(1, item.str.length))
              );
            }

            const hasLeadingSpace = startCharIdx > 0 && /\s/.test(item.str[startCharIdx - 1]);
            const hasTrailingSpace = endCharIdx < item.str.length && /\s/.test(item.str[endCharIdx]);

            rawChunks.push({
              itemIndex: currentItemIdx,
              str: chunkStr,
              hasLeadingSpace,
              hasTrailingSpace,
              ptX: Math.round(baselinePtX + prefixW),
              ptWidth: Math.max(8, Math.round(chunkW)),
              ptY,
              ptHeight,
              baselinePtY,
              pdfBaselineX: pdfBaselineX + prefixW,
              pdfBaselineY,
              fontSize,
              fontFamily,
              bold,
              italic,
              page: currentPage,
            });
          }

          parsedItems.push({
            id: `span_p${currentPage}_i${currentItemIdx}`,
            str: item.str,
            ptX: Math.round(baselinePtX),
            ptY,
            ptWidth: Math.max(12, Math.round(itemW)),
            ptHeight,
            fontSize,
            fontFamily,
            bold,
            italic,
          });
        }

        // Sort chunks by baseline Y, then horizontally left to right
        rawChunks.sort((a, b) => {
          const diffY = a.baselinePtY - b.baselinePtY;
          if (Math.abs(diffY) > 3) return diffY;
          return a.ptX - b.ptX;
        });

        // Assemble words by merging contiguous fragments that belong to the same word
        // (Solves KOWSALY + A, Experi + ence, Tech + nologies, and kerning splits across spans)
        const allWords = [];
        let curWord = null;
        let wordCounter = 0;

        for (let i = 0; i < rawChunks.length; i++) {
          const chunk = rawChunks[i];

          if (!curWord) {
            curWord = {
              id: `word_p${currentPage}_w${wordCounter++}`,
              text: chunk.str,
              ptX: chunk.ptX,
              ptY: chunk.ptY,
              ptWidth: chunk.ptWidth,
              ptHeight: chunk.ptHeight,
              baselinePtY: chunk.baselinePtY,
              pdfBaselineX: chunk.pdfBaselineX,
              pdfBaselineY: chunk.pdfBaselineY,
              fontSize: chunk.fontSize,
              fontFamily: chunk.fontFamily,
              bold: chunk.bold,
              italic: chunk.italic,
              page: chunk.page,
              hasTrailingSpace: chunk.hasTrailingSpace,
            };
          } else {
            const isSameLine = Math.abs(curWord.baselinePtY - chunk.baselinePtY) <= 3;
            const gap = chunk.ptX - (curWord.ptX + curWord.ptWidth);
            const maxKerningGap = Math.min(0.8, Math.min(curWord.fontSize, chunk.fontSize) * 0.06);
            const isCamelCaseWordSplit = /[a-z]$/.test(curWord.text) && /^[A-Z]/.test(chunk.str);
            const isSymbolWord = isBulletWord(curWord.text) || isBulletWord(chunk.str);
            const shouldMerge = isSameLine && !curWord.hasTrailingSpace && !chunk.hasLeadingSpace && gap <= maxKerningGap && !isCamelCaseWordSplit && !isSymbolWord;

            if (shouldMerge) {
              // Merge fragment into the current word
              curWord.text += chunk.str;
              curWord.ptWidth = Math.max(
                curWord.ptWidth,
                Math.round((chunk.ptX + chunk.ptWidth - curWord.ptX) * 100) / 100,
                measureTextWidth(curWord.text, curWord.fontFamily, curWord.fontSize, curWord.bold, curWord.italic)
              );
              curWord.ptHeight = Math.max(curWord.ptHeight, chunk.ptHeight);
              curWord.hasTrailingSpace = chunk.hasTrailingSpace;
            } else {
              allWords.push(curWord);
              curWord = {
                id: `word_p${currentPage}_w${wordCounter++}`,
                text: chunk.str,
                ptX: chunk.ptX,
                ptY: chunk.ptY,
                ptWidth: Math.max(
                  chunk.ptWidth,
                  measureTextWidth(chunk.str, chunk.fontFamily, chunk.fontSize, chunk.bold, chunk.italic)
                ),
                ptHeight: chunk.ptHeight,
                baselinePtY: chunk.baselinePtY,
                pdfBaselineX: chunk.pdfBaselineX,
                pdfBaselineY: chunk.pdfBaselineY,
                fontSize: chunk.fontSize,
                fontFamily: chunk.fontFamily,
                bold: chunk.bold,
                italic: chunk.italic,
                page: chunk.page,
                hasTrailingSpace: chunk.hasTrailingSpace,
              };
            }
          }
        }
        if (curWord) {
          allWords.push(curWord);
        }

        // Guarantee all words include 100% of characters to the final glyph boundary
        for (const w of allWords) {
          const mWidth = measureTextWidth(w.text, w.fontFamily, w.fontSize, w.bold, w.italic);
          if (mWidth > w.ptWidth) {
            w.ptWidth = Math.round(mWidth * 100) / 100;
          }
        }

        // Group words into coherent horizontal lines and sections (Word, Line, Heading, Subtitle, Paragraph)
        const groupedLines = groupWordsIntoLines(allWords);
        const groupedSections = groupLinesIntoSections(groupedLines, pagePtWidth, pagePtHeight);

        setHasTextContent(parsedItems.length > 0);
        setTextItems(parsedItems);
        setLines(groupedLines);
        setSections(groupedSections);
      } catch (err) {
        if (!isCancelled) {
          console.warn('[EditorTextLayer Extract Warning]:', err);
          setHasTextContent(false);
          setTextItems([]);
          setLines([]);
          setSections([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingText(false);
        }
      }
    };

    extractPageText();

    return () => {
      isCancelled = true;
    };
  }, [pdfDocProxy, currentPage]);

  // Autofocus inline editor ONCE whenever a new active inline session begins
  useEffect(() => {
    if (activeEditId) {
      initialSelectionDoneRef.current = false;
      const frame = requestAnimationFrame(() => {
        if (inlineInputRef.current && !initialSelectionDoneRef.current) {
          initialSelectionDoneRef.current = true;
          inlineInputRef.current.focus();
          inlineInputRef.current.select();
          inlineInputRef.current.style.height = 'auto';
          inlineInputRef.current.style.height = `${inlineInputRef.current.scrollHeight}px`;
        }
      });
      return () => cancelAnimationFrame(frame);
    } else {
      initialSelectionDoneRef.current = false;
    }
  }, [activeEditId]);

  // 2. Direct Word Click Handler (Unedited Words)
  const handleWordClick = (e, word) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (activeTool !== 'edit-text' && activeTool !== 'select') return;

    // Check if this word belongs to a line that already has reflow replacements
    const line = lines.find((l) => l.id === word.lineId || l.words.some((w) => w.id === word.id));
    const existingLineRepl = pageReplacements.find(
      (r) => (r.lineId && line && r.lineId === line.id) ||
             (r.reflowLine && line && r.reflowLine.lineId === line.id)
    );

    if (existingLineRepl && existingLineRepl.reflowLine) {
      const rw = existingLineRepl.reflowLine.reflowWords.find((w) => w.id === word.id);
      if (rw) {
        handleReflowWordClick(e, rw, existingLineRepl);
        return;
      }
    }

    // Check single-word replacement
    const existingRepl = pageReplacements.find((r) => r.targetId === word.id || r.id === word.id);
    if (existingRepl) {
      handleReplacementClick(e, existingRepl);
      return;
    }

    const fontSize = word.fontSize || (line ? line.fontSize : 14);
    const bleedX = 0.5;
    const bleedY = 0.5;
    const maxWidth = Math.max(60, pagePtWidth - word.ptX - 24);

    // Identify adjacent words in the same line segment to prevent neighbor collisions
    let prevWord = null;
    let nextWord = null;
    if (line && Array.isArray(line.words)) {
      const wIdx = line.words.findIndex((w) => w.id === word.id);
      if (wIdx > 0) prevWord = line.words[wIdx - 1];
      if (wIdx >= 0 && wIdx < line.words.length - 1) nextWord = line.words[wIdx + 1];
    }

    // Available width is bounded by next neighboring word so longer text does not overlap
    const availableWidth = nextWord
      ? Math.max(10, nextWord.ptX - word.ptX - 2)
      : Math.min(maxWidth, Math.max(word.ptWidth + 20, 50));

    // Identify adjacent lines above and below to prevent vertical overlap
    const wordBaseY = word.baselinePtY !== undefined ? word.baselinePtY : (word.ptY + fontSize * getFontAscentRatio(word.fontFamily));
    let lineAbove = null;
    let lineBelow = null;
    let minAboveDist = Infinity;
    let minBelowDist = Infinity;

    for (const l of lines) {
      if (line && l.id === line.id) continue;
      const lBaseY = l.baselinePtY !== undefined ? l.baselinePtY : (l.ptY + (l.fontSize || 12) * getFontAscentRatio(l.fontFamily));
      const dist = lBaseY - wordBaseY;
      if (dist < 0 && Math.abs(dist) < minAboveDist) {
        minAboveDist = Math.abs(dist);
        lineAbove = l;
      } else if (dist > 0 && dist < minBelowDist) {
        minBelowDist = dist;
        lineBelow = l;
      }
    }

    const isWordEdited = existingLineRepl?.wordEdits && existingLineRepl.wordEdits[word.id] !== undefined && existingLineRepl.wordEdits[word.id] !== word.text;
    const hasWordHistory = existingLineRepl?.wordHistories && existingLineRepl.wordHistories[word.id] && existingLineRepl.wordHistories[word.id].length > 0;
    const isExisting = isWordEdited || hasWordHistory;

    const sampledColor = sampleTextColor ? sampleTextColor(word.ptX, word.ptY, word.ptWidth, word.ptHeight) : null;
    const wordColor = sampledColor || word.color || (line ? line.color : '#111827');

    const editObj = {
      id: existingLineRepl ? existingLineRepl.id : `repl_word_${word.id}`,
      lineReplId: existingLineRepl ? existingLineRepl.id : `repl_line_${line ? line.id : word.id}`,
      targetId: word.id,
      lineId: line ? line.id : null,
      line: line || null,
      selectionLevel: 'word',
      type: 'word_replacement',
      word: word.text,
      originalText: word.text,
      replacementText: (existingLineRepl?.wordEdits && existingLineRepl.wordEdits[word.id]) || word.text,
      currentVal: (existingLineRepl?.wordEdits && existingLineRepl.wordEdits[word.id]) || word.text,
      ptX: word.ptX,
      ptY: word.ptY !== undefined ? word.ptY : (line ? line.ptY : 0),
      ptWidth: word.ptWidth,
      ptHeight: word.ptHeight,
      baselinePtY: word.baselinePtY !== undefined ? word.baselinePtY : line?.baselinePtY,
      pdfBaselineX: word.pdfBaselineX !== undefined ? word.pdfBaselineX : line?.pdfBaselineX,
      pdfBaselineY: word.pdfBaselineY !== undefined ? word.pdfBaselineY : line?.pdfBaselineY,
      maxWidth,
      availableWidth,
      bleedX,
      bleedY,
      fontSize,
      fontFamily: word.fontFamily || (line ? line.fontFamily : 'Helvetica'),
      bold: !!word.bold,
      italic: !!word.italic,
      underline: false,
      color: wordColor,
      align: 'left',
      lineHeight: 1.25,
      letterSpacing: 0,
      opacity: 1.0,
      backgroundColor: '#FFFFFF',
      capitalization: 'preserve',
      isArea: false,
      isExistingReplacement: isExisting,
      existingWordEdits: existingLineRepl?.wordEdits || {},
      existingWordStyles: existingLineRepl?.wordStyles || {},
      wordHistories: existingLineRepl?.wordHistories || {},
      prevWord,
      nextWord,
      lineAbove,
      lineBelow,
    };

    setActiveInlineEdit(editObj);
    if (typeof onSetActiveTextEdit === 'function') {
      onSetActiveTextEdit(editObj);
    }
  };

  // 3. Click handler for already reflowed words inside a line replacement block
  const handleReflowWordClick = (e, rw, repl) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (activeTool !== 'edit-text' && activeTool !== 'select') return;

    const line = lines.find((l) => l.id === repl.lineId);
    const fontSize = rw.fontSize || repl.fontSize || 14;
    const bleedX = Math.max(2, Math.min(3, Math.round(fontSize * 0.16)));
    const bleedY = Math.max(2, Math.min(3, Math.round(fontSize * 0.20)));
    const maxWidth = Math.max(60, pagePtWidth - rw.reflowPtX - 24);
    const availableWidth = Math.min(maxWidth, Math.max(rw.ptWidth + 20, 50));

    const isWordEdited = repl.wordEdits && repl.wordEdits[rw.id] !== undefined && repl.wordEdits[rw.id] !== rw.originalText;
    const hasWordHistory = repl.wordHistories && repl.wordHistories[rw.id] && repl.wordHistories[rw.id].length > 0;
    const isExisting = isWordEdited || hasWordHistory;

    const sampledColor = sampleTextColor
      ? sampleTextColor(rw.reflowPtX, repl.reflowLine ? repl.reflowLine.ptY : repl.ptY, rw.ptWidth, rw.ptHeight)
      : null;
    const wordColor = rw.color || repl.color || sampledColor || '#111827';

    const editObj = {
      id: repl.id,
      lineReplId: repl.id,
      targetId: rw.id,
      lineId: repl.lineId,
      line: line || null,
      selectionLevel: 'word',
      type: 'line_reflow',
      word: rw.text,
      originalText: rw.originalText || rw.text,
      replacementText: rw.text,
      currentVal: rw.text,
      ptX: rw.reflowPtX,
      ptY: rw.ptY !== undefined ? rw.ptY : (repl.reflowLine ? repl.reflowLine.ptY : repl.ptY),
      ptWidth: rw.ptWidth,
      ptHeight: rw.ptHeight,
      baselinePtY: rw.baselinePtY !== undefined ? rw.baselinePtY : repl.baselinePtY,
      pdfBaselineX: rw.pdfBaselineX !== undefined ? rw.pdfBaselineX : repl.pdfBaselineX,
      pdfBaselineY: rw.pdfBaselineY !== undefined ? rw.pdfBaselineY : repl.pdfBaselineY,
      maxWidth,
      availableWidth,
      bleedX,
      bleedY,
      fontSize,
      fontFamily: rw.fontFamily || repl.fontFamily || 'Helvetica',
      bold: !!rw.bold,
      italic: !!rw.italic,
      underline: rw.underline !== undefined ? !!rw.underline : !!repl.underline,
      color: wordColor,
      align: repl.align || 'left',
      lineHeight: repl.lineHeight || 1.25,
      letterSpacing: repl.letterSpacing || 0,
      opacity: repl.opacity ?? 1.0,
      backgroundColor: repl.backgroundColor || repl.coverColor || '#FFFFFF',
      capitalization: repl.capitalization || 'preserve',
      isArea: false,
      isExistingReplacement: isExisting,
      existingWordEdits: repl.wordEdits || {},
      existingWordStyles: repl.wordStyles || {},
      wordHistories: repl.wordHistories || {},
    };

    setActiveInlineEdit(editObj);
    if (typeof onSetActiveTextEdit === 'function') {
      onSetActiveTextEdit(editObj);
    }
  };

  // 4. Click handler for standalone/area replacements
  const handleReplacementClick = (e, repl) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (activeTool !== 'edit-text' && activeTool !== 'select') return;

    const fontSize = repl.fontSize || 14;
    const bleedX = Math.max(2, Math.round(fontSize * 0.16));
    const bleedY = Math.max(2, Math.round(fontSize * 0.20));
    const ptX = repl.origPtX ?? repl.ptX;
    const maxWidth = Math.max(120, pagePtWidth - ptX - 36);

    const editObj = {
      id: repl.id,
      lineReplId: repl.id,
      targetId: repl.targetId || repl.id,
      word: repl.replacementText,
      originalText: repl.originalText,
      replacementText: repl.replacementText,
      currentVal: repl.replacementText,
      ptX,
      ptY: repl.origPtY ?? repl.ptY,
      ptWidth: repl.origPtWidth ?? repl.ptWidth,
      ptHeight: repl.origPtHeight ?? repl.ptHeight,
      maxWidth,
      availableWidth: maxWidth,
      bleedX,
      bleedY,
      fontSize: repl.fontSize || 14,
      fontFamily: repl.fontFamily || 'Helvetica',
      bold: !!repl.bold,
      italic: !!repl.italic,
      underline: !!repl.underline,
      color: repl.color || '#111827',
      align: repl.align || 'left',
      lineHeight: repl.lineHeight || 1.25,
      letterSpacing: repl.letterSpacing || 0,
      opacity: repl.opacity ?? 1.0,
      backgroundColor: repl.backgroundColor || repl.coverColor || '#FFFFFF',
      capitalization: repl.capitalization || 'preserve',
      isArea: !!repl.isArea,
      isExistingReplacement: true,
      existingWordEdits: repl.wordEdits || {},
    };

    setActiveInlineEdit(editObj);
    if (typeof onSetActiveTextEdit === 'function') {
      onSetActiveTextEdit(editObj);
    }
  };

  // Section / Line Selection and Click Handlers
  const handleTokenMouseEnter = (w) => {
    if (activeInlineEdit) return;
    if (selectionLevel === 'word') {
      setHoveredTarget({
        type: 'word',
        id: w.id,
        ptX: w.ptX,
        ptY: w.ptY,
        ptWidth: w.ptWidth,
        ptHeight: w.ptHeight,
      });
    } else if (selectionLevel === 'line') {
      const line = lines.find((l) => l.id === w.lineId || l.words.some((word) => word.id === w.id));
      if (line) {
        setHoveredTarget({
          type: 'line',
          id: line.id,
          ptX: line.minPtX,
          ptY: line.ptY,
          ptWidth: line.maxPtX - line.minPtX,
          ptHeight: line.ptHeight,
        });
      }
    } else if (selectionLevel === 'bullet') {
      const sec =
        sections.find(
          (s) => (s.id === w.sectionId || s.words.some((word) => word.id === w.id)) && s.type === 'bullet'
        ) || sections.find((s) => s.id === w.sectionId || s.words.some((word) => word.id === w.id));
      if (sec) {
        setHoveredTarget({
          type: 'bullet',
          id: sec.id,
          ptX: sec.ptX,
          ptY: sec.ptY,
          ptWidth: sec.ptWidth,
          ptHeight: sec.ptHeight,
        });
      }
    } else if (selectionLevel === 'heading') {
      const sec =
        sections.find(
          (s) => (s.id === w.sectionId || s.words.some((word) => word.id === w.id)) && s.type === 'heading'
        ) || sections.find((s) => s.id === w.sectionId || s.words.some((word) => word.id === w.id));
      if (sec) {
        setHoveredTarget({
          type: 'heading',
          id: sec.id,
          ptX: sec.ptX,
          ptY: sec.ptY,
          ptWidth: sec.ptWidth,
          ptHeight: sec.ptHeight,
        });
      }
    } else if (selectionLevel === 'subtitle') {
      const sec =
        sections.find(
          (s) => (s.id === w.sectionId || s.words.some((word) => word.id === w.id)) && s.type === 'subtitle'
        ) || sections.find((s) => s.id === w.sectionId || s.words.some((word) => word.id === w.id));
      if (sec) {
        setHoveredTarget({
          type: 'subtitle',
          id: sec.id,
          ptX: sec.ptX,
          ptY: sec.ptY,
          ptWidth: sec.ptWidth,
          ptHeight: sec.ptHeight,
        });
      }
    } else {
      // paragraph
      const sec = sections.find((s) => s.id === w.sectionId || s.words.some((word) => word.id === w.id));
      if (sec) {
        setHoveredTarget({
          type: sec.type || 'paragraph',
          id: sec.id,
          ptX: sec.ptX,
          ptY: sec.ptY,
          ptWidth: sec.ptWidth,
          ptHeight: sec.ptHeight,
        });
      } else {
        const line = lines.find((l) => l.id === w.lineId || l.words.some((word) => word.id === w.id));
        if (line) {
          setHoveredTarget({
            type: 'line',
            id: line.id,
            ptX: line.minPtX,
            ptY: line.ptY,
            ptWidth: line.maxPtX - line.minPtX,
            ptHeight: line.ptHeight,
          });
        }
      }
    }
  };

  const handleTokenMouseLeave = () => {
    setHoveredTarget(null);
  };

  const handleSelectLineForEdit = (line) => {
    if (!line) return;
    const existingRepl = pageReplacements.find(
      (r) => r.lineId === line.id || (r.reflowLine && r.reflowLine.lineId === line.id)
    );

    const hasBullet = line.hasBullet && line.bulletWord;
    const editableWords = hasBullet && line.contentWords ? line.contentWords : line.words;
    const editableText = hasBullet
      ? editableWords.map((w) => w.text).join(' ')
      : line.fullOriginalText;
    const editPtX = hasBullet && line.textStartX !== undefined ? line.textStartX : line.minPtX;
    const editPtWidth = hasBullet && line.textStartX !== undefined
      ? Math.max(20, line.maxPtX - line.textStartX)
      : (line.maxPtX - line.minPtX);

    const maxWidth = Math.max(60, pagePtWidth - editPtX - 24);
    const availableWidth = maxWidth;

    const sampledColor = sampleTextColor
      ? sampleTextColor(editPtX, line.ptY, Math.min(editPtWidth, 100), line.ptHeight)
      : null;
    const lineColor = existingRepl?.color || sampledColor || line.color || '#111827';

    const secObj = {
      id: line.id,
      type: 'line',
      page: currentPage,
      lines: [line],
      words: editableWords,
      contentWords: editableWords,
      replacedWordIds: editableWords ? editableWords.map((w) => w.id) : [],
      ptX: editPtX,
      ptY: line.ptY,
      ptWidth: editPtWidth,
      ptHeight: line.ptHeight,
      baselinePtY: line.baselinePtY,
      pdfBaselineX: line.pdfBaselineX,
      pdfBaselineY: line.pdfBaselineY,
      fontSize: line.fontSize || 14,
      fontFamily: line.fontFamily || 'Helvetica',
      bold: !!line.bold,
      italic: !!line.italic,
      color: lineColor,
      lineHeight: 1.25,
      fullOriginalText: editableText,
      availableWidth,
      hasBullet,
      bulletWord: line.bulletWord,
      textStartX: line.textStartX,
      bulletGap: line.bulletGap,
    };

    const editObj = {
      id: existingRepl ? existingRepl.id : `repl_line_${line.id}`,
      lineId: line.id,
      sectionId: line.id,
      section: secObj,
      words: editableWords,
      contentWords: editableWords,
      replacedWordIds: editableWords ? editableWords.map((w) => w.id) : [],
      type: 'section_reflow',
      selectionLevel: 'line',
      page: currentPage,
      targetId: line.id,
      originalText: existingRepl ? existingRepl.originalText : editableText,
      replacementText: existingRepl ? existingRepl.replacementText : editableText,
      currentVal: existingRepl ? existingRepl.replacementText : editableText,
      ptX: editPtX,
      ptY: line.ptY,
      ptWidth: editPtWidth,
      ptHeight: line.ptHeight,
      baselinePtY: line.baselinePtY,
      pdfBaselineX: line.pdfBaselineX,
      pdfBaselineY: line.pdfBaselineY,
      availableWidth,
      maxWidth,
      fontSize: existingRepl?.fontSize || line.fontSize || 14,
      fontFamily: existingRepl?.fontFamily || line.fontFamily || 'Helvetica',
      bold: existingRepl?.bold !== undefined ? existingRepl.bold : !!line.bold,
      italic: existingRepl?.italic !== undefined ? existingRepl.italic : !!line.italic,
      underline: !!existingRepl?.underline,
      color: lineColor,
      align: existingRepl?.align || 'left',
      lineHeight: existingRepl?.lineHeight || 1.25,
      letterSpacing: existingRepl?.letterSpacing || 0,
      opacity: existingRepl?.opacity ?? 1.0,
      backgroundColor: existingRepl?.backgroundColor || '#FFFFFF',
      capitalization: existingRepl?.capitalization || 'preserve',
      isArea: false,
      isExistingReplacement: !!existingRepl,
      hasBullet,
      bulletWord: line.bulletWord,
      textStartX: line.textStartX,
      bulletGap: line.bulletGap,
    };

    setActiveInlineEdit(editObj);
    if (typeof onSetActiveTextEdit === 'function') {
      onSetActiveTextEdit(editObj);
    }
  };

  const handleSelectSectionForEdit = (sec, level = 'paragraph') => {
    if (!sec) return;
    const existingRepl = pageReplacements.find(
      (r) => r.sectionId === sec.id || r.targetId === sec.id || (r.id && r.id.includes(sec.id))
    );

    const layoutSec = (liveLayout || []).find((s) => s.id === sec.id) || sec;
    const curPtX = layoutSec.ptX !== undefined ? layoutSec.ptX : sec.ptX;
    const curPtY = layoutSec.ptY !== undefined ? layoutSec.ptY : sec.ptY;
    const curPtWidth = layoutSec.ptWidth !== undefined ? layoutSec.ptWidth : sec.ptWidth;
    const curPtHeight = layoutSec.ptHeight !== undefined ? layoutSec.ptHeight : sec.ptHeight;

    const hasBullet = sec.hasBullet && sec.bulletWord;
    const editableWords = hasBullet && sec.contentWords ? sec.contentWords : sec.words;
    const editableText = hasBullet && sec.textOnlyOriginal ? sec.textOnlyOriginal : sec.fullOriginalText;
    const editPtX = hasBullet && sec.textStartX !== undefined ? sec.textStartX : curPtX;
    const editPtWidth = hasBullet && sec.textStartX !== undefined
      ? Math.max(20, curPtWidth - (sec.textStartX - curPtX))
      : curPtWidth;

    const maxWidth = Math.max(60, pagePtWidth - editPtX - 24);
    // Respect the box's available width so text automatically wraps when reaching the box boundary
    const availableWidth = Math.min(maxWidth, Math.max(30, editPtWidth));

    const sampledColor = sampleTextColor
      ? sampleTextColor(editPtX, curPtY, Math.min(editPtWidth, 100), curPtHeight)
      : null;
    const secColor = existingRepl?.color || sampledColor || sec.color || '#111827';

    const editObj = {
      id: existingRepl ? existingRepl.id : `sec_repl_${sec.id}`,
      sectionId: sec.id,
      section: sec,
      words: editableWords,
      contentWords: editableWords,
      replacedWordIds: editableWords ? editableWords.map((w) => w.id) : [],
      type: 'section_reflow',
      selectionLevel: level,
      page: currentPage,
      targetId: sec.id,
      originalText: existingRepl ? existingRepl.originalText : editableText,
      replacementText: existingRepl ? existingRepl.replacementText : editableText,
      currentVal: existingRepl ? existingRepl.replacementText : editableText,
      ptX: editPtX,
      ptY: curPtY,
      ptWidth: editPtWidth,
      ptHeight: curPtHeight,
      originalPtHeight: layoutSec.originalPtHeight !== undefined ? layoutSec.originalPtHeight : sec.ptHeight,
      baselinePtY: layoutSec.baselinePtY !== undefined ? layoutSec.baselinePtY : (sec.baselinePtY !== undefined ? sec.baselinePtY + (layoutSec.shiftAmount || 0) : undefined),
      pdfBaselineX: sec.pdfBaselineX,
      pdfBaselineY: layoutSec.pdfBaselineY !== undefined ? layoutSec.pdfBaselineY : (sec.pdfBaselineY !== undefined ? sec.pdfBaselineY - (layoutSec.shiftAmount || 0) : undefined),
      availableWidth,
      maxWidth,
      fontSize: existingRepl?.fontSize || sec.fontSize || 14,
      fontFamily: existingRepl?.fontFamily || sec.fontFamily || 'Helvetica',
      bold: existingRepl?.bold !== undefined ? existingRepl.bold : !!sec.bold,
      italic: existingRepl?.italic !== undefined ? existingRepl.italic : !!sec.italic,
      underline: !!existingRepl?.underline,
      color: secColor,
      align: existingRepl?.align || 'left',
      lineHeight: existingRepl?.lineHeight || sec.lineHeight || 1.25,
      letterSpacing: existingRepl?.letterSpacing || 0,
      opacity: existingRepl?.opacity ?? 1.0,
      backgroundColor: existingRepl?.backgroundColor || '#FFFFFF',
      capitalization: existingRepl?.capitalization || 'preserve',
      isArea: false,
      isExistingReplacement: !!existingRepl,
      hasBullet,
      bulletWord: sec.bulletWord,
      textStartX: sec.textStartX,
      bulletGap: sec.bulletGap,
    };

    setActiveInlineEdit(editObj);
    if (typeof onSetActiveTextEdit === 'function') {
      onSetActiveTextEdit(editObj);
    }
  };

  const handleSectionReflowClick = (e, repl) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (activeTool !== 'edit-text' && activeTool !== 'select') return;

    const sec = sections.find((s) => s.id === repl.sectionId);
    const maxWidth = Math.max(60, pagePtWidth - (repl.coverPtX ?? repl.ptX) - 24);

    const editObj = {
      ...repl,
      section: sec || repl.section,
      replacementText: repl.replacementText,
      currentVal: repl.replacementText,
      maxWidth,
      isExistingReplacement: true,
    };

    setActiveInlineEdit(editObj);
    if (typeof onSetActiveTextEdit === 'function') {
      onSetActiveTextEdit(editObj);
    }
  };

  const handleSelectSection = useCallback((sec) => {
    if (!sec) return;
    setSelectedSectionId(sec.id);

    const layoutSec = (liveLayout || []).find((s) => s.id === sec.id) || sec;
    const effPtX = layoutSec.ptX !== undefined ? layoutSec.ptX : sec.ptX;
    const effPtY = layoutSec.ptY !== undefined ? layoutSec.ptY : sec.ptY;
    const effPtWidth = layoutSec.ptWidth !== undefined ? layoutSec.ptWidth : sec.ptWidth;
    const effPtHeight = layoutSec.ptHeight !== undefined ? layoutSec.ptHeight : sec.ptHeight;

    const existingRepl = pageReplacements.find(
      (r) => r.sectionId === sec.id || r.targetId === sec.id || (r.id && r.id.includes(sec.id))
    );

    const sampledColor = sampleTextColor
      ? sampleTextColor(effPtX, effPtY, Math.min(effPtWidth, 100), effPtHeight)
      : null;
    const secColor = existingRepl?.color || sampledColor || sec.color || '#111827';

    const propsObj = {
      id: existingRepl ? existingRepl.id : `sec_repl_${sec.id}`,
      sectionId: sec.id,
      targetId: sec.id,
      type: 'section_reflow',
      selectionLevel: sec.type || 'paragraph',
      page: currentPage,
      fontSize: existingRepl?.fontSize || sec.fontSize || 14,
      fontFamily: existingRepl?.fontFamily || sec.fontFamily || 'Helvetica',
      bold: existingRepl?.bold !== undefined ? existingRepl.bold : !!sec.bold,
      italic: existingRepl?.italic !== undefined ? existingRepl.italic : !!sec.italic,
      underline: !!existingRepl?.underline,
      color: secColor,
      align: existingRepl?.align || 'left',
      lineHeight: existingRepl?.lineHeight || sec.lineHeight || 1.25,
      ptX: effPtX,
      ptY: effPtY,
      ptWidth: effPtWidth,
      ptHeight: effPtHeight,
      text: existingRepl ? existingRepl.replacementText : sec.fullOriginalText,
      originalText: sec.fullOriginalText,
      replacementText: existingRepl ? existingRepl.replacementText : sec.fullOriginalText,
      isExistingReplacement: !!existingRepl,
    };

    if (typeof onSetActiveTextEdit === 'function') {
      onSetActiveTextEdit(propsObj);
    }
  }, [liveLayout, pageReplacements, sampleTextColor, currentPage, onSetActiveTextEdit]);

  const handleSectionBoxClick = (e, sec) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (activeTool !== 'select' && activeTool !== 'edit-text') return;
    handleSelectSection(sec);
  };

  const handleSectionBoxDoubleClick = (e, sec) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (activeTool !== 'select' && activeTool !== 'edit-text') return;
    handleSelectSectionForEdit(sec, sec.type || 'paragraph');
  };

  const handleSectionMouseDown = (e, sec) => {
    if (activeTool !== 'select' && activeTool !== 'edit-text') return;
    if (e.target.closest('.text-editor-resize-handle') || e.target.closest('.pdf-section-floating-toolbar')) {
      return;
    }
    if (e.button !== undefined && e.button !== 0) return;

    handleSelectSection(sec);

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const layoutSec = (liveLayout || []).find((s) => s.id === sec.id) || sec;
    const curPtX = layoutSec.ptX !== undefined ? layoutSec.ptX : sec.ptX;
    const curPtY = layoutSec.ptY !== undefined ? layoutSec.ptY : sec.ptY;
    const curPtW = layoutSec.ptWidth !== undefined ? layoutSec.ptWidth : sec.ptWidth;
    const curPtH = layoutSec.ptHeight !== undefined ? layoutSec.ptHeight : sec.ptHeight;

    sectionInteractionRef.current = {
      type: 'move',
      secId: sec.id,
      startX: clientX,
      startY: clientY,
      origPtX: curPtX,
      origPtY: curPtY,
      origPtW: curPtW,
      origPtH: curPtH,
      moved: false,
    };
  };

  const handleSectionTouchStart = (e, sec) => {
    if (!e.touches || e.touches.length === 0) return;
    handleSectionMouseDown(e, sec);
  };

  const startSectionResize = (e, sec, handle) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (e && e.preventDefault) e.preventDefault();
    if (e.button !== undefined && e.button !== 0) return;

    handleSelectSection(sec);

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const layoutSec = (liveLayout || []).find((s) => s.id === sec.id) || sec;
    const curPtX = layoutSec.ptX !== undefined ? layoutSec.ptX : sec.ptX;
    const curPtY = layoutSec.ptY !== undefined ? layoutSec.ptY : sec.ptY;
    const curPtW = layoutSec.ptWidth !== undefined ? layoutSec.ptWidth : sec.ptWidth;
    const curPtH = layoutSec.ptHeight !== undefined ? layoutSec.ptHeight : sec.ptHeight;

    sectionInteractionRef.current = {
      type: 'resize',
      handle,
      secId: sec.id,
      startX: clientX,
      startY: clientY,
      origPtX: curPtX,
      origPtY: curPtY,
      origPtW: curPtW,
      origPtH: curPtH,
      moved: false,
    };
  };

  const handleCommitSectionLayout = useCallback((sec, layout) => {
    const existingRepl = pageReplacements.find((r) => r.sectionId === sec.id);
    const newPtX = layout.ptX !== undefined ? layout.ptX : sec.ptX;
    const newPtY = layout.ptY !== undefined ? layout.ptY : (sec.ptY + (layout.shiftAmount || 0));
    const newPtW = layout.ptWidth !== undefined ? layout.ptWidth : sec.ptWidth;
    const newPtH = layout.ptHeight !== undefined ? layout.ptHeight : sec.ptHeight;

    const applyFn = onApplyReplacement || onApplyDirectEdit;
    if (typeof applyFn !== 'function') return;

    if (existingRepl) {
      applyFn({
        ...existingRepl,
        ptX: newPtX,
        ptY: newPtY,
        origPtX: newPtX,
        origPtY: newPtY,
        ptWidth: newPtW,
        ptHeight: newPtH,
      });
    } else {
      applyFn({
        id: `sec_repl_${sec.id}`,
        sectionId: sec.id,
        type: 'section_reflow',
        page: currentPage,
        targetId: sec.id,
        originalText: sec.fullOriginalText,
        replacementText: sec.fullOriginalText,
        fontFamily: sec.fontFamily || 'Helvetica',
        fontSize: sec.fontSize || 14,
        bold: !!sec.bold,
        italic: !!sec.italic,
        color: sec.color || '#111827',
        align: 'left',
        lineHeight: sec.lineHeight || 1.25,
        coverPtX: sec.ptX,
        coverPtY: sec.ptY,
        coverPtWidth: sec.ptWidth,
        coverPtHeight: sec.ptHeight,
        origPtX: newPtX,
        origPtY: newPtY,
        origPtWidth: newPtW,
        origPtHeight: newPtH,
        ptX: newPtX,
        ptY: newPtY,
        ptWidth: newPtW,
        ptHeight: newPtH,
        baselinePtY: sec.baselinePtY !== undefined ? (sec.baselinePtY + (newPtY - sec.ptY)) : undefined,
        pdfBaselineY: sec.pdfBaselineY !== undefined ? (sec.pdfBaselineY - (newPtY - sec.ptY)) : undefined,
        coverColor: '#FFFFFF',
        replacedWordIds: sec.words ? sec.words.map((w) => w.id) : [],
      });
    }
  }, [pageReplacements, onApplyReplacement, onApplyDirectEdit, currentPage]);

  const handleTokenClick = (e, w) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (activeTool !== 'edit-text' && activeTool !== 'select') return;

    if (selectionLevel === 'word') {
      handleWordClick(e, w);
    } else if (selectionLevel === 'line') {
      const line = lines.find((l) => l.id === w.lineId || l.words.some((word) => word.id === w.id));
      if (line) {
        handleSelectLineForEdit(line);
      } else {
        handleWordClick(e, w);
      }
    } else if (selectionLevel === 'bullet') {
      const sec =
        sections.find(
          (s) => (s.id === w.sectionId || s.words.some((word) => word.id === w.id)) && s.type === 'bullet'
        ) || sections.find((s) => s.id === w.sectionId || s.words.some((word) => word.id === w.id));
      if (sec) {
        handleSelectSectionForEdit(sec, 'bullet');
      } else {
        handleWordClick(e, w);
      }
    } else if (selectionLevel === 'heading') {
      const sec =
        sections.find(
          (s) => (s.id === w.sectionId || s.words.some((word) => word.id === w.id)) && s.type === 'heading'
        ) || sections.find((s) => s.id === w.sectionId || s.words.some((word) => word.id === w.id));
      if (sec) {
        handleSelectSectionForEdit(sec, 'heading');
      } else {
        handleWordClick(e, w);
      }
    } else if (selectionLevel === 'subtitle') {
      const sec =
        sections.find(
          (s) => (s.id === w.sectionId || s.words.some((word) => word.id === w.id)) && s.type === 'subtitle'
        ) || sections.find((s) => s.id === w.sectionId || s.words.some((word) => word.id === w.id));
      if (sec) {
        handleSelectSectionForEdit(sec, 'subtitle');
      } else {
        handleWordClick(e, w);
      }
    } else {
      // paragraph
      const sec = sections.find((s) => s.id === w.sectionId || s.words.some((word) => word.id === w.id));
      if (sec) {
        handleSelectSectionForEdit(sec, 'paragraph');
      } else {
        const line = lines.find((l) => l.id === w.lineId || l.words.some((word) => word.id === w.id));
        if (line) {
          handleSelectLineForEdit(line);
        } else {
          handleWordClick(e, w);
        }
      }
    }
  };

  const handleTokenDoubleClick = (e, w) => {
    if (e && e.stopPropagation) e.stopPropagation();
    // Double-click always selects single word directly
    handleWordClick(e, w);
  };

  // Drag selection state and handlers for natural mouse/touch paragraph and multi-line selection
  const [dragSelection, setDragSelection] = useState(null);
  const dragStartRef = useRef(null);

  const handleTokenMouseDown = (e, word) => {
    if (activeTool !== 'edit-text' && activeTool !== 'select') return;
    if (e.button !== 0) return; // Left click only

    const sec = sections.find((s) => s.id === word.sectionId || s.words?.some((w2) => w2.id === word.id));
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      word,
      section: sec,
      moved: false,
    };
  };

  const handleTokenTouchStart = (e, word) => {
    if (activeTool !== 'edit-text' && activeTool !== 'select') return;
    if (!e.touches || e.touches.length === 0) return;

    const t = e.touches[0];
    const sec = sections.find((s) => s.id === word.sectionId || s.words?.some((w2) => w2.id === word.id));
    dragStartRef.current = {
      startX: t.clientX,
      startY: t.clientY,
      word,
      section: sec,
      moved: false,
    };
  };

  const handleSelectWordRangeForEdit = (selectedWords, sec) => {
    if (!selectedWords || selectedWords.length === 0) return;

    // Sort words in reading order: top to bottom, left to right
    const sorted = [...selectedWords].sort((a, b) => {
      const diffY = a.ptY - b.ptY;
      if (Math.abs(diffY) > 4) return diffY;
      return a.ptX - b.ptX;
    });

    // Check if the range starts with a bullet symbol
    const startsWithBullet = sorted.length > 1 && isBulletWord(sorted[0]);
    const bulletWord = startsWithBullet ? sorted[0] : null;
    const effectiveWords = startsWithBullet ? sorted.slice(1) : sorted;

    let rangeText = '';
    for (let i = 0; i < effectiveWords.length; i++) {
      if (i > 0) {
        const isNewLine = Math.abs(effectiveWords[i].ptY - effectiveWords[i - 1].ptY) > 5;
        rangeText += isNewLine ? '\n' : ' ';
      }
      rangeText += effectiveWords[i].text;
    }

    const minPtX = Math.min(...effectiveWords.map((w) => w.ptX));
    const maxPtX = Math.max(...effectiveWords.map((w) => w.ptX + w.ptWidth));
    const minPtY = Math.min(...effectiveWords.map((w) => w.ptY));
    const maxPtY = Math.max(...effectiveWords.map((w) => w.ptY + w.ptHeight));
    const leadWord = effectiveWords[0];

    const isSingleLineRange = maxPtY - minPtY <= Math.max(16, (leadWord.fontSize || 14) * 1.5);
    const rangeType = isSingleLineRange ? 'line' : (sec?.type || 'paragraph');

    const rangeSection = {
      ...(sec || {}),
      id: `range_${Date.now()}`,
      type: rangeType,
      page: currentPage,
      lines: sec?.lines || [],
      words: effectiveWords,
      contentWords: effectiveWords,
      replacedWordIds: effectiveWords.map((w) => w.id),
      ptX: minPtX,
      ptY: minPtY,
      ptWidth: maxPtX - minPtX,
      ptHeight: maxPtY - minPtY,
      fontSize: leadWord.fontSize || 14,
      fontFamily: leadWord.fontFamily || 'Helvetica',
      bold: !!leadWord.bold,
      italic: !!leadWord.italic,
      color: leadWord.color || '#111827',
      fullOriginalText: rangeText,
      baselinePtY: leadWord.baselinePtY,
      pdfBaselineY: leadWord.pdfBaselineY,
      pdfBaselineX: leadWord.pdfBaselineX,
      hasBullet: startsWithBullet,
      bulletWord: bulletWord,
      textStartX: minPtX,
    };

    handleSelectSectionForEdit(rangeSection, rangeType);
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      // Handle Section Moving and Resizing
      if (sectionInteractionRef.current) {
        const { type, handle, secId, startX, startY, origPtX, origPtY, origPtW, origPtH } = sectionInteractionRef.current;
        const dx = (clientX - startX) / zoom;
        const dy = (clientY - startY) / zoom;

        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          sectionInteractionRef.current.moved = true;
        }

        if (type === 'move') {
          const newPtX = Math.max(0, Math.min(pagePtWidth - origPtW, Math.round(origPtX + dx)));
          const newPtY = Math.max(0, Math.min(pagePtHeight - origPtH, Math.round(origPtY + dy)));
          setSectionLayouts((prev) => ({
            ...prev,
            [secId]: { ...(prev[secId] || {}), ptX: newPtX, ptY: newPtY },
          }));
        } else if (type === 'resize') {
          let newPtX = origPtX;
          let newPtY = origPtY;
          let newPtW = origPtW;
          let newPtH = origPtH;

          if (handle.includes('e')) {
            newPtW = Math.max(30, Math.min(pagePtWidth - origPtX, Math.round(origPtW + dx)));
          }
          if (handle.includes('s')) {
            newPtH = Math.max(14, Math.min(pagePtHeight - origPtY, Math.round(origPtH + dy)));
          }
          if (handle.includes('w')) {
            newPtX = Math.max(0, Math.min(origPtX + origPtW - 30, Math.round(origPtX + dx)));
            newPtW = origPtW - (newPtX - origPtX);
          }
          if (handle.includes('n')) {
            newPtY = Math.max(0, Math.min(origPtY + origPtH - 14, Math.round(origPtY + dy)));
            newPtH = origPtH - (newPtY - origPtY);
          }

          setSectionLayouts((prev) => ({
            ...prev,
            [secId]: {
              ...(prev[secId] || {}),
              ptX: newPtX,
              ptY: newPtY,
              ptWidth: newPtW,
              ptHeight: newPtH,
            },
          }));
        }
        return;
      }

      if (!dragStartRef.current) return;
      const dist = Math.hypot(clientX - dragStartRef.current.startX, clientY - dragStartRef.current.startY);

      if (dist > 6) {
        dragStartRef.current.moved = true;
        const sec = dragStartRef.current.section;
        if (!sec || !sec.words || sec.words.length === 0) return;

        if (!layerRef.current) return;
        const rect = layerRef.current.getBoundingClientRect();
        const curPtX = (clientX - rect.left) / zoom;
        const curPtY = (clientY - rect.top) / zoom;

        let closestWord = sec.words[0];
        let minDist = Infinity;
        for (const w of sec.words) {
          const wCenterX = w.ptX + w.ptWidth / 2;
          const wCenterY = w.ptY + w.ptHeight / 2;
          const d = Math.hypot(curPtX - wCenterX, curPtY - wCenterY);
          if (d < minDist) {
            minDist = d;
            closestWord = w;
          }
        }

        const startW = dragStartRef.current.word;
        const idxA = sec.words.findIndex((w) => w.id === startW.id);
        const idxB = sec.words.findIndex((w) => w.id === closestWord.id);

        if (idxA !== -1 && idxB !== -1) {
          const minIdx = Math.min(idxA, idxB);
          const maxIdx = Math.max(idxA, idxB);
          const range = sec.words.slice(minIdx, maxIdx + 1);
          setDragSelection({
            isDragging: true,
            selectedWords: range,
            section: sec,
          });
        }
      }
    };

    const handleGlobalMouseUp = () => {
      // Complete section move or resize
      if (sectionInteractionRef.current) {
        const { secId, moved } = sectionInteractionRef.current;
        sectionInteractionRef.current = null;
        if (moved) {
          const sec = sections.find((s) => s.id === secId);
          const layout = sectionLayouts[secId];
          if (sec && layout) {
            handleCommitSectionLayout(sec, layout);
          }
        }
      }

      if (!dragStartRef.current) return;

      if (dragStartRef.current.moved && dragSelection && dragSelection.selectedWords?.length > 1) {
        handleSelectWordRangeForEdit(dragSelection.selectedWords, dragSelection.section);
      }

      dragStartRef.current = null;
      setDragSelection(null);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchmove', handleGlobalMouseMove, { passive: false });
    window.addEventListener('touchend', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchmove', handleGlobalMouseMove);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [dragSelection, zoom, sections, pagePtWidth, pagePtHeight, sectionLayouts, handleCommitSectionLayout]);

  // 5. Commit direct inline edit - creates or updates line reflow or visual replacement record
  const handleCommitInlineEdit = () => {
    if (!activeInlineEdit) return;

    const fullVal = activeInlineEdit.replacementText ?? activeInlineEdit.currentVal ?? '';

    // Case A: Manual Area Marquee Replacement
    if (activeInlineEdit.isArea) {
      const fontSize = activeInlineEdit.fontSize || 14;
      const bleedX = activeInlineEdit.bleedX ?? Math.max(2, Math.round(fontSize * 0.16));
      const bleedY = activeInlineEdit.bleedY ?? Math.max(2, Math.round(fontSize * 0.20));

      const origPtX = activeInlineEdit.ptX;
      const origPtY = activeInlineEdit.ptY;
      const origPtWidth = activeInlineEdit.ptWidth;
      const origPtHeight = activeInlineEdit.ptHeight;

      const linesArr = fullVal.split('\n');
      const maxLineLen = Math.max(1, ...linesArr.map((l) => l.length));
      const estReplWidth = Math.ceil(maxLineLen * (fontSize * 0.6) + 16);
      const estReplHeight = Math.ceil(linesArr.length * (fontSize * 1.3) + 12);

      const coverPtWidth = Math.max(origPtWidth, estReplWidth) + bleedX * 2;
      const coverPtHeight = Math.max(origPtHeight, estReplHeight) + bleedY * 2;
      const coverPtX = origPtX - bleedX;
      const coverPtY = origPtY - bleedY;

      const applyFn = onApplyReplacement || onApplyDirectEdit;
      if (typeof applyFn === 'function') {
        applyFn({
          id: activeInlineEdit.id || `area_${Date.now()}`,
          page: currentPage,
          targetId: activeInlineEdit.targetId || activeInlineEdit.id,
          originalText: activeInlineEdit.originalText,
          replacementText: fullVal,
          origPtX,
          origPtY,
          origPtWidth,
          origPtHeight,
          coverPtX,
          coverPtY,
          coverPtWidth,
          coverPtHeight,
          coverColor: '#FFFFFF',
          fontSize,
          fontFamily: activeInlineEdit.fontFamily || 'Helvetica',
          bold: !!activeInlineEdit.bold,
          italic: !!activeInlineEdit.italic,
          color: activeInlineEdit.color || '#111827',
          align: 'left',
          lineHeight: 1.25,
          isArea: true,
        });
      }

      setActiveInlineEdit(null);
      return;
    }

    // Case 0: Section Reflow Replacement (Paragraph, Heading, Subtitle, or Line)
    if (activeInlineEdit.type === 'section_reflow' && (activeInlineEdit.section || activeInlineEdit.sectionId)) {
      const sec = activeInlineEdit.section || sections.find((s) => s.id === activeInlineEdit.sectionId);
      if (sec) {
        // Requirement 5: If the user selected a line or paragraph but changed ONLY one word,
        // modify ONLY that target word so that all neighboring words, bullets, formatting, and vector streams remain 100% untouched!
        const origWords = (sec.hasBullet && sec.contentWords ? sec.contentWords : sec.words) || activeInlineEdit.words || [];
        const origText = (activeInlineEdit.originalText || '').trim();
        const newText = String(fullVal || '').trim();

        const origTokens = origText.split(/\s+/).filter(Boolean);
        const newTokens = newText.split(/\s+/).filter(Boolean);

        if (origTokens.length > 0 && origTokens.length === newTokens.length && origWords.length === origTokens.length) {
          const diffIndices = [];
          for (let i = 0; i < origTokens.length; i++) {
            if (origTokens[i] !== newTokens[i]) {
              diffIndices.push(i);
            }
          }

          if (diffIndices.length === 1) {
            const diffIdx = diffIndices[0];
            const targetWord = origWords[diffIdx];
            const targetLine = lines.find(
              (l) => l.id === targetWord.lineId || (l.words && l.words.some((w) => w.id === targetWord.id))
            ) || (sec.lines && sec.lines.find((l) => l.words && l.words.some((w) => w.id === targetWord.id)));

            if (targetWord) {
              const wordRepl = calculateWordReplacement({
                word: targetWord,
                line: targetLine,
                replacementText: newTokens[diffIdx],
                capitalization: activeInlineEdit.capitalization || 'preserve',
                userFormatting: {
                  fontSize: activeInlineEdit.fontSize,
                  fontFamily: activeInlineEdit.fontFamily,
                  bold: !!activeInlineEdit.bold,
                  italic: !!activeInlineEdit.italic,
                  underline: !!activeInlineEdit.underline,
                  color: activeInlineEdit.color || '#111827',
                },
                pagePtWidth,
                prevWord: diffIdx > 0 ? origWords[diffIdx - 1] : null,
                nextWord: diffIdx < origWords.length - 1 ? origWords[diffIdx + 1] : null,
              });

              if (wordRepl && !wordRepl.isWrapped) {
                // If it needs line reflow on the line
                if (targetLine && wordRepl.renderedTextWidth > (targetWord.ptWidth + 4)) {
                  const reflowResult = calculateLineReflow({
                    line: targetLine,
                    targetWordId: targetWord.id,
                    replacementText: newTokens[diffIdx],
                    wordEdits: { [targetWord.id]: newTokens[diffIdx] },
                    capitalization: activeInlineEdit.capitalization || 'preserve',
                    pagePtWidth,
                  });
                  if (reflowResult) {
                    const applyFn = onApplyReplacement || onApplyDirectEdit;
                    if (typeof applyFn === 'function') {
                      applyFn({
                        id: `repl_line_${targetLine.id}`,
                        lineId: targetLine.id,
                        line: targetLine,
                        type: 'line_reflow',
                        page: currentPage,
                        targetId: targetWord.id,
                        targetWord: targetWord.text,
                        originalText: targetLine.fullOriginalText,
                        replacementText: newTokens[diffIdx],
                        wordEdits: reflowResult.activeEdits,
                        reflowLine: reflowResult,
                        origPtX: reflowResult.coverPtX,
                        origPtY: reflowResult.coverPtY,
                        origPtWidth: reflowResult.coverPtWidth,
                        origPtHeight: reflowResult.coverPtHeight,
                        coverPtX: reflowResult.coverPtX,
                        coverPtY: reflowResult.coverPtY,
                        coverPtWidth: reflowResult.coverPtWidth,
                        coverPtHeight: reflowResult.coverPtHeight,
                        baselinePtY: reflowResult.baselinePtY || targetLine.baselinePtY,
                        pdfBaselineY: reflowResult.pdfBaselineY || targetLine.pdfBaselineY,
                        pdfBaselineX: reflowResult.pdfBaselineX || targetLine.pdfBaselineX,
                        coverColor: '#FFFFFF',
                        fontSize: activeInlineEdit.fontSize,
                        fontFamily: activeInlineEdit.fontFamily || 'Helvetica',
                        bold: !!activeInlineEdit.bold,
                        italic: !!activeInlineEdit.italic,
                        underline: !!activeInlineEdit.underline,
                        color: activeInlineEdit.color || '#111827',
                        align: 'left',
                        overflowsBoundary: reflowResult.overflowsBoundary,
                        overflowAmount: reflowResult.overflowAmount,
                        overflowWarning: reflowResult.overflowWarning,
                      });
                    }
                    setActiveInlineEdit(null);
                    if (typeof onSetActiveTextEdit === 'function') onSetActiveTextEdit(null);
                    return;
                  }
                }

                // Clean single-word replacement: 100% of adjacent words and bullets preserved
                const applyFn = onApplyReplacement || onApplyDirectEdit;
                if (typeof applyFn === 'function') {
                  applyFn({
                    id: `repl_word_${targetWord.id}`,
                    targetId: targetWord.id,
                    lineId: targetLine ? targetLine.id : null,
                    type: 'word_replacement',
                    selectionLevel: 'word',
                    page: currentPage,
                    targetWord: wordRepl.originalText,
                    originalText: wordRepl.originalText,
                    replacementText: wordRepl.replacementText,
                    origPtX: wordRepl.origPtX,
                    origPtY: wordRepl.origPtY,
                    origPtWidth: wordRepl.origPtWidth,
                    origPtHeight: wordRepl.origPtHeight,
                    coverPtX: wordRepl.coverPtX,
                    coverPtY: wordRepl.coverPtY,
                    coverPtWidth: wordRepl.coverPtWidth,
                    coverPtHeight: wordRepl.coverPtHeight,
                    baselinePtY: wordRepl.baselinePtY,
                    pdfBaselineY: wordRepl.pdfBaselineY,
                    pdfBaselineX: wordRepl.pdfBaselineX,
                    fontSize: wordRepl.fontSize,
                    fontFamily: wordRepl.fontFamily,
                    bold: wordRepl.bold,
                    italic: wordRepl.italic,
                    underline: wordRepl.underline,
                    color: wordRepl.color,
                    coverColor: '#FFFFFF',
                    isWrapped: false,
                    wrappedLines: wordRepl.wrappedLines,
                    indentX: wordRepl.indentX,
                    lineSpacingPt: wordRepl.lineSpacingPt,
                    replacedWordIds: [targetWord.id],
                  });
                }
                setActiveInlineEdit(null);
                if (typeof onSetActiveTextEdit === 'function') onSetActiveTextEdit(null);
                return;
              }
            }
          }
        }

        const reflowResult = calculateSectionReflow({
          section: sec,
          replacementText: fullVal,
          fontFamily: activeInlineEdit.fontFamily,
          fontSize: activeInlineEdit.fontSize,
          bold: activeInlineEdit.bold,
          italic: activeInlineEdit.italic,
          underline: activeInlineEdit.underline,
          color: activeInlineEdit.color,
          align: activeInlineEdit.align,
          lineHeight: activeInlineEdit.lineHeight,
          letterSpacing: activeInlineEdit.letterSpacing,
          backgroundColor: activeInlineEdit.backgroundColor || '#FFFFFF',
          opacity: activeInlineEdit.opacity,
          capitalization: activeInlineEdit.capitalization,
          availableWidth: activeInlineEdit.availableWidth,
          pagePtWidth,
          pagePtHeight,
        });

        if (reflowResult) {
          const applyFn = onApplyReplacement || onApplyDirectEdit;
          if (typeof applyFn === 'function') {
            const newRepl = {
              ...reflowResult,
              baselinePtY: activeInlineEdit.baselinePtY !== undefined ? activeInlineEdit.baselinePtY : reflowResult.baselinePtY,
              pdfBaselineY: activeInlineEdit.pdfBaselineY !== undefined ? activeInlineEdit.pdfBaselineY : reflowResult.pdfBaselineY,
              pdfBaselineX: activeInlineEdit.pdfBaselineX !== undefined ? activeInlineEdit.pdfBaselineX : reflowResult.pdfBaselineX,
              replacedWordIds: reflowResult.replacedWordIds || activeInlineEdit.replacedWordIds || [],
            };

            // Derive deterministic shifted layout for all following sections in reading stream
            const otherRepls = pageReplacements.filter((r) => r.sectionId !== activeInlineEdit.sectionId && r.id !== activeInlineEdit.id);
            const computedLayout = computePageReflowLayout(sections, [...otherRepls, newRepl], pagePtWidth, pagePtHeight);
            const shifted = computedLayout
              .filter((s) => s.id !== activeInlineEdit.sectionId && Math.abs(s.shiftAmount || 0) > 0.5)
              .map((s) => ({
                id: s.id,
                sectionId: s.id,
                shiftAmount: s.shiftAmount,
                originalPtX: s.originalPtX !== undefined ? s.originalPtX : s.ptX,
                originalPtY: s.originalPtY !== undefined ? s.originalPtY : s.ptY,
                originalPtWidth: s.originalPtWidth !== undefined ? s.originalPtWidth : s.ptWidth,
                originalPtHeight: s.originalPtHeight !== undefined ? s.originalPtHeight : s.ptHeight,
                ptX: s.ptX,
                ptY: s.ptY,
                ptWidth: s.ptWidth,
                ptHeight: s.ptHeight,
                baselinePtY: s.baselinePtY,
                pdfBaselineY: s.pdfBaselineY,
                lines: (s.lines || []).map((l) => ({
                  text: l.fullOriginalText || (l.words || []).map((w) => w.text).join(' '),
                  ptX: l.ptX !== undefined ? l.ptX : (s.originalPtX !== undefined ? s.originalPtX : s.ptX),
                  ptY: (l.ptY !== undefined ? l.ptY : (s.originalPtY !== undefined ? s.originalPtY : s.ptY)) + s.shiftAmount,
                  baselinePtY: l.baselinePtY !== undefined ? l.baselinePtY + s.shiftAmount : undefined,
                  pdfBaselineY: l.pdfBaselineY !== undefined ? l.pdfBaselineY - s.shiftAmount : undefined,
                  fontSize: l.fontSize || s.fontSize || 14,
                  fontFamily: l.fontFamily || s.fontFamily || 'Helvetica',
                  bold: !!(l.bold || s.bold),
                  italic: !!(l.italic || s.italic),
                  color: l.color || s.color || '#111827',
                })),
                fullOriginalText: s.fullOriginalText,
                fontSize: s.fontSize || 14,
                fontFamily: s.fontFamily || 'Helvetica',
                bold: !!s.bold,
                italic: !!s.italic,
                color: s.color || '#111827',
                overflowsBottom: s.overflowsBottom,
                overflowBottomAmount: s.overflowBottomAmount,
              }));

            newRepl.shiftedSections = shifted;
            applyFn(newRepl);
            setDownwardShiftDelta(0);
          }
          setActiveInlineEdit(null);
          if (typeof onSetActiveTextEdit === 'function') onSetActiveTextEdit(null);
          return;
        }
      }
    }

    // Case A: High-Precision Single-Word Replacement (Zero damage to neighboring text)
    if (activeInlineEdit.selectionLevel === 'word') {
      const line = activeInlineEdit.line || lines.find((l) => l.id === activeInlineEdit.lineId);
      const wordObj = line && Array.isArray(line.words) ? line.words.find((w) => w.id === activeInlineEdit.targetId) : null;

      // Find adjacent lines above and below for vertical boundary safety
      const lineY = line ? (line.baselinePtY !== undefined ? line.baselinePtY : line.ptY) : (activeInlineEdit.baselinePtY || activeInlineEdit.ptY);
      let lineAbove = activeInlineEdit.lineAbove || null;
      let lineBelow = activeInlineEdit.lineBelow || null;
      if (!lineAbove || !lineBelow) {
        let minAboveDist = Infinity;
        let minBelowDist = Infinity;
        for (const l of lines) {
          if (line && l.id === line.id) continue;
          const lY = l.baselinePtY !== undefined ? l.baselinePtY : l.ptY;
          const dist = lY - lineY;
          if (dist < 0 && Math.abs(dist) < minAboveDist) {
            minAboveDist = Math.abs(dist);
            lineAbove = l;
          } else if (dist > 0 && dist < minBelowDist) {
            minBelowDist = dist;
            lineBelow = l;
          }
        }
      }

      // Find adjacent words in same line
      let prevWord = activeInlineEdit.prevWord || null;
      let nextWord = activeInlineEdit.nextWord || null;
      if (line && Array.isArray(line.words)) {
        const wIdx = line.words.findIndex((w) => w.id === activeInlineEdit.targetId);
        if (wIdx > 0 && !prevWord) prevWord = line.words[wIdx - 1];
        if (wIdx >= 0 && wIdx < line.words.length - 1 && !nextWord) nextWord = line.words[wIdx + 1];
      }

      const wordRepl = calculateWordReplacement({
        word: wordObj || {
          id: activeInlineEdit.targetId,
          text: activeInlineEdit.word || activeInlineEdit.originalText,
          ptX: activeInlineEdit.ptX,
          ptY: activeInlineEdit.ptY,
          ptWidth: activeInlineEdit.ptWidth,
          ptHeight: activeInlineEdit.ptHeight,
          fontSize: activeInlineEdit.fontSize,
          fontFamily: activeInlineEdit.fontFamily,
          bold: activeInlineEdit.bold,
          italic: activeInlineEdit.italic,
          color: activeInlineEdit.color,
          baselinePtY: activeInlineEdit.baselinePtY,
          pdfBaselineY: activeInlineEdit.pdfBaselineY,
          pdfBaselineX: activeInlineEdit.pdfBaselineX,
        },
        line,
        replacementText: fullVal,
        capitalization: activeInlineEdit.capitalization || 'preserve',
        userFormatting: {
          fontSize: activeInlineEdit.fontSize,
          fontFamily: activeInlineEdit.fontFamily,
          bold: !!activeInlineEdit.bold,
          italic: !!activeInlineEdit.italic,
          underline: !!activeInlineEdit.underline,
          color: activeInlineEdit.color || '#111827',
        },
        pagePtWidth,
        lineAbove,
        lineBelow,
        prevWord,
        nextWord,
      });

      if (wordRepl) {
        const applyFn = onApplyReplacement || onApplyDirectEdit;
        if (typeof applyFn === 'function') {
          applyFn({
            id: activeInlineEdit.id || wordRepl.id,
            targetId: activeInlineEdit.targetId,
            lineId: line ? line.id : null,
            type: 'word_replacement',
            selectionLevel: 'word',
            page: currentPage,
            targetWord: wordRepl.originalText,
            originalText: wordRepl.originalText,
            replacementText: wordRepl.replacementText,
            origPtX: wordRepl.origPtX,
            origPtY: wordRepl.origPtY,
            origPtWidth: wordRepl.origPtWidth,
            origPtHeight: wordRepl.origPtHeight,
            coverPtX: wordRepl.coverPtX,
            coverPtY: wordRepl.coverPtY,
            coverPtWidth: wordRepl.coverPtWidth,
            coverPtHeight: wordRepl.coverPtHeight,
            baselinePtY: wordRepl.baselinePtY,
            pdfBaselineY: wordRepl.pdfBaselineY,
            pdfBaselineX: wordRepl.pdfBaselineX,
            fontSize: wordRepl.fontSize,
            fontFamily: wordRepl.fontFamily,
            bold: wordRepl.bold,
            italic: wordRepl.italic,
            underline: wordRepl.underline,
            color: wordRepl.color,
            coverColor: '#FFFFFF',
            isWrapped: wordRepl.isWrapped,
            wrappedLines: wordRepl.wrappedLines,
            indentX: wordRepl.indentX,
            lineSpacingPt: wordRepl.lineSpacingPt,
            replacedWordIds: wordRepl.replacedWordIds || [activeInlineEdit.targetId],
            overflowsBoundary: wordRepl.overflowsBoundary,
            overflowWarning: wordRepl.overflowWarning,
          });
        }
        setActiveInlineEdit(null);
        if (typeof onSetActiveTextEdit === 'function') onSetActiveTextEdit(null);
        return;
      }
    }

    // Case B: Intelligent Text Line Reflow Replacement
    const line = activeInlineEdit.line || lines.find((l) => l.id === activeInlineEdit.lineId);

    if (line) {
      const targetId = activeInlineEdit.targetId;
      const updatedWordEdits = {
        ...(activeInlineEdit.existingWordEdits || {}),
        [targetId]: fullVal,
      };

      const updatedWordStyles = {
        ...(activeInlineEdit.existingWordStyles || {}),
        [targetId]: {
          fontSize: activeInlineEdit.fontSize,
          fontFamily: activeInlineEdit.fontFamily,
          bold: !!activeInlineEdit.bold,
          italic: !!activeInlineEdit.italic,
          underline: !!activeInlineEdit.underline,
          color: activeInlineEdit.color || '#111827',
        },
      };

      const wordHistories = { ...(activeInlineEdit.wordHistories || {}) };
      if (activeInlineEdit.isExistingReplacement && activeInlineEdit.originalText !== fullVal) {
        const prevWordHist = wordHistories[targetId] ? [...wordHistories[targetId]] : [];
        prevWordHist.push({
          replacementText: activeInlineEdit.originalText,
          style: {
            fontSize: activeInlineEdit.fontSize,
            fontFamily: activeInlineEdit.fontFamily,
            bold: !!activeInlineEdit.bold,
            italic: !!activeInlineEdit.italic,
            underline: !!activeInlineEdit.underline,
            color: activeInlineEdit.color || '#111827',
          },
        });
        wordHistories[targetId] = prevWordHist;
      }

      const reflowResult = calculateLineReflow({
        line,
        targetWordId: targetId,
        replacementText: fullVal,
        wordEdits: updatedWordEdits,
        wordStyles: updatedWordStyles,
        capitalization: activeInlineEdit.capitalization || 'preserve',
        pagePtWidth,
        lineAbove: activeInlineEdit.lineAbove,
        lineBelow: activeInlineEdit.lineBelow,
      });

      if (reflowResult) {
        const applyFn = onApplyReplacement || onApplyDirectEdit;
        if (typeof applyFn === 'function') {
          applyFn({
            id: activeInlineEdit.lineReplId || `repl_line_${line.id}`,
            lineId: line.id,
            line,
            type: 'line_reflow',
            page: currentPage,
            targetId: activeInlineEdit.targetId,
            targetWord: activeInlineEdit.word || activeInlineEdit.originalText,
            originalText: activeInlineEdit.originalText || line.fullOriginalText,
            replacementText: fullVal,
            wordEdits: reflowResult.activeEdits,
            wordStyles: updatedWordStyles,
            wordHistories,
            reflowLine: reflowResult,
            origPtX: reflowResult.coverPtX,
            origPtY: reflowResult.coverPtY,
            origPtWidth: reflowResult.coverPtWidth,
            origPtHeight: reflowResult.coverPtHeight,
            coverPtX: reflowResult.coverPtX,
            coverPtY: reflowResult.coverPtY,
            coverPtWidth: reflowResult.coverPtWidth,
            coverPtHeight: reflowResult.coverPtHeight,
            baselinePtY: reflowResult.baselinePtY || activeInlineEdit.baselinePtY || line.baselinePtY,
            pdfBaselineY: reflowResult.pdfBaselineY || activeInlineEdit.pdfBaselineY || line.pdfBaselineY,
            pdfBaselineX: reflowResult.pdfBaselineX || activeInlineEdit.pdfBaselineX || line.pdfBaselineX,
            coverColor: '#FFFFFF',
            fontSize: activeInlineEdit.fontSize,
            fontFamily: activeInlineEdit.fontFamily || 'Helvetica',
            bold: !!activeInlineEdit.bold,
            italic: !!activeInlineEdit.italic,
            underline: !!activeInlineEdit.underline,
            color: activeInlineEdit.color || '#111827',
            align: 'left',
            overflowsBoundary: reflowResult.overflowsBoundary,
            overflowAmount: reflowResult.overflowAmount,
            overflowWarning: reflowResult.overflowWarning,
          });
        }
        setActiveInlineEdit(null);
        if (typeof onSetActiveTextEdit === 'function') onSetActiveTextEdit(null);
        return;
      }
    }

    // Case C: Single-word fallback if line is not detected
    if (fullVal === activeInlineEdit.originalText && !activeInlineEdit.isExistingReplacement) {
      setActiveInlineEdit(null);
      if (typeof onSetActiveTextEdit === 'function') onSetActiveTextEdit(null);
      return;
    }

    const fontSize = activeInlineEdit.fontSize || 14;
    const ascentRatio = getFontAscentRatio(activeInlineEdit.fontFamily);
    const descentRatio = getFontDescentRatio(activeInlineEdit.fontFamily);
    const ascent = Math.ceil(fontSize * ascentRatio);
    const descent = Math.ceil(fontSize * descentRatio);
    const bleedX = activeInlineEdit.bleedX ?? Math.max(2, Math.round(fontSize * 0.16));
    const bleedY = activeInlineEdit.bleedY ?? Math.max(2, Math.round(fontSize * 0.20));

    const baselinePtY = activeInlineEdit.baselinePtY !== undefined ? activeInlineEdit.baselinePtY : (activeInlineEdit.ptY + ascent);
    const pdfBaselineY = activeInlineEdit.pdfBaselineY;
    const pdfBaselineX = activeInlineEdit.pdfBaselineX;

    const origPtX = activeInlineEdit.ptX;
    const origPtY = Math.round(baselinePtY - ascent);
    const origPtWidth = activeInlineEdit.ptWidth;
    const origPtHeight = ascent + descent;

    const transformedVal = applyCapitalization(fullVal, activeInlineEdit.capitalization || 'preserve', activeInlineEdit.originalText);

    const estReplWidth = measureTextWidth(
      transformedVal,
      activeInlineEdit.fontFamily,
      fontSize,
      activeInlineEdit.bold,
      activeInlineEdit.italic
    );

    const coverPtWidth = Math.max(origPtWidth, estReplWidth) + bleedX * 2;
    const coverPtHeight = origPtHeight + bleedY * 2;
    const coverPtX = origPtX - bleedX;
    const coverPtY = Math.round(baselinePtY - ascent - bleedY);

    const applyFn = onApplyReplacement || onApplyDirectEdit;
    if (typeof applyFn === 'function') {
      applyFn({
        id: activeInlineEdit.id || `repl_${currentPage}_${Date.now()}`,
        page: currentPage,
        targetId: activeInlineEdit.targetId || activeInlineEdit.id,
        originalText: activeInlineEdit.originalText,
        replacementText: transformedVal,
        origPtX,
        origPtY,
        origPtWidth,
        origPtHeight,
        coverPtX,
        coverPtY,
        coverPtWidth,
        coverPtHeight,
        baselinePtY,
        pdfBaselineY,
        pdfBaselineX,
        coverColor: '#FFFFFF',
        fontSize,
        fontFamily: activeInlineEdit.fontFamily || 'Helvetica',
        bold: !!activeInlineEdit.bold,
        italic: !!activeInlineEdit.italic,
        underline: !!activeInlineEdit.underline,
        color: activeInlineEdit.color || '#111827',
        align: 'left',
        lineHeight: 1.25,
        isArea: false,
      });
    }

    setActiveInlineEdit(null);
    if (typeof onSetActiveTextEdit === 'function') {
      onSetActiveTextEdit(null);
    }
  };

  const handleCancelInlineEdit = () => {
    isActionClickedRef.current = false;
    setActiveInlineEdit(null);
    if (typeof onCancelActiveTextEdit === 'function') {
      onCancelActiveTextEdit();
    }
    if (typeof onSetActiveTextEdit === 'function') {
      onSetActiveTextEdit(null);
    }
  };

  // Revert word or entire line replacement
  const handleRevertInlineEdit = () => {
    if (!activeInlineEdit) return;
    isActionClickedRef.current = false;

    if (typeof onRevertReplacement === 'function') {
      onRevertReplacement(
        activeInlineEdit.targetId,
        activeInlineEdit.lineReplId || activeInlineEdit.id,
        activeInlineEdit.targetId
      );
    } else if (typeof onRevertActiveTextEdit === 'function') {
      onRevertActiveTextEdit();
    } else if (typeof onDeleteReplacement === 'function') {
      onDeleteReplacement(activeInlineEdit.lineReplId || activeInlineEdit.id);
    }

    setActiveInlineEdit(null);
    if (typeof onSetActiveTextEdit === 'function') {
      onSetActiveTextEdit(null);
    }
  };

  // 6. Marquee Selection Handlers for Manual Area Tool
  const handleMouseDown = (e) => {
    if (activeTool !== 'replace-area') return;
    if (!layerRef.current) return;

    const rect = layerRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const startX = clientX - rect.left;
    const startY = clientY - rect.top;

    setMarquee({
      startX,
      startY,
      currentX: startX,
      currentY: startY,
      isDragging: true,
    });
  };

  const handleMouseMove = useCallback((e) => {
    if (!marquee || !marquee.isDragging) return;
    if (!layerRef.current) return;

    if (e.cancelable && e.touches) {
      e.preventDefault();
    }

    const rect = layerRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const currentX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const currentY = Math.max(0, Math.min(clientY - rect.top, rect.height));

    setMarquee((prev) => (prev ? { ...prev, currentX, currentY } : null));
  }, [marquee]);

  const handleMouseUp = useCallback(() => {
    if (!marquee || !marquee.isDragging) return;

    const screenX = Math.min(marquee.startX, marquee.currentX);
    const screenY = Math.min(marquee.startY, marquee.currentY);
    const screenW = Math.abs(marquee.currentX - marquee.startX);
    const screenH = Math.abs(marquee.currentY - marquee.startY);

    setMarquee(null);

    // Minimum area threshold
    if (screenW >= 15 && screenH >= 10) {
      const ptX = Math.round(screenX / zoom);
      const ptY = Math.round(screenY / zoom);
      const ptWidth = Math.round(screenW / zoom);
      const ptHeight = Math.round(screenH / zoom);

      setActiveInlineEdit({
        id: `area_${Date.now()}`,
        lineReplId: `area_${Date.now()}`,
        word: '',
        originalText: '',
        replacementText: '',
        currentVal: '',
        ptX,
        ptY,
        ptWidth,
        ptHeight,
        fontSize: Math.max(10, Math.min(24, Math.round(ptHeight * 0.7))),
        fontFamily: 'Helvetica',
        bold: false,
        italic: false,
        isArea: true,
      });
    }
  }, [marquee, zoom]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove, { passive: false });
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleLayerMouseDown = (e) => {
    if (activeTool === 'replace-area') {
      handleMouseDown(e);
      return;
    }

    if (
      e.target.closest('.pdf-detected-section-box') ||
      e.target.closest('.direct-inline-editor-wrapper') ||
      e.target.closest('.direct-inline-floating-toolbar') ||
      e.target.closest('.text-editor-resize-handle') ||
      e.target.closest('.editor-properties-panel') ||
      e.target.closest('.editor-right-properties')
    ) {
      return;
    }

    if (activeInlineEdit) {
      handleCommitInlineEdit();
    }
    setSelectedSectionId(null);
    if (typeof onSetActiveTextEdit === 'function') {
      onSetActiveTextEdit(null);
    }
  };

  const isLayerInteractive = activeTool === 'edit-text' || activeTool === 'replace-area' || activeTool === 'select';

  return (
    <div
      ref={layerRef}
      className={`editor-text-layer ${activeTool === 'edit-text' ? 'is-edit-text-active' : ''} ${activeTool === 'replace-area' ? 'is-area-tool-active' : ''}`}
      style={{ pointerEvents: isLayerInteractive ? 'auto' : 'none' }}
      onMouseDown={handleLayerMouseDown}
      onTouchStart={handleLayerMouseDown}
      aria-label="Direct Existing Text Editing Layer"
    >
      {/* 1. Scanned Document Notice Banner */}
      {!isLoadingText && !hasTextContent && (
        <div className="scanned-pdf-notice-pill" role="status">
          <FontAwesomeIcon icon={faInfoCircle} />
          <span>This page is a scanned image with no selectable text. Direct editing requires OCR.</span>
          <button
            type="button"
            className="notice-pill-action-btn"
            onClick={onRequestAreaTool}
            title="Use Replace Area to cover and replace text on this page"
          >
            <FontAwesomeIcon icon={faCropSimple} />
            <span>Use Replace Area</span>
          </button>
        </div>
      )}

      {/* 2. Unified Detected Text Sections & Section Reflow Layer */}
      {liveLayout.map((sec) => {
        const isEditing = activeInlineEdit && (activeInlineEdit.sectionId === sec.id || activeInlineEdit.targetId === sec.id);
        const isSelected = selectedSectionId === sec.id;
        const isHovered = hoveredSectionId === sec.id;

        const effPtX = sec.ptX;
        const effPtY = sec.ptY;
        const effPtWidth = sec.ptWidth;
        const effPtHeight = sec.ptHeight;

        const screenX = Math.round(effPtX * zoom);
        const screenY = Math.round(effPtY * zoom);
        const screenW = Math.max(20, Math.round(effPtWidth * zoom));
        const screenH = Math.max(14, Math.round(effPtHeight * zoom));

        const badgeText = sec.type ? (sec.type.charAt(0).toUpperCase() + sec.type.slice(1)) : 'Section';
        const repl = sec.replacement;
        const isShifted = Math.abs(sec.shiftAmount || 0) > 0.5;

        const fontCss =
          (repl?.fontFamily || sec.fontFamily) === 'Times Roman'
            ? '"Times New Roman", Times, Georgia, serif'
            : (repl?.fontFamily || sec.fontFamily) === 'Courier'
            ? '"Courier New", Courier, monospace'
            : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

        return (
          <React.Fragment key={sec.id}>
            {/* If section is shifted, mask its original position on the PDF canvas to prevent ghosting / duplicate text */}
            {isShifted && (
              <div
                className="pdf-shifted-section-original-mask"
                style={{
                  position: 'absolute',
                  left: `${Math.round(sec.originalPtX * zoom)}px`,
                  top: `${Math.round(sec.originalPtY * zoom)}px`,
                  width: `${Math.round(sec.originalPtWidth * zoom)}px`,
                  height: `${Math.round(sec.originalPtHeight * zoom)}px`,
                  backgroundColor: '#FFFFFF',
                  zIndex: 10,
                  pointerEvents: 'none',
                }}
              />
            )}

            {/* Case A: Committed Section Reflow Text */}
            {sec.isEdited && repl && !isEditing && (
              <div
                className="pdf-section-reflow-block"
                style={{
                  position: 'absolute',
                  left: `${Math.round((repl.coverPtX ?? effPtX) * zoom)}px`,
                  top: `${Math.round((repl.coverPtY ?? effPtY) * zoom)}px`,
                  width: `${Math.round((repl.coverPtWidth ?? effPtWidth) * zoom)}px`,
                  height: `${Math.round((repl.coverPtHeight ?? effPtHeight) * zoom)}px`,
                  backgroundColor: repl.backgroundColor || repl.coverColor || '#FFFFFF',
                  zIndex: 12,
                  pointerEvents: isLayerInteractive ? 'auto' : 'none',
                  cursor: 'pointer',
                  overflow: 'visible',
                }}
                onClick={(e) => handleSectionReflowClick(e, repl)}
                title="Replaced section. Click to edit."
              >
                {Array.isArray(repl.wrappedLines) ? (
                  repl.wrappedLines.map((wl, idx) => {
                    const lineText = typeof wl === 'object' ? wl.text : String(wl);
                    const screenFontSize = Math.max(9, Math.round((repl.fontSize || 14) * zoom));
                    const ascentRatio = getFontAscentRatio(repl.fontFamily);
                    const lineSpacingPt = Number(repl.lineSpacingPt) || ((repl.fontSize || 14) * 1.25);
                    const baseLeft = Math.round(((repl.textStartX !== undefined ? repl.textStartX : (repl.origPtX ?? effPtX)) - (repl.coverPtX ?? effPtX)) * zoom);

                    const lineX = typeof wl === 'object' && wl.ptX !== undefined
                      ? Math.round((wl.ptX - (repl.coverPtX ?? effPtX)) * zoom)
                      : (idx === 0 ? baseLeft : (repl.indentX !== undefined ? Math.round((repl.indentX - (repl.coverPtX ?? effPtX)) * zoom) : baseLeft));
                    const lineBaseline = typeof wl === 'object' && wl.baselinePtY !== undefined
                      ? wl.baselinePtY
                      : (repl.baselinePtY !== undefined ? repl.baselinePtY + idx * lineSpacingPt : null);
                    const lineTop = lineBaseline !== null
                      ? Math.round(((lineBaseline - (repl.coverPtY ?? effPtY)) * zoom) - (ascentRatio * screenFontSize))
                      : Math.round(idx * lineSpacingPt * zoom);

                    return (
                      <div
                        key={idx}
                        className="reflow-wrapped-line"
                        style={{
                          position: 'absolute',
                          left: `${Math.max(0, lineX)}px`,
                          top: `${lineTop}px`,
                          fontFamily: fontCss,
                          fontSize: `${screenFontSize}px`,
                          fontWeight: repl.bold ? 'bold' : 'normal',
                          fontStyle: repl.italic ? 'italic' : 'normal',
                          textDecoration: repl.underline ? 'underline' : 'none',
                          color: repl.color || '#111827',
                          lineHeight: 1,
                          whiteSpace: 'nowrap',
                          letterSpacing: `${(repl.letterSpacing || 0) * zoom}px`,
                          opacity: repl.opacity ?? 1.0,
                          userSelect: 'none',
                        }}
                      >
                        {lineText}
                      </div>
                    );
                  })
                ) : (
                  <div
                    className="section-reflow-content"
                    style={{
                      position: 'absolute',
                      left: `${Math.max(0, Math.round(((repl.textStartX !== undefined ? repl.textStartX : (repl.origPtX ?? effPtX)) - (repl.coverPtX ?? effPtX)) * zoom))}px`,
                      top: 0,
                      fontFamily: fontCss,
                      fontSize: `${Math.max(9, Math.round((repl.fontSize || 14) * zoom))}px`,
                      fontWeight: repl.bold ? 'bold' : 'normal',
                      fontStyle: repl.italic ? 'italic' : 'normal',
                      textDecoration: repl.underline ? 'underline' : 'none',
                      color: repl.color || '#111827',
                      lineHeight: 1,
                      letterSpacing: `${(repl.letterSpacing || 0) * zoom}px`,
                      opacity: repl.opacity ?? 1.0,
                      whiteSpace: 'nowrap',
                      userSelect: 'none',
                    }}
                  >
                    {repl.replacementText}
                  </div>
                )}
              </div>
            )}

            {/* Case B: Shifted Lower Section (Not edited itself, but shifted down to make room for expanded upper section) */}
            {!sec.isEdited && isShifted && !isEditing && (
              <div
                className="pdf-shifted-section-block"
                style={{
                  position: 'absolute',
                  left: `${screenX}px`,
                  top: `${screenY}px`,
                  width: `${screenW}px`,
                  height: `${screenH}px`,
                  backgroundColor: '#FFFFFF',
                  zIndex: 11,
                  pointerEvents: 'none',
                  overflow: 'visible',
                }}
              >
                {Array.isArray(sec.lines) && sec.lines.map((l, lIdx) => {
                  const lineFontSize = Math.max(9, Math.round((l.fontSize || sec.fontSize || 14) * zoom));
                  const lineX = Math.round(((l.ptX !== undefined ? l.ptX : effPtX) - effPtX) * zoom);
                  const lineY = Math.round(((l.ptY !== undefined ? l.ptY : sec.originalPtY) + sec.shiftAmount - effPtY) * zoom);
                  const lineFontCss =
                    (l.fontFamily || sec.fontFamily) === 'Times Roman'
                      ? '"Times New Roman", Times, Georgia, serif'
                      : (l.fontFamily || sec.fontFamily) === 'Courier'
                      ? '"Courier New", Courier, monospace'
                      : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

                  return (
                    <div
                      key={lIdx}
                      style={{
                        position: 'absolute',
                        left: `${Math.max(0, lineX)}px`,
                        top: `${lineY}px`,
                        fontFamily: lineFontCss,
                        fontSize: `${lineFontSize}px`,
                        fontWeight: (l.bold || sec.bold) ? 'bold' : 'normal',
                        fontStyle: (l.italic || sec.italic) ? 'italic' : 'normal',
                        color: l.color || sec.color || '#111827',
                        lineHeight: 1,
                        whiteSpace: 'nowrap',
                        userSelect: 'none',
                      }}
                    >
                      {l.fullOriginalText || (l.words || []).map((w) => w.text).join(' ')}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom margin overflow warning notice if section extends past page bottom */}
            {(sec.overflowsBottom || (repl && repl.overflowsBottom)) && (
              <div
                style={{
                  position: 'absolute',
                  left: `${screenX}px`,
                  top: `${screenY + screenH + 2}px`,
                  fontSize: '10px',
                  fontWeight: 'bold',
                  color: '#b91c1c',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #f87171',
                  borderRadius: '3px',
                  padding: '1px 5px',
                  zIndex: 35,
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                ⚠️ Reaches bottom page margin ({sec.overflowBottomAmount || repl?.overflowBottomAmount || 0}pt overflow)
              </div>
            )}

            {/* Interactive Section Box (iLovePDF Style Experience) */}
            <div
              className={`pdf-detected-section-box ${isSelected ? 'is-selected' : ''} ${isHovered ? 'is-hovered' : ''} ${isEditing ? 'is-editing' : ''}`}
              style={{
                left: `${screenX}px`,
                top: `${screenY}px`,
                width: `${screenW}px`,
                height: `${screenH}px`,
              }}
              onClick={(e) => handleSectionBoxClick(e, sec)}
              onDoubleClick={(e) => handleSectionBoxDoubleClick(e, sec)}
              onMouseEnter={() => setHoveredSectionId(sec.id)}
              onMouseLeave={() => setHoveredSectionId(null)}
              onMouseDown={(e) => handleSectionMouseDown(e, sec)}
              onTouchStart={(e) => handleSectionTouchStart(e, sec)}
              title={`${badgeText}: "${sec.fullOriginalText ? sec.fullOriginalText.slice(0, 60).replace(/\n/g, ' ') : ''}...". Click to select, double-click to edit.`}
            >
              {/* Type badge on hover or selection */}
              {(isSelected || isHovered) && !isEditing && (
                <span className="pdf-section-type-badge">{badgeText}</span>
              )}

              {/* Floating action bar on selection */}
              {isSelected && !isEditing && (
                <div className="pdf-section-floating-toolbar" onMouseDown={(e) => e.stopPropagation()}>
                  <span className="pdf-section-drag-grip" title="Drag to move section">
                    <FontAwesomeIcon icon={faArrowsUpDownLeftRight} />
                  </span>
                  <button
                    type="button"
                    className="section-action-btn edit-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectSectionForEdit(sec, sec.type || 'paragraph');
                    }}
                    title="Edit text (or double-click)"
                  >
                    <FontAwesomeIcon icon={faPen} />
                    <span>Edit</span>
                  </button>
                </div>
              )}

              {/* 8 Resize Handles on selection */}
              {isSelected && !isEditing && (
                <>
                  <div className="text-editor-resize-handle handle-nw" onMouseDown={(e) => startSectionResize(e, sec, 'nw')} onTouchStart={(e) => startSectionResize(e, sec, 'nw')} />
                  <div className="text-editor-resize-handle handle-n" onMouseDown={(e) => startSectionResize(e, sec, 'n')} onTouchStart={(e) => startSectionResize(e, sec, 'n')} />
                  <div className="text-editor-resize-handle handle-ne" onMouseDown={(e) => startSectionResize(e, sec, 'ne')} onTouchStart={(e) => startSectionResize(e, sec, 'ne')} />
                  <div className="text-editor-resize-handle handle-e" onMouseDown={(e) => startSectionResize(e, sec, 'e')} onTouchStart={(e) => startSectionResize(e, sec, 'e')} />
                  <div className="text-editor-resize-handle handle-se" onMouseDown={(e) => startSectionResize(e, sec, 'se')} onTouchStart={(e) => startSectionResize(e, sec, 'se')} />
                  <div className="text-editor-resize-handle handle-s" onMouseDown={(e) => startSectionResize(e, sec, 's')} onTouchStart={(e) => startSectionResize(e, sec, 's')} />
                  <div className="text-editor-resize-handle handle-sw" onMouseDown={(e) => startSectionResize(e, sec, 'sw')} onTouchStart={(e) => startSectionResize(e, sec, 'sw')} />
                  <div className="text-editor-resize-handle handle-w" onMouseDown={(e) => startSectionResize(e, sec, 'w')} onTouchStart={(e) => startSectionResize(e, sec, 'w')} />
                </>
              )}
            </div>
          </React.Fragment>
        );
      })}

      {/* 3. Detected Existing Word Tokens (Hide tokens that already have replacements or are in edit) */}
      {lines.flatMap((l) => l.words).map((w) => {
        // Hide the clickable token if this word is already replaced or currently in active editing
        if (replacedTargetIds.has(w.id)) return null;
        if (
          activeInlineEdit &&
          (activeInlineEdit.id === w.id ||
            activeInlineEdit.targetId === w.id ||
            activeInlineEdit.sectionId === w.sectionId)
        )
          return null;

        const screenX = Math.round(w.ptX * zoom);
        const screenY = Math.round(w.ptY * zoom);
        const screenW = Math.round(w.ptWidth * zoom);
        const screenH = Math.round(w.ptHeight * zoom);

        return (
          <span
            key={w.id}
            className="pdf-word-token"
            style={{
              left: `${screenX}px`,
              top: `${screenY}px`,
              width: `${screenW}px`,
              height: `${screenH}px`,
            }}
            onMouseEnter={() => handleTokenMouseEnter(w)}
            onMouseLeave={handleTokenMouseLeave}
            onClick={(e) => handleTokenClick(e, w)}
            onDoubleClick={(e) => handleTokenDoubleClick(e, w)}
            onMouseDown={(e) => handleTokenMouseDown(e, w)}
            onTouchStart={(e) => handleTokenTouchStart(e, w)}
            title={`Word: "${w.text}". Click or double-click to edit.`}
          />
        );
      })}

      {/* 3B. Live Drag Selection Highlights across words / lines in paragraph */}
      {dragSelection &&
        dragSelection.selectedWords &&
        dragSelection.selectedWords.map((sw) => (
          <div
            key={`drag_hi_${sw.id}`}
            className="text-drag-selection-highlight"
            style={{
              left: `${Math.round(sw.ptX * zoom)}px`,
              top: `${Math.round(sw.ptY * zoom)}px`,
              width: `${Math.round(sw.ptWidth * zoom)}px`,
              height: `${Math.round(sw.ptHeight * zoom)}px`,
            }}
          />
        ))}

      {/* 4. Non-Section PDF Text Replacements (Line Reflow, Word & Area Replacements) */}
      {pageReplacements
        .filter((repl) => repl.type !== 'section_reflow')
        .map((repl) => {
          // Case B: Line Reflow Block Rendering
          if (repl.reflowLine && Array.isArray(repl.reflowLine.reflowWords)) {
          const coverLeft = Math.round((repl.coverPtX ?? repl.ptX) * zoom);
          const coverTop = Math.round((repl.coverPtY ?? repl.ptY) * zoom);
          const coverWidth = Math.round((repl.coverPtWidth ?? repl.ptWidth) * zoom);
          const coverHeight = Math.round((repl.coverPtHeight ?? repl.ptHeight) * zoom);

          return (
            <div
              key={repl.id}
              className="pdf-line-reflow-block"
              style={{
                position: 'absolute',
                left: `${coverLeft}px`,
                top: `${coverTop}px`,
                width: `${coverWidth}px`,
                height: `${coverHeight}px`,
                backgroundColor: repl.coverColor || '#FFFFFF',
                zIndex: 12,
                pointerEvents: isLayerInteractive ? 'auto' : 'none',
              }}
            >
              {repl.reflowLine.reflowWords.map((rw) => {
                // If this word is actively being edited, don't show static text
                if (activeInlineEdit && activeInlineEdit.targetId === rw.id) {
                  return null;
                }

                const wordLeft = Math.round((rw.reflowPtX - (repl.coverPtX ?? repl.ptX)) * zoom);
                const wordAscentRatio = getFontAscentRatio(rw.fontFamily);
                const wordFontSize = Math.max(9, Math.round((rw.fontSize || 14) * zoom));
                const wordBaseline = rw.baselinePtY !== undefined
                  ? rw.baselinePtY
                  : (repl.baselinePtY !== undefined
                    ? repl.baselinePtY
                    : ((repl.reflowLine?.ptY ?? repl.ptY) + (rw.fontSize || 14) * wordAscentRatio));
                const wordTop = Math.round(((wordBaseline - (repl.coverPtY ?? repl.ptY)) * zoom) - (wordAscentRatio * wordFontSize));
                const fontCss =
                  rw.fontFamily === 'Times Roman'
                    ? '"Times New Roman", Times, Georgia, serif'
                    : rw.fontFamily === 'Courier'
                    ? '"Courier New", Courier, monospace'
                    : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

                return (
                  <span
                    key={rw.id}
                    className="pdf-reflow-word"
                    style={{
                      left: `${wordLeft}px`,
                      top: `${wordTop}px`,
                      fontFamily: fontCss,
                      fontSize: `${wordFontSize}px`,
                      fontWeight: rw.bold ? 'bold' : 'normal',
                      fontStyle: rw.italic ? 'italic' : 'normal',
                      textDecoration: rw.underline ? 'underline' : 'none',
                      color: rw.color || '#111827',
                      lineHeight: 1,
                    }}
                    onClick={(e) => handleReflowWordClick(e, rw, repl)}
                    title={`Word: "${rw.text}". Click to edit.`}
                  >
                    {rw.text}
                  </span>
                );
              })}

              {/* Boundary Overflow Warning Badge */}
              {repl.overflowsBoundary && (
                <span
                  className="pdf-reflow-overflow-badge"
                  title={repl.overflowWarning || 'Line reflow extends beyond page margins'}
                >
                  ⚠️ Exceeds margin (+{repl.overflowAmount}pt)
                </span>
              )}
            </div>
          );
        }

        // Case C: Standard Single-Word or Area Replacement Block Rendering
        const isBeingEdited = activeInlineEdit && (activeInlineEdit.id === repl.id || activeInlineEdit.targetId === repl.targetId);
        if (isBeingEdited) return null;

        const coverLeft = Math.round((repl.coverPtX ?? repl.ptX) * zoom);
        const coverTop = Math.round((repl.coverPtY ?? repl.ptY) * zoom);
        const coverWidth = Math.round((repl.coverPtWidth ?? repl.ptWidth) * zoom);
        const coverHeight = Math.round((repl.coverPtHeight ?? repl.ptHeight) * zoom);

        const screenFontSize = Math.max(9, Math.round((repl.fontSize || 14) * zoom));
        const ascentRatio = getFontAscentRatio(repl.fontFamily);
        const fontCss =
          repl.fontFamily === 'Times Roman'
            ? '"Times New Roman", Times, Georgia, serif'
            : repl.fontFamily === 'Courier'
            ? '"Courier New", Courier, monospace'
            : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

        const textLeft = Math.round(((repl.origPtX ?? repl.ptX) - (repl.coverPtX ?? repl.ptX)) * zoom);
        const exactTextTop = repl.baselinePtY !== undefined
          ? Math.round(((repl.baselinePtY - (repl.coverPtY ?? repl.ptY)) * zoom) - (ascentRatio * screenFontSize))
          : Math.round(((repl.origPtY ?? repl.ptY) - (repl.coverPtY ?? repl.ptY)) * zoom);

        return (
          <div
            key={repl.id}
            className="pdf-replacement-block"
            style={{
              position: 'absolute',
              left: `${coverLeft}px`,
              top: `${coverTop}px`,
              width: `${coverWidth}px`,
              height: `${coverHeight}px`,
              backgroundColor: repl.coverColor || '#FFFFFF',
              zIndex: 12,
              pointerEvents: isLayerInteractive ? 'auto' : 'none',
              overflow: 'visible',
            }}
            onClick={(e) => handleReplacementClick(e, repl)}
            onDoubleClick={(e) => handleReplacementClick(e, repl)}
            title={`Replaced: "${repl.originalText}" → "${repl.replacementText}". Click to edit.`}
          >
            {Array.isArray(repl.wrappedLines) && repl.wrappedLines.length > 1 ? (
              repl.wrappedLines.map((wl, idx) => {
                const lineText = typeof wl === 'object' ? wl.text : String(wl);
                const lineLeft = typeof wl === 'object' && wl.ptX !== undefined
                  ? Math.round((wl.ptX - (repl.coverPtX ?? repl.ptX)) * zoom)
                  : (idx === 0 ? textLeft : Math.round(((repl.indentX || repl.origPtX) - (repl.coverPtX ?? repl.ptX)) * zoom));
                const lineBaseline = typeof wl === 'object' && wl.baselinePtY !== undefined
                  ? wl.baselinePtY
                  : (repl.baselinePtY !== undefined
                    ? repl.baselinePtY + idx * (repl.lineSpacingPt || (repl.fontSize || 14) * 1.25)
                    : null);
                const lineTop = lineBaseline !== null
                  ? Math.round(((lineBaseline - (repl.coverPtY ?? repl.ptY)) * zoom) - (ascentRatio * screenFontSize))
                  : exactTextTop + idx * Math.round((repl.fontSize || 14) * 1.25 * zoom);

                return (
                  <div
                    key={idx}
                    className="reflow-wrapped-line"
                    style={{
                      position: 'absolute',
                      left: `${Math.max(0, lineLeft)}px`,
                      top: `${lineTop}px`,
                      fontFamily: fontCss,
                      fontSize: `${screenFontSize}px`,
                      fontWeight: repl.bold ? 'bold' : 'normal',
                      fontStyle: repl.italic ? 'italic' : 'normal',
                      textDecoration: repl.underline ? 'underline' : 'none',
                      color: repl.color || '#111827',
                      lineHeight: 1,
                      whiteSpace: 'nowrap',
                      overflow: 'visible',
                    }}
                  >
                    {lineText}
                  </div>
                );
              })
            ) : (
              <span
                className="pdf-replacement-text-content"
                style={{
                  position: 'absolute',
                  left: `${Math.max(0, textLeft)}px`,
                  top: `${exactTextTop}px`,
                  fontFamily: fontCss,
                  fontSize: `${screenFontSize}px`,
                  fontWeight: repl.bold ? 'bold' : 'normal',
                  fontStyle: repl.italic ? 'italic' : 'normal',
                  textDecoration: repl.underline ? 'underline' : 'none',
                  color: repl.color || '#111827',
                  lineHeight: 1,
                  whiteSpace: Array.isArray(repl.wrappedLines) && repl.wrappedLines.length > 1 ? 'pre-wrap' : 'nowrap',
                  wordBreak: 'normal',
                  overflowWrap: 'normal',
                  hyphens: 'none',
                  overflow: 'visible',
                  userSelect: 'none',
                }}
              >
                {repl.replacementText}
              </span>
            )}
          </div>
        );
      })}

      {/* 5. Direct Word-Style Inline Text Editor (Transparent background, subtle selection outline & 8 resize handles) */}
      {activeInlineEdit && (() => {
        const isSingleWord = activeInlineEdit.selectionLevel === 'word';
        const currentTypedText = activeInlineEdit.replacementText !== undefined
          ? activeInlineEdit.replacementText
          : (activeInlineEdit.originalText || '');
        const textLines = String(currentTypedText).split('\n');

        // Measure maximum line width of text currently entered
        const maxTypedLineWidth = Math.max(
          0,
          ...textLines.map((lineStr) =>
            measureTextWidth(
              lineStr,
              activeInlineEdit.fontFamily,
              activeInlineEdit.fontSize,
              activeInlineEdit.bold,
              activeInlineEdit.italic
            )
          )
        );

        const screenFontSize = Math.max(10, Math.round((activeInlineEdit.fontSize || 14) * zoom));
        const ascentRatio = getFontAscentRatio(activeInlineEdit.fontFamily);
        const requiredLineHeight = Math.ceil(screenFontSize * (activeInlineEdit.lineHeight || 1.25));

        // Available horizontal space up to the right boundary of the page
        const maxAllowedW = Math.max(40, pagePtWidth - activeInlineEdit.ptX - 24);

        // Dynamically calculate editor width as user types:
        // For section editing, strictly constrain editor width to the box's available width
        // so text wraps naturally onto the next line instead of spilling horizontally
        const boxAvailableWidth = activeInlineEdit.availableWidth || activeInlineEdit.ptWidth || 200;
        const editorWidth = isSingleWord
          ? Math.min(maxAllowedW, Math.max(activeInlineEdit.ptWidth || 40, maxTypedLineWidth + 18))
          : Math.min(maxAllowedW, Math.max(30, boxAvailableWidth));

        // Calculate dynamic height when wrapping or multiple lines occur
        const wrappedPreviewLines = wrapTextLines(
          currentTypedText,
          activeInlineEdit.fontFamily,
          activeInlineEdit.fontSize,
          editorWidth,
          activeInlineEdit.bold,
          activeInlineEdit.italic
        );
        const effectiveLineCount = Math.max(1, wrappedPreviewLines.length);
        const isSingleLine = effectiveLineCount <= 1;
        const editorMinHeight = Math.max(
          requiredLineHeight + 4,
          Math.round(effectiveLineCount * requiredLineHeight + 6),
          Math.round((activeInlineEdit.ptHeight || 16) * zoom) + 4
        );

        // Baseline-anchored vertical positioning:
        // Position the editor container so that the first line of text inside the textarea
        // lands at the EXACT baseline of original PDF text!
        const targetBaselinePx = activeInlineEdit.baselinePtY !== undefined
          ? Math.round(activeInlineEdit.baselinePtY * zoom)
          : Math.round((activeInlineEdit.ptY + (activeInlineEdit.fontSize || 14) * ascentRatio) * zoom);
        const lineLeading = isSingleLine ? 0 : Math.round((requiredLineHeight - screenFontSize) / 2);
        const editorTopPx = targetBaselinePx - Math.round(ascentRatio * screenFontSize) - lineLeading;

        const hasEditedText = activeInlineEdit.replacementText !== undefined && activeInlineEdit.replacementText !== activeInlineEdit.originalText;

        return (
          <div
            key={activeInlineEdit.id}
            className="direct-inline-editor-wrapper word-style-editor-wrapper"
            style={{
              position: 'absolute',
              left: `${Math.round(activeInlineEdit.ptX * zoom)}px`,
              top: `${editorTopPx}px`,
              width: `${Math.round(editorWidth * zoom)}px`,
              minHeight: `${editorMinHeight}px`,
              zIndex: 40,
              background: 'transparent',
              outline: '1.5px solid #2563eb',
              borderRadius: '2px',
              boxShadow: '0 0 0 1px rgba(37, 99, 235, 0.25)',
              boxSizing: 'border-box',
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Solid clean background to completely mask and hide original PDF text while editing */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: activeInlineEdit.backgroundColor || '#FFFFFF',
                opacity: 1.0,
                zIndex: 1,
                pointerEvents: 'none',
                borderRadius: '1px',
              }}
            />

            <textarea
              ref={inlineInputRef}
              className="direct-inline-textarea word-style-inline-textarea"
              rows={1}
              style={{
                position: 'relative',
                zIndex: 2,
                width: '100%',
                minHeight: `${editorMinHeight}px`,
                fontSize: `${screenFontSize}px`,
                fontWeight: activeInlineEdit.bold ? 'bold' : 'normal',
                fontStyle: activeInlineEdit.italic ? 'italic' : 'normal',
                textDecoration: activeInlineEdit.underline ? 'underline' : 'none',
                color: activeInlineEdit.color || '#111827',
                textAlign: activeInlineEdit.align || 'left',
                lineHeight: isSingleLine ? 1 : `${requiredLineHeight}px`,
                letterSpacing: `${(activeInlineEdit.letterSpacing || 0) * zoom}px`,
                opacity: activeInlineEdit.opacity ?? 1.0,
                fontFamily:
                  activeInlineEdit.fontFamily === 'Times Roman'
                    ? '"Times New Roman", Times, Georgia, Cambria, serif'
                    : activeInlineEdit.fontFamily === 'Courier'
                    ? '"Courier New", Courier, monospace'
                    : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
                backgroundColor: 'transparent',
                resize: 'none',
                overflow: 'visible',
                whiteSpace: 'pre-wrap',
                wordBreak: 'normal',
                overflowWrap: 'break-word',
                hyphens: 'none',
                boxSizing: 'border-box',
                padding: '0 3px',
                margin: 0,
                border: 'none',
                outline: 'none',
              }}
              value={activeInlineEdit.replacementText ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                setActiveInlineEdit((prev) =>
                  prev ? { ...prev, replacementText: val, currentVal: val } : null
                );
                if (typeof onUpdateActiveTextEdit === 'function') {
                  onUpdateActiveTextEdit({ replacementText: val });
                }

                // Auto-expand textarea height
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.max(editorMinHeight, e.target.scrollHeight)}px`;
              }}
              onBlur={(e) => {
                if (isActionClickedRef.current || resizeRef.current) {
                  isActionClickedRef.current = false;
                  return;
                }
                if (
                  e.relatedTarget &&
                  (e.relatedTarget.closest('.direct-inline-floating-toolbar') ||
                    e.relatedTarget.closest('.direct-inline-actions-row') ||
                    e.relatedTarget.closest('.editor-properties-panel') ||
                    e.relatedTarget.closest('.editor-right-properties') ||
                    e.relatedTarget.closest('.text-editor-resize-handle'))
                ) {
                  return;
                }
                handleCommitInlineEdit();
              }}
              onKeyDown={(e) => {
                const isSingleWordMode = activeInlineEdit.selectionLevel === 'word';
                const isLineOrHeading =
                  activeInlineEdit.selectionLevel === 'line' ||
                  activeInlineEdit.selectionLevel === 'heading' ||
                  activeInlineEdit.selectionLevel === 'subtitle' ||
                  activeInlineEdit.selectionLevel === 'bullet';

                if (e.key === 'Escape') {
                  e.preventDefault();
                  handleCancelInlineEdit();
                } else if (e.key === 'Enter') {
                  if (isSingleWordMode) {
                    e.preventDefault();
                    handleCommitInlineEdit();
                  } else if (isLineOrHeading && !e.shiftKey) {
                    e.preventDefault();
                    handleCommitInlineEdit();
                  } else if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    handleCommitInlineEdit();
                  }
                }
              }}
              placeholder="Type replacement text..."
            />

            {/* 8-point Interactive Resize Handles (Requirement 3) */}
            <div
              className={`text-editor-resize-handle handle-nw ${isSingleWord ? 'word-level-handle' : ''}`}
              onMouseDown={(e) => handleResizeStart(e, 'nw')}
              onTouchStart={(e) => handleResizeStart(e, 'nw')}
              title="Resize Top-Left"
            />
            <div
              className={`text-editor-resize-handle handle-n ${isSingleWord ? 'word-level-handle' : ''}`}
              onMouseDown={(e) => handleResizeStart(e, 'n')}
              onTouchStart={(e) => handleResizeStart(e, 'n')}
              title="Resize Top"
            />
            <div
              className={`text-editor-resize-handle handle-ne ${isSingleWord ? 'word-level-handle' : ''}`}
              onMouseDown={(e) => handleResizeStart(e, 'ne')}
              onTouchStart={(e) => handleResizeStart(e, 'ne')}
              title="Resize Top-Right"
            />
            <div
              className={`text-editor-resize-handle handle-e ${isSingleWord ? 'word-level-handle' : ''}`}
              onMouseDown={(e) => handleResizeStart(e, 'e')}
              onTouchStart={(e) => handleResizeStart(e, 'e')}
              title="Resize Width"
            />
            <div
              className={`text-editor-resize-handle handle-se ${isSingleWord ? 'word-level-handle' : ''}`}
              onMouseDown={(e) => handleResizeStart(e, 'se')}
              onTouchStart={(e) => handleResizeStart(e, 'se')}
              title="Resize Bottom-Right"
            />
            <div
              className={`text-editor-resize-handle handle-s ${isSingleWord ? 'word-level-handle' : ''}`}
              onMouseDown={(e) => handleResizeStart(e, 's')}
              onTouchStart={(e) => handleResizeStart(e, 's')}
              title="Resize Height"
            />
            <div
              className={`text-editor-resize-handle handle-sw ${isSingleWord ? 'word-level-handle' : ''}`}
              onMouseDown={(e) => handleResizeStart(e, 'sw')}
              onTouchStart={(e) => handleResizeStart(e, 'sw')}
              title="Resize Bottom-Left"
            />
            <div
              className={`text-editor-resize-handle handle-w ${isSingleWord ? 'word-level-handle' : ''}`}
              onMouseDown={(e) => handleResizeStart(e, 'w')}
              onTouchStart={(e) => handleResizeStart(e, 'w')}
              title="Resize Left"
            />
          </div>
        );
      })()}

      {/* 6. Separate Floating Toolbar for Apply, Cancel, Revert (Requirement 1) */}
      {activeInlineEdit && (() => {
        const tbPos = computeFloatingToolbarPosition();
        const canRevert = !!(
          activeInlineEdit.isExistingReplacement ||
          (Array.isArray(activeInlineEdit.history) && activeInlineEdit.history.length > 0) ||
          (activeInlineEdit.wordHistories && activeInlineEdit.wordHistories[activeInlineEdit.targetId]?.length > 0)
        );

        return (
          <div
            className="direct-inline-floating-toolbar"
            style={{
              position: 'absolute',
              left: `${tbPos.left}px`,
              top: `${tbPos.top}px`,
              zIndex: 65,
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <button
              type="button"
              className="inline-action-btn apply-btn"
              onMouseDown={(e) => {
                e.preventDefault();
                isActionClickedRef.current = true;
              }}
              onClick={handleCommitInlineEdit}
              title="Apply change (Enter or Ctrl+Enter)"
            >
              <FontAwesomeIcon icon={faCheck} />
              <span>Apply</span>
            </button>
            <button
              type="button"
              className="inline-action-btn cancel-btn"
              onMouseDown={(e) => {
                e.preventDefault();
                isActionClickedRef.current = true;
              }}
              onClick={handleCancelInlineEdit}
              title="Cancel change (Esc)"
            >
              <FontAwesomeIcon icon={faXmark} />
              <span>Cancel</span>
            </button>
            <button
              type="button"
              className={`inline-action-btn revert-btn ${!canRevert ? 'is-disabled' : ''}`}
              disabled={!canRevert}
              onMouseDown={(e) => {
                e.preventDefault();
                if (canRevert) isActionClickedRef.current = true;
              }}
              onClick={handleRevertInlineEdit}
              title={
                canRevert
                  ? "Revert most recent applied edit (steps back through earlier versions to original PDF text)"
                  : "No applied edits to revert"
              }
            >
              <FontAwesomeIcon icon={faRotateLeft} />
              <span>Revert</span>
            </button>
          </div>
        );
      })()}

      {/* 5. Live Marquee Selection Rectangle for Replace Area Tool */}
      {marquee && marquee.isDragging && (
        <div
          className="marquee-selection-box"
          style={{
            left: `${Math.min(marquee.startX, marquee.currentX)}px`,
            top: `${Math.min(marquee.startY, marquee.currentY)}px`,
            width: `${Math.abs(marquee.currentX - marquee.startX)}px`,
            height: `${Math.abs(marquee.currentY - marquee.startY)}px`,
          }}
        >
          <span className="marquee-dimensions-tag">
            {Math.round(Math.abs(marquee.currentX - marquee.startX) / zoom)} ×{' '}
            {Math.round(Math.abs(marquee.currentY - marquee.startY) / zoom)} pt
          </span>
        </div>
      )}
    </div>
  );
}
