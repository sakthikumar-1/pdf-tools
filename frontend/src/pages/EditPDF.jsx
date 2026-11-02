import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faPenToSquare,
  faFont,
  faPen,
  faShapes,
  faShieldHalved,
  faCircleCheck,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

import UploadBox from '../components/UploadBox';
import EditorToolbar from '../components/editor/EditorToolbar';
import EditorSidebar from '../components/editor/EditorSidebar';
import EditorCanvas from '../components/editor/EditorCanvas';
import EditorPropertiesPanel from '../components/editor/EditorPropertiesPanel';
import EditorReplaceModal from '../components/editor/EditorReplaceModal';
import EditorFindReplace from '../components/editor/EditorFindReplace';

import { useFileUpload } from '../hooks/useFileUpload';
import { pdfjsLib } from '../utils/pdfjsConfig';
import { readPdfMetadata, editPdfMetadata } from '../utils/pdfProcessor';
import { downloadFile } from '../utils/fileUtils';
import { detectPageFormat } from '../utils/editorCoordinates';
import { exportEditedPdf } from '../utils/editorPdfExporter';
import { calculateSectionReflow, calculateLineReflow, calculateWordReplacement } from '../utils/editorReflow';

import './EditPDF.css';

export default function EditPDF() {
  const {
    file,
    error,
    selectFile,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    reset,
    setError,
  } = useFileUpload();

  // Document state
  const [pdfDocProxy, setPdfDocProxy] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1); // 1-based
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);

  // Zoom state
  const [zoom, setZoom] = useState(1.0); // 1.0 = 100%
  const viewportContainerRef = useRef(null);
  const isInitialZoomSetRef = useRef(false);

  // Geometry of active page
  const [pageGeometry, setPageGeometry] = useState(null);

  // Thumbnails array: [{ pageNumber, dataUrl, width, height, format }]
  const [thumbnails, setThumbnails] = useState([]);

  // Panel visibility
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(true);

  // Active tool mode ('select' | 'text' | 'draw' | 'highlight' | 'shapes' | 'image' | 'whiteout')
  const [activeTool, setActiveTool] = useState('select');

  // ==========================================================================
  // PHASE 2A & 2B: TEXT BOXES & EXISTING TEXT REPLACEMENTS WITH UNDO/REDO
  // ==========================================================================
  const [textBoxes, setTextBoxes] = useState([]); // User-added floating text boxes
  const [textReplacements, setTextReplacements] = useState([]); // Existing PDF text visual replacements
  const [selectedTextBoxId, setSelectedTextBoxId] = useState(null);

  // Synchronous live refs to guarantee export, history & download handlers NEVER read stale closures
  const textBoxesRef = useRef(textBoxes);
  textBoxesRef.current = textBoxes;

  const textReplacementsRef = useRef(textReplacements);
  textReplacementsRef.current = textReplacements;

  const fileRef = useRef(file);
  fileRef.current = file;

  const isExportingRef = useRef(false);

  // Undo / Redo history stack: holds snapshots of { textBoxes, textReplacements }
  const [history, setHistory] = useState([{ textBoxes: [], textReplacements: [] }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const pushHistory = useCallback((nextState) => {
    // Standardize state object using live refs if not provided
    const snapshot = Array.isArray(nextState)
      ? { textBoxes: nextState, textReplacements: textReplacementsRef.current }
      : {
          textBoxes: nextState.textBoxes ?? textBoxesRef.current,
          textReplacements: nextState.textReplacements ?? textReplacementsRef.current,
        };

    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      const updated = [...sliced, snapshot];
      if (updated.length > 35) {
        updated.shift();
      }
      return updated;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 34));
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const targetIdx = historyIndex - 1;
      setHistoryIndex(targetIdx);
      const targetState = history[targetIdx] || { textBoxes: [], textReplacements: [] };
      const nextBoxes = Array.isArray(targetState) ? targetState : (targetState.textBoxes || []);
      const nextRepls = Array.isArray(targetState) ? [] : (targetState.textReplacements || []);
      textBoxesRef.current = nextBoxes;
      textReplacementsRef.current = nextRepls;
      setTextBoxes(nextBoxes);
      setTextReplacements(nextRepls);
    }
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const targetIdx = historyIndex + 1;
      setHistoryIndex(targetIdx);
      const targetState = history[targetIdx] || { textBoxes: [], textReplacements: [] };
      const nextBoxes = Array.isArray(targetState) ? targetState : (targetState.textBoxes || []);
      const nextRepls = Array.isArray(targetState) ? [] : (targetState.textReplacements || []);
      textBoxesRef.current = nextBoxes;
      textReplacementsRef.current = nextRepls;
      setTextBoxes(nextBoxes);
      setTextReplacements(nextRepls);
    }
  }, [historyIndex, history]);

  // Metadata state
  const [metadata, setMetadata] = useState(null);
  const [isReadingMetadata, setIsReadingMetadata] = useState(false);
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);
  const [metadataSaved, setMetadataSaved] = useState(false);

  // Text Replacement Modal state (Phase 2B)
  const [replacementModalData, setReplacementModalData] = useState(null);
  const [isReplacementModalOpen, setIsReplacementModalOpen] = useState(false);

  // Export & Download state (Phase 2C)
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Find and Replace state
  const [isFindOpen, setIsFindOpen] = useState(false);

  // Section-based Selection Scope for Edit Text: 'word' | 'line' | 'heading' | 'subtitle' | 'paragraph'
  const [selectionLevel, setSelectionLevel] = useState('word');

  // Active Existing Text Editing Session (synchronized between canvas and properties panel)
  const [activeTextEdit, setActiveTextEdit] = useState(null);
  const activeTextEditRef = useRef(null);
  useEffect(() => {
    activeTextEditRef.current = activeTextEdit;
  }, [activeTextEdit]);

  // Toast notification for user feedback
  const [toastMessage, setToastMessage] = useState(null);
  const toastTimeoutRef = useRef(null);

  const showToast = useCallback((msg) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  }, []);

  // Manage body class to lock wrapper and hide global footer while in editor mode
  useEffect(() => {
    if (file) {
      document.body.classList.add('hide-global-footer-for-editor');
    } else {
      document.body.classList.remove('hide-global-footer-for-editor');
    }
    return () => {
      document.body.classList.remove('hide-global-footer-for-editor');
    };
  }, [file]);

  // Reset auto-zoom flag when file changes
  useEffect(() => {
    isInitialZoomSetRef.current = false;
  }, [file]);

  // Responsive sidebar/properties collapse on small screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsPropertiesOpen(false);
      }
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 1. Load PDF Document and initialize state
  useEffect(() => {
    if (!file) {
      if (pdfDocProxy) {
        try { pdfDocProxy.destroy(); } catch (_) {}
        setPdfDocProxy(null);
      }
      setTotalPages(0);
      setCurrentPage(1);
      setThumbnails([]);
      setMetadata(null);
      setTextBoxes([]);
      setSelectedTextBoxId(null);
      setHistory([[]]);
      setHistoryIndex(0);
      return;
    }

    let isMounted = true;

    const loadDocument = async () => {
      try {
        setIsLoadingPdf(true);
        setError(null);
        setMetadataSaved(false);

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (!isMounted) return;

        setPdfDocProxy(pdf);
        const count = pdf.numPages;
        setTotalPages(count);
        setCurrentPage(1);
        setIsLoadingPdf(false);

        // Read metadata in parallel
        setIsReadingMetadata(true);
        readPdfMetadata(file)
          .then((meta) => {
            if (isMounted && meta) setMetadata(meta);
          })
          .catch((mErr) => {
            console.warn('[EditPDF Metadata Read Warning]:', mErr);
          })
          .finally(() => {
            if (isMounted) setIsReadingMetadata(false);
          });

        // Progressive thumbnail generation in the background
        const loadedThumbs = [];
        for (let i = 1; i <= count; i++) {
          if (!isMounted) return;
          try {
            const page = await pdf.getPage(i);
            const unscaled = page.getViewport({ scale: 1.0 });
            const format = detectPageFormat(unscaled.width, unscaled.height);

            // Thumbnail scale: 0.22 creates lightweight previews
            const thumbViewport = page.getViewport({ scale: 0.22 });
            const thumbCanvas = document.createElement('canvas');
            const thumbCtx = thumbCanvas.getContext('2d');
            thumbCanvas.width = Math.floor(thumbViewport.width);
            thumbCanvas.height = Math.floor(thumbViewport.height);

            thumbCtx.fillStyle = '#FFFFFF';
            thumbCtx.fillRect(0, 0, thumbCanvas.width, thumbCanvas.height);

            await page.render({
              canvasContext: thumbCtx,
              viewport: thumbViewport,
            }).promise;

            loadedThumbs.push({
              pageNumber: i,
              dataUrl: thumbCanvas.toDataURL('image/jpeg', 0.8),
              width: thumbViewport.width,
              height: thumbViewport.height,
              format,
            });

            if (isMounted) {
              setThumbnails([...loadedThumbs]);
            }
          } catch (tErr) {
            console.warn(`[EditPDF] Thumbnail error on page ${i}:`, tErr);
          }
        }
      } catch (err) {
        console.error('[EditPDF Document Load Error]:', err);
        if (isMounted) {
          setError('Failed to open PDF document. The file might be encrypted, damaged, or corrupted.');
          setIsLoadingPdf(false);
        }
      }
    };

    loadDocument();

    return () => {
      isMounted = false;
    };
  }, [file, setError]);

  // Handle active page geometry updates from canvas
  const handlePageGeometryLoaded = useCallback((geo) => {
    setPageGeometry(geo);
    // On mobile / small tablet screens (< 900px), automatically fit page width on initial load
    if (!isInitialZoomSetRef.current && typeof window !== 'undefined' && window.innerWidth < 900 && viewportContainerRef.current && geo?.widthPt) {
      isInitialZoomSetRef.current = true;
      const padding = window.innerWidth <= 600 ? 16 : 32;
      const containerW = viewportContainerRef.current.clientWidth - padding;
      if (containerW > 0) {
        const fitScale = Math.max(0.25, Math.min(2.5, Math.round((containerW / geo.widthPt) * 100) / 100));
        setZoom(fitScale);
      }
    }
  }, []);

  // Zoom controls
  const handleZoomIn = () => {
    setZoom((prev) => Math.min(3.0, Math.round((prev + 0.15) * 100) / 100));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(0.25, Math.round((prev - 0.15) * 100) / 100));
  };

  const handleZoomSelect = (val) => {
    setZoom(val);
  };

  const handleFitPage = () => {
    if (!viewportContainerRef.current || !pageGeometry?.widthPt) {
      setZoom(1.0);
      return;
    }
    const padding = typeof window !== 'undefined' && window.innerWidth <= 600 ? 16 : 48;
    const containerW = viewportContainerRef.current.clientWidth - padding;
    const containerH = viewportContainerRef.current.clientHeight - padding;
    const scaleW = containerW / pageGeometry.widthPt;
    const scaleH = containerH / pageGeometry.heightPt;
    const fitScale = Math.min(scaleW, scaleH);
    const clamped = Math.max(0.25, Math.min(3.0, Math.round(fitScale * 100) / 100));
    setZoom(clamped);
  };

  const handleFitWidth = () => {
    if (!viewportContainerRef.current || !pageGeometry?.widthPt) {
      setZoom(1.0);
      return;
    }
    const containerW = viewportContainerRef.current.clientWidth - 48;
    const fitScale = containerW / pageGeometry.widthPt;
    const clamped = Math.max(0.25, Math.min(3.0, Math.round(fitScale * 100) / 100));
    setZoom(clamped);
  };

  // Tool selection handler
  const handleSelectTool = (toolId, disabledMessage) => {
    if (disabledMessage) {
      showToast(disabledMessage);
    } else {
      setActiveTool(toolId);
    }
  };

  // ==========================================================================
  // TEXT BOX CRUD & SELECTION HANDLERS
  // ==========================================================================
  const handleCreateTextBox = useCallback((newBox) => {
    setTextBoxes((prev) => {
      const next = [...prev, newBox];
      textBoxesRef.current = next;
      pushHistory({ textBoxes: next, textReplacements: textReplacementsRef.current });
      return next;
    });
    setSelectedTextBoxId(newBox.id);
    setActiveTool('select'); // return to select tool so clicking around doesn't spawn more boxes
    if (window.innerWidth >= 1024) {
      setIsPropertiesOpen(true);
    }
    showToast('Text box created. Type your content or format on the right panel.');
  }, [pushHistory, showToast]);

  const handleUpdateTextBox = useCallback((id, updates, recordHistory = false) => {
    setTextBoxes((prev) => {
      const next = prev.map((box) => (box.id === id ? { ...box, ...updates } : box));
      textBoxesRef.current = next;
      if (recordHistory) {
        pushHistory({ textBoxes: next, textReplacements: textReplacementsRef.current });
      }
      return next;
    });
  }, [pushHistory]);

  const handleDeleteTextBox = useCallback((id) => {
    const targetId = id || selectedTextBoxId;
    if (!targetId) return;

    setTextBoxes((prev) => {
      const next = prev.filter((b) => b.id !== targetId);
      textBoxesRef.current = next;
      pushHistory({ textBoxes: next, textReplacements: textReplacementsRef.current });
      return next;
    });
    setSelectedTextBoxId(null);
    showToast('Text box deleted');
  }, [selectedTextBoxId, pushHistory, showToast]);

  const handleSelectTextBox = useCallback((id) => {
    setSelectedTextBoxId(id);
    if (window.innerWidth >= 1024) {
      setIsPropertiesOpen(true);
    }
  }, []);

  const handleDeselect = useCallback(() => {
    setSelectedTextBoxId(null);
  }, []);

  const handleUpdateSelectedTextBox = useCallback((updates) => {
    if (!selectedTextBoxId) return;
    handleUpdateTextBox(selectedTextBoxId, updates, true);
  }, [selectedTextBoxId, handleUpdateTextBox]);

  const selectedTextBox = textBoxes.find((b) => b.id === selectedTextBoxId) || null;

  // Close document and reset workspace
  const handleCloseDocument = () => {
    if (pdfDocProxy) {
      try { pdfDocProxy.destroy(); } catch (_) {}
    }
    reset();
    setPdfDocProxy(null);
    setTotalPages(0);
    setCurrentPage(1);
    setThumbnails([]);
    setMetadata(null);
    setTextBoxes([]);
    setTextReplacements([]);
    textBoxesRef.current = [];
    textReplacementsRef.current = [];
    isExportingRef.current = false;
    setSelectedTextBoxId(null);
    setHistory([{ textBoxes: [], textReplacements: [] }]);
    setHistoryIndex(0);
    setIsReplacementModalOpen(false);
    setReplacementModalData(null);
    setIsExporting(false);
    setExportProgress(0);
    setIsFindOpen(false);
  };

  // ==========================================================================
  // EXISTING PDF TEXT REPLACEMENT HANDLERS (Genuine in-place visual replacement & Line Reflow)
  // ==========================================================================
  const handleApplyExistingTextReplacement = useCallback((replacement) => {
    if (!replacement) return;

    setTextReplacements((prev) => {
      const existingIdx = prev.findIndex((r) => {
        if (replacement.id && r.id === replacement.id) return true;
        if (
          r.page === replacement.page &&
          replacement.type === 'line_reflow' &&
          r.type === 'line_reflow' &&
          replacement.lineId &&
          r.lineId === replacement.lineId
        ) {
          return true;
        }
        if (
          r.page === replacement.page &&
          replacement.targetId &&
          r.targetId === replacement.targetId
        ) {
          return true;
        }
        return false;
      });

      let next;
      if (existingIdx >= 0) {
        const existing = prev[existingIdx];
        const prevHistory = Array.isArray(existing.history) ? [...existing.history] : [];
        const snapshot = {
          replacementText: existing.replacementText,
          wordEdits: existing.wordEdits ? { ...existing.wordEdits } : undefined,
          wordStyles: existing.wordStyles ? { ...existing.wordStyles } : undefined,
          fontFamily: existing.fontFamily,
          fontSize: existing.fontSize,
          bold: existing.bold,
          italic: existing.italic,
          underline: existing.underline,
          color: existing.color,
          align: existing.align,
          lineHeight: existing.lineHeight,
          letterSpacing: existing.letterSpacing,
          opacity: existing.opacity,
          backgroundColor: existing.backgroundColor || existing.coverColor,
          capitalization: existing.capitalization,
        };
        const updatedRecord = {
          ...existing,
          ...replacement,
          history: [...prevHistory, snapshot],
        };
        next = [...prev];
        next[existingIdx] = updatedRecord;
      } else {
        const newRecord = {
          ...replacement,
          history: Array.isArray(replacement.history) ? replacement.history : [],
        };
        next = [...prev, newRecord];
      }
      textReplacementsRef.current = next;
      pushHistory({ textBoxes: textBoxesRef.current, textReplacements: next });
      return next;
    });

    if (replacement.replacementText && String(replacement.replacementText).trim()) {
      showToast(`Updated text: "${replacement.replacementText}"`);
    } else {
      showToast(`Text adjusted`);
    }
  }, [pushHistory, showToast]);

  const handleDeleteExistingTextReplacement = useCallback((replacementId) => {
    setTextReplacements((prev) => {
      const next = prev.filter(
        (r) => r.id !== replacementId && r.targetId !== replacementId
      );
      textReplacementsRef.current = next;
      pushHistory({ textBoxes: textBoxesRef.current, textReplacements: next });
      return next;
    });
    showToast('Restored original PDF text');
  }, [pushHistory, showToast]);

  const handleRevertExistingTextReplacement = useCallback((targetId, replId, wordId) => {
    setTextReplacements((prev) => {
      const targetIdx = prev.findIndex(
        (r) => (replId && r.id === replId) || (targetId && (r.targetId === targetId || r.lineId === targetId))
      );
      if (targetIdx === -1) return prev;

      const record = prev[targetIdx];

      // Case 1: Line reflow with multi-word edits
      if (record.type === 'line_reflow' && (wordId || targetId) && record.reflowLine) {
        const effectiveWordId = wordId || targetId;
        const wordHistories = { ...(record.wordHistories || {}) };
        const wordEdits = { ...(record.wordEdits || {}) };
        const wordStyles = { ...(record.wordStyles || {}) };

        // Check if there is history for this specific word
        if (wordHistories[effectiveWordId] && wordHistories[effectiveWordId].length > 0) {
          const prevWordState = wordHistories[effectiveWordId].pop();
          wordEdits[effectiveWordId] = prevWordState.replacementText;
          if (prevWordState.style) {
            wordStyles[effectiveWordId] = prevWordState.style;
          }
        } else {
          // No history left for this word -> remove it from active edits to restore original text
          delete wordEdits[effectiveWordId];
          delete wordStyles[effectiveWordId];
          delete wordHistories[effectiveWordId];
        }

        const remainingWordIds = Object.keys(wordEdits);
        let next;
        if (remainingWordIds.length > 0) {
          // Recompute line reflow with remaining words
          const line = record.line || { id: record.lineId, page: record.page, words: record.reflowLine.reflowWords.map(rw => ({ ...rw, text: rw.originalText || rw.text })) };
          const reflowResult = calculateLineReflow({
            line,
            wordEdits,
            wordStyles,
            pagePtWidth: pageGeometry?.widthPt || 612,
          });

          if (reflowResult) {
            const updatedRecord = {
              ...record,
              wordEdits,
              wordStyles,
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
              overflowsBoundary: reflowResult.overflowsBoundary,
              overflowAmount: reflowResult.overflowAmount,
              overflowWarning: reflowResult.overflowWarning,
            };
            next = [...prev];
            next[targetIdx] = updatedRecord;
            showToast('Reverted word edit');
          } else {
            next = prev.filter((_, idx) => idx !== targetIdx);
            showToast('Restored original PDF line');
          }
        } else {
          // All word edits reverted on this line -> remove line record completely
          next = prev.filter((_, idx) => idx !== targetIdx);
          showToast('Restored original PDF line');
        }

        textReplacementsRef.current = next;
        pushHistory({ textBoxes: textBoxesRef.current, textReplacements: next });
        return next;
      }

      // Case 2: Section reflow or standalone edit
      const history = Array.isArray(record.history) ? [...record.history] : [];
      let next;
      if (history.length > 0) {
        const prevVersion = history.pop();
        const revertedRecord = {
          ...record,
          ...prevVersion,
          history,
        };
        next = [...prev];
        next[targetIdx] = revertedRecord;
        showToast(`Reverted to previous version ("${revertedRecord.replacementText || 'original'}")`);
      } else {
        next = prev.filter((_, idx) => idx !== targetIdx);
        showToast('Restored original PDF text');
      }

      textReplacementsRef.current = next;
      pushHistory({ textBoxes: textBoxesRef.current, textReplacements: next });
      return next;
    });
  }, [pageGeometry, pushHistory, showToast]);

  const handleRevertActiveTextEdit = useCallback(() => {
    const currentEdit = activeTextEditRef.current;
    if (!currentEdit) return;

    handleRevertExistingTextReplacement(
      currentEdit.targetId,
      currentEdit.lineReplId || currentEdit.id,
      currentEdit.targetId
    );
    setActiveTextEdit(null);
    activeTextEditRef.current = null;
  }, [handleRevertExistingTextReplacement]);

  // Synchronized active text edit handlers (Properties Panel <-> Live Canvas)
  const handleUpdateActiveTextEdit = useCallback((updates) => {
    setActiveTextEdit((prev) => {
      if (!prev) return null;
      const next = { ...prev, ...updates };
      activeTextEditRef.current = next;
      return next;
    });
  }, []);

  const handleApplyActiveTextEdit = useCallback(() => {
    const currentEdit = activeTextEditRef.current;
    if (!currentEdit) return;

    if (currentEdit.type === 'section_reflow' && (currentEdit.section || currentEdit.sectionId)) {
      const sec = currentEdit.section;
      if (sec) {
        const reflowResult = calculateSectionReflow({
          section: sec,
          replacementText: currentEdit.replacementText ?? '',
          fontFamily: currentEdit.fontFamily,
          fontSize: currentEdit.fontSize,
          bold: currentEdit.bold,
          italic: currentEdit.italic,
          underline: currentEdit.underline,
          color: currentEdit.color,
          align: currentEdit.align,
          lineHeight: currentEdit.lineHeight,
          letterSpacing: currentEdit.letterSpacing,
          backgroundColor: currentEdit.backgroundColor || '#FFFFFF',
          opacity: currentEdit.opacity,
          capitalization: currentEdit.capitalization,
          availableWidth: currentEdit.availableWidth,
          pagePtWidth: pageGeometry?.widthPt || 612,
          pagePtHeight: pageGeometry?.heightPt || 792,
        });

        if (reflowResult) {
          handleApplyExistingTextReplacement(reflowResult);
        }
      }
    } else if (currentEdit.type === 'line_reflow' && currentEdit.line) {
      const targetId = currentEdit.targetId;
      const fullVal = currentEdit.replacementText ?? '';

      const updatedWordEdits = {
        ...(currentEdit.existingWordEdits || {}),
        [targetId]: fullVal,
      };

      const updatedWordStyles = {
        ...(currentEdit.existingWordStyles || {}),
        [targetId]: {
          fontSize: currentEdit.fontSize,
          fontFamily: currentEdit.fontFamily,
          bold: !!currentEdit.bold,
          italic: !!currentEdit.italic,
          underline: !!currentEdit.underline,
          color: currentEdit.color || '#111827',
        },
      };

      const wordHistories = { ...(currentEdit.wordHistories || {}) };
      if (currentEdit.isExistingReplacement && currentEdit.originalText !== fullVal) {
        const prevWordHist = wordHistories[targetId] ? [...wordHistories[targetId]] : [];
        prevWordHist.push({
          replacementText: currentEdit.originalText,
          style: {
            fontSize: currentEdit.fontSize,
            fontFamily: currentEdit.fontFamily,
            bold: !!currentEdit.bold,
            italic: !!currentEdit.italic,
            underline: !!currentEdit.underline,
            color: currentEdit.color || '#111827',
          },
        });
        wordHistories[targetId] = prevWordHist;
      }

      const reflowResult = calculateLineReflow({
        line: currentEdit.line,
        targetWordId: targetId,
        replacementText: fullVal,
        wordEdits: updatedWordEdits,
        wordStyles: updatedWordStyles,
        pagePtWidth: pageGeometry?.widthPt || 612,
      });

      if (reflowResult) {
        const replItem = {
          id: currentEdit.lineReplId || `repl_line_${currentEdit.line.id}`,
          lineId: currentEdit.line.id,
          line: currentEdit.line,
          type: 'line_reflow',
          page: currentPage,
          targetId: currentEdit.targetId,
          originalText: currentEdit.line.fullOriginalText || currentEdit.originalText,
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
          coverColor: currentEdit.backgroundColor || '#FFFFFF',
          fontSize: currentEdit.fontSize,
          fontFamily: currentEdit.fontFamily || 'Helvetica',
          bold: !!currentEdit.bold,
          italic: !!currentEdit.italic,
          underline: !!currentEdit.underline,
          color: currentEdit.color || '#111827',
          align: currentEdit.align || 'left',
          lineHeight: currentEdit.lineHeight || 1.25,
          letterSpacing: currentEdit.letterSpacing || 0,
          opacity: currentEdit.opacity ?? 1.0,
          overflowsBoundary: reflowResult.overflowsBoundary,
          overflowAmount: reflowResult.overflowAmount,
          overflowWarning: reflowResult.overflowWarning,
        };
        handleApplyExistingTextReplacement(replItem);
      }
    } else if (currentEdit.selectionLevel === 'word' || currentEdit.type === 'word_replacement') {
      const wordRepl = calculateWordReplacement({
        word: {
          id: currentEdit.targetId,
          text: currentEdit.word || currentEdit.originalText,
          ptX: currentEdit.ptX,
          ptY: currentEdit.ptY,
          ptWidth: currentEdit.ptWidth,
          ptHeight: currentEdit.ptHeight,
          fontSize: currentEdit.fontSize,
          fontFamily: currentEdit.fontFamily,
          bold: currentEdit.bold,
          italic: currentEdit.italic,
          color: currentEdit.color,
          baselinePtY: currentEdit.baselinePtY,
          pdfBaselineY: currentEdit.pdfBaselineY,
          pdfBaselineX: currentEdit.pdfBaselineX,
        },
        line: currentEdit.line,
        replacementText: currentEdit.replacementText ?? '',
        capitalization: currentEdit.capitalization || 'preserve',
        userFormatting: {
          fontSize: currentEdit.fontSize,
          fontFamily: currentEdit.fontFamily,
          bold: !!currentEdit.bold,
          italic: !!currentEdit.italic,
          underline: !!currentEdit.underline,
          color: currentEdit.color || '#111827',
        },
        pagePtWidth: pageGeometry?.widthPt || 612,
        lineAbove: currentEdit.lineAbove,
        lineBelow: currentEdit.lineBelow,
        prevWord: currentEdit.prevWord,
        nextWord: currentEdit.nextWord,
      });

      if (wordRepl) {
        const replItem = {
          id: currentEdit.id || wordRepl.id,
          targetId: currentEdit.targetId,
          lineId: currentEdit.lineId,
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
          isWrapped: wordRepl.isWrapped,
          wrappedLines: wordRepl.wrappedLines,
          indentX: wordRepl.indentX,
          lineSpacingPt: wordRepl.lineSpacingPt,
          replacedWordIds: wordRepl.replacedWordIds || [currentEdit.targetId],
          fontSize: wordRepl.fontSize,
          fontFamily: wordRepl.fontFamily,
          bold: wordRepl.bold,
          italic: wordRepl.italic,
          underline: wordRepl.underline,
          color: wordRepl.color,
          coverColor: currentEdit.backgroundColor || '#FFFFFF',
          overflowsBoundary: wordRepl.overflowsBoundary,
          overflowWarning: wordRepl.overflowWarning,
        };
        handleApplyExistingTextReplacement(replItem);
      }
    } else {
      const replItem = {
        id: currentEdit.id || `repl_${Date.now()}`,
        page: currentPage,
        targetId: currentEdit.targetId || currentEdit.id,
        originalText: currentEdit.originalText,
        replacementText: currentEdit.replacementText ?? '',
        origPtX: currentEdit.ptX,
        origPtY: currentEdit.ptY,
        origPtWidth: currentEdit.ptWidth,
        origPtHeight: currentEdit.ptHeight,
        coverPtX: currentEdit.ptX,
        coverPtY: currentEdit.ptY,
        coverPtWidth: currentEdit.ptWidth,
        coverPtHeight: currentEdit.ptHeight,
        coverColor: currentEdit.backgroundColor || '#FFFFFF',
        fontSize: currentEdit.fontSize,
        fontFamily: currentEdit.fontFamily || 'Helvetica',
        bold: !!currentEdit.bold,
        italic: !!currentEdit.italic,
        underline: !!currentEdit.underline,
        color: currentEdit.color || '#111827',
        align: currentEdit.align || 'left',
        lineHeight: currentEdit.lineHeight || 1.25,
        letterSpacing: currentEdit.letterSpacing || 0,
        opacity: currentEdit.opacity ?? 1.0,
      };
      handleApplyExistingTextReplacement(replItem);
    }

    setActiveTextEdit(null);
    activeTextEditRef.current = null;
  }, [currentPage, pageGeometry, handleApplyExistingTextReplacement]);

  const handleCancelActiveTextEdit = useCallback(() => {
    setActiveTextEdit(null);
    activeTextEditRef.current = null;
  }, []);

  const handleApplyReplacementBoxes = useCallback((boxes) => {
    if (!boxes || boxes.length === 0) return;
    setTextReplacements((prev) => {
      const next = [...prev, ...boxes];
      textReplacementsRef.current = next;
      pushHistory({ textBoxes: textBoxesRef.current, textReplacements: next });
      return next;
    });
    showToast(`Applied ${boxes.length} text replacements.`);
  }, [pushHistory, showToast]);

  // ==========================================================================
  // PHASE 2B: TEXT REPLACEMENT & AREA COVER HANDLERS
  // ==========================================================================
  const handleStartTextReplacement = useCallback((data) => {
    setReplacementModalData({ ...data, page: currentPage });
    setIsReplacementModalOpen(true);
  }, [currentPage]);

  const handleCancelReplacement = useCallback(() => {
    setIsReplacementModalOpen(false);
    setReplacementModalData(null);
    if (activeTool === 'replace-area') {
      setActiveTool('select');
    }
  }, [activeTool]);

  const handleApplyReplacement = useCallback((data) => {
    const newReplacementBox = {
      id: `replace_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      page: data.page || currentPage,
      ptX: data.ptX,
      ptY: data.ptY,
      ptWidth: Math.max(30, data.ptWidth),
      ptHeight: Math.max(16, data.ptHeight),
      text: data.text,
      originalText: data.originalText || '',
      isReplacement: true,
      backgroundColor: data.backgroundColor || '#FFFFFF',
      fontFamily: data.fontFamily || 'Helvetica',
      fontSize: data.fontSize || 14,
      color: data.color || '#111827',
      bold: !!data.bold,
      italic: !!data.italic,
      align: data.align || 'left',
      lineHeight: 1.25,
    };

    setTextBoxes((prev) => {
      const next = [...prev, newReplacementBox];
      textBoxesRef.current = next;
      pushHistory({ textBoxes: next, textReplacements: textReplacementsRef.current });
      return next;
    });
    setSelectedTextBoxId(newReplacementBox.id);
    setIsReplacementModalOpen(false);
    setReplacementModalData(null);
    setActiveTool('select');
    showToast('Text replacement applied! You can further move, resize, or format this box.');
  }, [currentPage, pushHistory, showToast]);

  const handleRequestAreaTool = useCallback(() => {
    setActiveTool('replace-area');
    showToast('Click and drag a rectangle on the document to cover and replace.');
  }, [showToast]);

  // ==========================================================================
  // PHASE 2C: PDF EXPORT AND DOWNLOAD WORKFLOW
  // ==========================================================================
  const handleDownloadPdf = useCallback(async () => {
    const currentFile = fileRef.current;
    if (!currentFile || isExportingRef.current) return;

    try {
      // 1. Force blur on any currently active input/textarea to auto-commit pending unapplied edits
      if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
      }

      // 2. Synchronous atomic lock to prevent duplicate clicks while exporting
      isExportingRef.current = true;
      setIsExporting(true);
      setExportProgress(10);

      // Brief wait to allow pending blur events and state updates to settle, and render loading indicator
      await new Promise((resolve) => setTimeout(resolve, 80));

      const currentTextBoxes = textBoxesRef.current || [];
      const currentTextReplacements = textReplacementsRef.current || [];

      // 3. Export PDF with all latest edits directly awaited
      const blob = await exportEditedPdf({
        file: currentFile,
        textBoxes: currentTextBoxes,
        textReplacements: currentTextReplacements,
        onProgress: (p) => setExportProgress(p),
      });

      // 4. Download with preserved original name + "_edited.pdf"
      const originalBase = (currentFile.name || 'document').replace(/\.[^/.]+$/, '');
      const downloadName = `${originalBase}_edited.pdf`;

      downloadFile(blob, downloadName, 'Edit PDF');
      showToast(`Document successfully exported and downloaded as "${downloadName}"!`);
    } catch (err) {
      console.error('[EditPDF Export Error]:', err);
      showToast(`Export failed: ${err.message || 'Please verify document pages.'}`);
    } finally {
      isExportingRef.current = false;
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [showToast]);

  // Metadata update handler (preserving Edit Metadata tool capabilities)
  const handleUpdateMetadata = async (newMeta) => {
    if (!file) return;
    try {
      setIsSavingMetadata(true);
      setMetadataSaved(false);

      const updatedBlob = await editPdfMetadata(file, newMeta);
      const originalBase = file.name.replace(/\.[^/.]+$/, '');
      const downloadName = `${originalBase}_updated_metadata.pdf`;

      downloadFile(updatedBlob, downloadName, updatedBlob.size, 'Edit PDF');
      setMetadata(newMeta);
      setMetadataSaved(true);
      showToast('Metadata updated and file downloaded successfully!');
    } catch (err) {
      console.error('[EditPDF Metadata Update Error]:', err);
      showToast('Failed to update metadata. Please check the file.');
    } finally {
      setIsSavingMetadata(false);
    }
  };

  // Keyboard navigation & Undo/Redo shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check if user is actively typing in an input, textarea, or contentEditable element
      const activeTag = document.activeElement?.tagName;
      const isInputActive =
        activeTag === 'INPUT' ||
        activeTag === 'TEXTAREA' ||
        activeTag === 'SELECT' ||
        document.activeElement?.isContentEditable;

      // Undo / Redo shortcuts (only when not typing in an input/textarea)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (!isInputActive) {
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        if (!isInputActive) {
          e.preventDefault();
          handleRedo();
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        // Delete selected text box when not typing inside an input/textarea
        if (!isInputActive && selectedTextBoxId) {
          e.preventDefault();
          handleDeleteTextBox(selectedTextBoxId);
        }
      } else if (!isInputActive) {
        // Page Navigation
        if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
          e.preventDefault();
          setCurrentPage((prev) => Math.max(1, prev - 1));
        } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
          e.preventDefault();
          setCurrentPage((prev) => Math.min(totalPages, prev + 1));
        } else if ((e.ctrlKey || e.metaKey) && e.key === '=') {
          e.preventDefault();
          handleZoomIn();
        } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
          e.preventDefault();
          handleZoomOut();
        } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
          e.preventDefault();
          setZoom(1.0);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalPages, selectedTextBoxId, handleUndo, handleRedo, handleDeleteTextBox]);

  return (
    <div className={`edit-pdf-page ${file ? 'is-in-editor-mode' : ''}`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="editor-toast-message" role="status">
          <FontAwesomeIcon icon={faCircleCheck} className="toast-icon" />
          <span>{toastMessage}</span>
          <button
            type="button"
            className="toast-close-btn"
            onClick={() => setToastMessage(null)}
            aria-label="Dismiss message"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
      )}

      {!file ? (
        /* ====================================================================
           IDLE UPLOAD STATE
           ==================================================================== */
        <div className="edit-pdf-idle-container container">
          {/* Top Back Link */}
          <div className="tool-top-nav-row">
            <Link to="/" className="tool-back-link">
              <FontAwesomeIcon icon={faArrowLeft} /> Back to Tools
            </Link>
          </div>

          {/* Hero Header */}
          <div className="edit-pdf-hero">
            <div className="edit-pdf-icon-badge">
              <FontAwesomeIcon icon={faPenToSquare} />
            </div>
            <h1 className="edit-pdf-title">Edit PDF</h1>
            <p className="edit-pdf-desc">
              Add text, shapes, annotations, images, and inspect document properties in your PDF document.
            </p>
          </div>

          {/* Upload Area */}
          <div className="edit-pdf-upload-wrapper">
            <UploadBox
              onFileSelect={(f) => selectFile(f, '.pdf')}
              isDragging={false}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              error={error}
              acceptedTypes=".pdf"
              title="Drop your PDF here to edit"
              subtitle="or click to browse from device"
              buttonText="Choose PDF Document"
            />
          </div>

          {/* Feature Highlights Grid */}
          <div className="editor-features-grid" aria-label="Editor Capabilities">
            <div className="feature-card">
              <div className="feature-icon-box">
                <FontAwesomeIcon icon={faFont} />
              </div>
              <h3 className="feature-card-title">Text & Typography</h3>
              <p className="feature-card-desc">
                Insert custom text boxes, adjust font families, size, alignment, and redact existing text sections.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-box">
                <FontAwesomeIcon icon={faPen} />
              </div>
              <h3 className="feature-card-title">Markup & Annotations</h3>
              <p className="feature-card-desc">
                Highlight paragraphs, underline key points, strikeout text, or draw freehand ink notes directly on pages.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-box">
                <FontAwesomeIcon icon={faShapes} />
              </div>
              <h3 className="feature-card-title">Shapes & Images</h3>
              <p className="feature-card-desc">
                Place rectangles, callout circles, arrows, lines, and custom stamp images with fill and opacity controls.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-box">
                <FontAwesomeIcon icon={faShieldHalved} />
              </div>
              <h3 className="feature-card-title">Properties & Security</h3>
              <p className="feature-card-desc">
                Inspect document details, page dimensions, author metadata, and update properties with bank-grade privacy.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* ====================================================================
           ACTIVE WORKSPACE: THREE-PANEL EDITOR
           ==================================================================== */
        <div className="editor-workspace-container">
          {/* Top Editor Toolbar */}
          <EditorToolbar
            activeTool={activeTool}
            onSelectTool={handleSelectTool}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(p) => setCurrentPage(p)}
            zoom={zoom}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onZoomSelect={handleZoomSelect}
            onFitPage={handleFitPage}
            onFitWidth={handleFitWidth}
            fileName={file.name}
            onCloseDocument={handleCloseDocument}
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
            isPropertiesOpen={isPropertiesOpen}
            onToggleProperties={() => setIsPropertiesOpen((prev) => !prev)}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onDownload={handleDownloadPdf}
            isExporting={isExporting}
            exportProgress={exportProgress}
            isFindOpen={isFindOpen}
            onToggleFind={() => setIsFindOpen((prev) => !prev)}
            selectionLevel={selectionLevel}
            onSelectSelectionLevel={setSelectionLevel}
          />

          {/* Floating Find & Replace Widget */}
          <EditorFindReplace
            isOpen={isFindOpen}
            onClose={() => setIsFindOpen(false)}
            pdfDocProxy={pdfDocProxy}
            currentPage={currentPage}
            totalPages={totalPages}
            onNavigateToPage={(p) => setCurrentPage(p)}
            onApplyReplacementBoxes={handleApplyReplacementBoxes}
            showToast={showToast}
          />

          {/* Main Three-Panel Viewport */}
          <div className="editor-panels-layout">
            {/* Mobile Drawer Backdrops */}
            {isSidebarOpen && (
              <div
                className="sidebar-backdrop-mobile"
                onClick={() => setIsSidebarOpen(false)}
                aria-hidden="true"
              />
            )}
            {isPropertiesOpen && (
              <div
                className="properties-backdrop-mobile"
                onClick={() => setIsPropertiesOpen(false)}
                aria-hidden="true"
              />
            )}

            {/* Left Rail: Page Thumbnails */}
            <EditorSidebar
              isOpen={isSidebarOpen}
              currentPage={currentPage}
              totalPages={totalPages}
              thumbnails={thumbnails}
              onSelectPage={(p) => setCurrentPage(p)}
              onClose={() => setIsSidebarOpen(false)}
            />

            {/* Center Stage: PDF Viewer Canvas, Text Layer & Interactive Text Overlay */}
            <EditorCanvas
              pdfDocProxy={pdfDocProxy}
              currentPage={currentPage}
              zoom={zoom}
              onPageGeometryLoaded={handlePageGeometryLoaded}
              viewportContainerRef={viewportContainerRef}
              textBoxes={textBoxes}
              textReplacements={textReplacements}
              activeTool={activeTool}
              selectedTextBoxId={selectedTextBoxId}
              onSelectTextBox={handleSelectTextBox}
              onDeselect={handleDeselect}
              onCreateTextBox={handleCreateTextBox}
              onUpdateTextBox={handleUpdateTextBox}
              onDeleteTextBox={handleDeleteTextBox}
              onApplyExistingTextReplacement={handleApplyExistingTextReplacement}
              onDeleteExistingTextReplacement={handleDeleteExistingTextReplacement}
              onRevertExistingTextReplacement={handleRevertExistingTextReplacement}
              onRequestAreaTool={handleRequestAreaTool}
              selectionLevel={selectionLevel}
              activeTextEdit={activeTextEdit}
              onSetActiveTextEdit={setActiveTextEdit}
              onUpdateActiveTextEdit={handleUpdateActiveTextEdit}
              onApplyActiveTextEdit={handleApplyActiveTextEdit}
              onCancelActiveTextEdit={handleCancelActiveTextEdit}
              onRevertActiveTextEdit={handleRevertActiveTextEdit}
            />

            {/* Right Panel: Document Properties, Metadata, and Contextual Text Settings */}
            <EditorPropertiesPanel
              isOpen={isPropertiesOpen}
              onClose={() => setIsPropertiesOpen(false)}
              file={file}
              currentPage={currentPage}
              totalPages={totalPages}
              pageGeometry={pageGeometry}
              metadata={metadata}
              isReadingMetadata={isReadingMetadata}
              onUpdateMetadata={handleUpdateMetadata}
              isSavingMetadata={isSavingMetadata}
              metadataSaved={metadataSaved}
              activeTextEdit={activeTextEdit}
              onUpdateActiveTextEdit={handleUpdateActiveTextEdit}
              onApplyActiveTextEdit={handleApplyActiveTextEdit}
              onCancelActiveTextEdit={handleCancelActiveTextEdit}
              onRevertActiveTextEdit={handleRevertActiveTextEdit}
              selectedTextBox={selectedTextBox}
              onUpdateSelectedTextBox={handleUpdateSelectedTextBox}
              onDeleteSelectedTextBox={() => handleDeleteTextBox(selectedTextBoxId)}
            />
          </div>

          {/* Text Replacement Modal Dialog (Phase 2B) */}
          <EditorReplaceModal
            isOpen={isReplacementModalOpen}
            replacementData={replacementModalData}
            onApply={handleApplyReplacement}
            onCancel={handleCancelReplacement}
          />
        </div>
      )}
    </div>
  );
}
