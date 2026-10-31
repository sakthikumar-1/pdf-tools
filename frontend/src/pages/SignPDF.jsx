import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faSignature,
  faCheck,
  faDownload,
  faArrowRotateLeft,
  faTrashCan,
  faPen,
  faKeyboard,
  faUpload,
  faChevronLeft,
  faChevronRight,
  faCircleCheck,
  faCalendarDay,
  faFont,
  faCircleInfo,
  faFilePdf
} from '@fortawesome/free-solid-svg-icons';
import { pdfjsLib } from '../utils/pdfjsConfig';
import UploadBox from '../components/UploadBox';
import ProgressBar from '../components/ProgressBar';
import { useFileUpload } from '../hooks/useFileUpload';
import { formatFileSize } from '../utils/formatFileSize';
import { downloadFile } from '../utils/fileUtils';
import { signPdfPython } from '../services/api';
import { signPdfClient } from '../utils/pdfProcessor';
import './SignPDF.css';

const PEN_COLORS = [
  { name: 'Black', hex: '#111827' },
  { name: 'Blue', hex: '#2563EB' },
  { name: 'Red', hex: '#DC2626' },
  { name: 'Green', hex: '#16A34A' },
];

const HANDWRITING_FONTS = [
  { name: 'Great Vibes', font: "'Great Vibes', cursive", styleName: 'Elegant cursive' },
  { name: 'Caveat', font: "'Caveat', cursive", styleName: 'Natural handwriting' },
  { name: 'Sacramento', font: "'Sacramento', cursive", styleName: 'Simple signature' },
  { name: 'Allura', font: "'Allura', cursive", styleName: 'Classic flowing handwriting' },
  { name: 'Dancing Script', font: "'Dancing Script', cursive", styleName: 'Casual script' },
  { name: 'Pacifico', font: "'Pacifico', cursive", styleName: 'Bold handwriting' },
];

export default function SignPDF() {
  const {
    file,
    isDragging,
    error,
    status,
    progress,
    setStatus,
    setProgress,
    setError,
    selectFile,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    reset,
  } = useFileUpload();

  // Document state
  const [totalPages, setTotalPages] = useState(0);
  const [thumbnails, setThumbnails] = useState([]);
  const [activePageIndex, setActivePageIndex] = useState(0); // 0-based
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [isPageRendering, setIsPageRendering] = useState(false);
  const [pdfDocProxy, setPdfDocProxy] = useState(null);

  // Active page geometry
  const [pagePtSize, setPagePtSize] = useState({ width: 612, height: 792, rotation: 0 });
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 480, height: 620 });

  // Placed signatures across document:
  // Array of { id, page (1-based), dataUrl, canvasX, canvasY, canvasW, canvasH, ptX, ptY, ptW, ptH, aspectRatio }
  const [placedSignatures, setPlacedSignatures] = useState([]);
  const [selectedSigId, setSelectedSigId] = useState(null);
  const [processedResult, setProcessedResult] = useState(null);

  // Signature creation mode: 'draw' | 'type' | 'upload'
  const [creationMode, setCreationMode] = useState('draw');
  const [penColor, setPenColor] = useState('#111827');
  const [penWidth, setPenWidth] = useState(2.5);

  const isCustomColorActive = !PEN_COLORS.some(
    (c) => c.hex.toLowerCase() === penColor.toLowerCase()
  );

  // Draw mode state
  const drawCanvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawnContent, setHasDrawnContent] = useState(false);
  const strokeHistoryRef = useRef([]);

  // Type mode state
  const [typedName, setTypedName] = useState('');
  const [selectedFontIndex, setSelectedFontIndex] = useState(0);

  // Upload mode state
  const [uploadedSigUrl, setUploadedSigUrl] = useState(null);

  // Canvas refs
  const mainCanvasRef = useRef(null);
  const pageContainerRef = useRef(null);
  const renderTaskRef = useRef(null);

  // Dragging / Resizing state for placed signatures
  const [activeInteraction, setActiveInteraction] = useState(null); // { type: 'move'|'resize', sigId, startX, startY, origCanvasX, origCanvasY, origCanvasW, origCanvasH }

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // 1. Load PDF Document and render filmstrip thumbnails
  useEffect(() => {
    if (!file) return;

    let isMounted = true;
    const loadPdf = async () => {
      try {
        setIsLoadingPdf(true);
        setError(null);
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (!isMounted) return;

        setPdfDocProxy(pdf);
        const count = pdf.numPages;
        setTotalPages(count);
        setActivePageIndex(0);
        setIsLoadingPdf(false);

        // Render thumbnails progressively in the background
        const loadedThumbs = [];
        for (let i = 1; i <= count; i++) {
          if (!isMounted) return;
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.25 });
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          await page.render({ canvasContext: ctx, viewport }).promise;
          loadedThumbs.push({
            pageNumber: i,
            dataUrl: canvas.toDataURL('image/jpeg', 0.8),
            width: viewport.width,
            height: viewport.height,
          });
          if (isMounted) {
            setThumbnails([...loadedThumbs]);
          }
        }
      } catch (err) {
        console.error('[SignPDF Load Error]:', err);
        if (isMounted) {
          setError('Failed to load PDF document. Please verify the file is not password-protected or damaged.');
          setIsLoadingPdf(false);
        }
      }
    };

    loadPdf();
    return () => { isMounted = false; };
  }, [file]);

  // 2. Render active page onto main interactive canvas
  useEffect(() => {
    if (!pdfDocProxy || totalPages === 0 || isLoadingPdf) return;

    let isCancelled = false;
    const renderActivePage = async () => {
      try {
        setIsPageRendering(true);

        if (renderTaskRef.current) {
          try { renderTaskRef.current.cancel(); } catch (_) {}
        }

        const pageNumber = activePageIndex + 1;
        const page = await pdfDocProxy.getPage(pageNumber);
        if (isCancelled) return;

        // Unscaled page geometry in PDF points (72 pt = 1 inch)
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const ptWidth = unscaledViewport.width;
        const ptHeight = unscaledViewport.height;
        const pageRotation = page.rotate || 0;
        setPagePtSize({ width: ptWidth, height: ptHeight, rotation: pageRotation });

        // Fit canvas comfortably into viewport container
        const containerWidth = pageContainerRef.current ? pageContainerRef.current.clientWidth : 540;
        const targetMaxWidth = Math.min(Math.max(340, containerWidth - 48), 540);
        const scale = Math.min(targetMaxWidth / ptWidth, 680 / ptHeight);

        const viewport = page.getViewport({ scale });
        const canvas = mainCanvasRef.current;
        if (!canvas || isCancelled) {
          if (!isCancelled && !canvas) {
            requestAnimationFrame(() => {
              if (!isCancelled && mainCanvasRef.current) {
                renderActivePage();
              }
            });
          }
          if (!isCancelled) setIsPageRendering(false);
          return;
        }

        const ctx = canvas.getContext('2d');
        const dWidth = Math.floor(viewport.width);
        const dHeight = Math.floor(viewport.height);

        canvas.width = dWidth;
        canvas.height = dHeight;
        setCanvasDimensions({ width: dWidth, height: dHeight });

        // Crisp white paper background behind PDF elements
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, dWidth, dHeight);

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };

        const task = page.render(renderContext);
        renderTaskRef.current = task;
        await task.promise;
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('[SignPDF Page Render Error]:', err);
        }
      } finally {
        if (!isCancelled) {
          setIsPageRendering(false);
        }
      }
    };

    renderActivePage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch (_) {}
      }
    };
  }, [pdfDocProxy, activePageIndex, totalPages, isLoadingPdf]);

  // Scale ratio: Canvas Pixels per PDF Point
  const scaleX = canvasDimensions.width > 0 && pagePtSize.width > 0 ? canvasDimensions.width / pagePtSize.width : 1;
  const scaleY = canvasDimensions.height > 0 && pagePtSize.height > 0 ? canvasDimensions.height / pagePtSize.height : 1;

  // Initialize or resize Draw canvas
  useEffect(() => {
    if (creationMode === 'draw' && drawCanvasRef.current) {
      const cvs = drawCanvasRef.current;
      const rect = cvs.getBoundingClientRect();
      if (cvs.width !== rect.width * 2) {
        cvs.width = rect.width * 2;
        cvs.height = rect.height * 2;
        const ctx = cvs.getContext('2d');
        ctx.scale(2, 2);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [creationMode]);

  // --------------------------------------------------------------------------
  // DRAW SIGNATURE HANDLERS (Smooth drawing canvas)
  // --------------------------------------------------------------------------
  const startDrawing = (e) => {
    e.preventDefault();
    const cvs = drawCanvasRef.current;
    if (!cvs) return;
    const rect = cvs.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const ctx = cvs.getContext('2d');
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.beginPath();
    ctx.moveTo(x, y);

    setIsDrawing(true);
    setHasDrawnContent(true);
    strokeHistoryRef.current.push([{ x, y }]);
  };

  const drawMove = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const cvs = drawCanvasRef.current;
    if (!cvs) return;
    const rect = cvs.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const ctx = cvs.getContext('2d');
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.lineTo(x, y);
    ctx.stroke();

    const currentStroke = strokeHistoryRef.current[strokeHistoryRef.current.length - 1];
    if (currentStroke) currentStroke.push({ x, y });
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
  };

  const redrawDrawingCanvas = (color) => {
    const cvs = drawCanvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.restore();

    ctx.strokeStyle = color;
    ctx.lineWidth = penWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const stroke of strokeHistoryRef.current) {
      if (!stroke || stroke.length === 0) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
    }
  };

  const handleColorChange = (newColor) => {
    setPenColor(newColor);
    if (hasDrawnContent && drawCanvasRef.current && strokeHistoryRef.current.length > 0) {
      redrawDrawingCanvas(newColor);
    }
  };

  const clearDrawing = () => {
    const cvs = drawCanvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.restore();
    strokeHistoryRef.current = [];
    setHasDrawnContent(false);
  };

  // Convert draw canvas into cropped transparent PNG dataUrl
  const exportDrawnSignature = () => {
    const cvs = drawCanvasRef.current;
    if (!cvs || !hasDrawnContent) return null;
    return cvs.toDataURL('image/png');
  };

  // --------------------------------------------------------------------------
  // TYPE SIGNATURE GENERATOR (Render script font to high-res transparent PNG)
  // --------------------------------------------------------------------------
  const generateTypedSignaturePng = async () => {
    const name = typedName.trim() || 'Signature';
    const fontObj = HANDWRITING_FONTS[selectedFontIndex] || HANDWRITING_FONTS[0];

    // Ensure handwriting webfont is loaded before rasterizing onto canvas
    if (typeof document !== 'undefined' && document.fonts?.load) {
      try {
        await document.fonts.load(`64px ${fontObj.font}`);
        await document.fonts.ready;
      } catch (_) {}
    }

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 640;
    tempCanvas.height = 190;
    const ctx = tempCanvas.getContext('2d');

    ctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    ctx.font = `64px ${fontObj.font}`;
    ctx.fillStyle = penColor;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    ctx.fillText(name, tempCanvas.width / 2, tempCanvas.height / 2);
    return tempCanvas.toDataURL('image/png');
  };

  // --------------------------------------------------------------------------
  // QUICK STAMPS (Date / Text)
  // --------------------------------------------------------------------------
  const generateDateStampPng = () => {
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 320;
    tempCanvas.height = 80;
    const ctx = tempCanvas.getContext('2d');

    ctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = penColor;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(`Date: ${today}`, tempCanvas.width / 2, tempCanvas.height / 2);

    return tempCanvas.toDataURL('image/png');
  };

  // --------------------------------------------------------------------------
  // PLACE SIGNATURE ON DOCUMENT CANVAS
  // --------------------------------------------------------------------------
  const placeSignatureOnPage = (dataUrl, defaultW = 160, defaultH = 65) => {
    if (!dataUrl) return;

    const newId = `sig_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const pageNum = activePageIndex + 1;

    // Center signature initially on active canvas
    const baseW = canvasDimensions.width > 0 ? canvasDimensions.width : 500;
    const baseH = canvasDimensions.height > 0 ? canvasDimensions.height : 680;
    const initW = Math.min(defaultW, baseW * 0.5);
    const initH = Math.min(defaultH, baseH * 0.25);
    const initX = Math.max(10, Math.floor((baseW - initW) / 2));
    const initY = Math.max(10, Math.floor((baseH - initH) / 2));

    // Convert to unscaled PDF points
    const ptX = Math.round(initX / scaleX);
    const ptY = Math.round(initY / scaleY);
    const ptW = Math.round(initW / scaleX);
    const ptH = Math.round(initH / scaleY);

    const newSignature = {
      id: newId,
      page: pageNum,
      dataUrl,
      canvasX: initX,
      canvasY: initY,
      canvasW: initW,
      canvasH: initH,
      ptX,
      ptY,
      ptW,
      ptH,
      pagePtWidth: pagePtSize.width,
      pagePtHeight: pagePtSize.height,
      rotation: pagePtSize.rotation,
      aspectRatio: initW / initH,
    };

    setPlacedSignatures((prev) => [...prev, newSignature]);
    setSelectedSigId(newId);
  };

  const handleAddSignature = async () => {
    if (creationMode === 'draw') {
      const url = exportDrawnSignature();
      if (!url) return;
      placeSignatureOnPage(url, 160, 60);
    } else if (creationMode === 'type') {
      const url = await generateTypedSignaturePng();
      placeSignatureOnPage(url, 180, 65);
    } else if (creationMode === 'upload') {
      if (!uploadedSigUrl) return;
      placeSignatureOnPage(uploadedSigUrl, 160, 65);
    }
  };

  const handleAddDateStamp = () => {
    const url = generateDateStampPng();
    placeSignatureOnPage(url, 140, 40);
  };

  const handleRemoveSignature = (sigId) => {
    setPlacedSignatures((prev) => prev.filter((s) => s.id !== sigId));
    if (selectedSigId === sigId) setSelectedSigId(null);
  };

  // --------------------------------------------------------------------------
  // INTERACTIVE DRAG & RESIZE OF SIGNATURES ON CANVAS
  // --------------------------------------------------------------------------
  const startSignatureInteraction = (e, sigId, type) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedSigId(sigId);

    const sig = placedSignatures.find((s) => s.id === sigId);
    if (!sig) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    setActiveInteraction({
      type, // 'move' | 'resize'
      sigId,
      startX: clientX,
      startY: clientY,
      origCanvasX: sig.canvasX,
      origCanvasY: sig.canvasY,
      origCanvasW: sig.canvasW,
      origCanvasH: sig.canvasH,
      aspectRatio: sig.aspectRatio || (sig.canvasW / sig.canvasH),
    });
  };

  const handlePointerMove = useCallback((e) => {
    if (!activeInteraction) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const dx = clientX - activeInteraction.startX;
    const dy = clientY - activeInteraction.startY;

    setPlacedSignatures((prev) =>
      prev.map((sig) => {
        if (sig.id !== activeInteraction.sigId) return sig;

        if (activeInteraction.type === 'move') {
          const maxLeft = canvasDimensions.width - sig.canvasW;
          const maxTop = canvasDimensions.height - sig.canvasH;

          const newX = Math.max(0, Math.min(maxLeft, activeInteraction.origCanvasX + dx));
          const newY = Math.max(0, Math.min(maxTop, activeInteraction.origCanvasY + dy));

          return {
            ...sig,
            canvasX: newX,
            canvasY: newY,
            ptX: Math.round(newX / scaleX),
            ptY: Math.round(newY / scaleY),
          };
        } else if (activeInteraction.type === 'resize') {
          const minW = 40;
          const minH = 20;
          const maxW = canvasDimensions.width - sig.canvasX;
          const maxH = canvasDimensions.height - sig.canvasY;

          let newW = Math.max(minW, Math.min(maxW, activeInteraction.origCanvasW + dx));
          let newH = newW / activeInteraction.aspectRatio;

          if (newH > maxH) {
            newH = maxH;
            newW = newH * activeInteraction.aspectRatio;
          }

          return {
            ...sig,
            canvasW: Math.round(newW),
            canvasH: Math.round(newH),
            ptW: Math.round(newW / scaleX),
            ptH: Math.round(newH / scaleY),
          };
        }
        return sig;
      })
    );
  }, [activeInteraction, canvasDimensions, scaleX, scaleY]);

  const handlePointerUp = useCallback(() => {
    setActiveInteraction(null);
  }, []);

  useEffect(() => {
    if (activeInteraction) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('touchmove', handlePointerMove, { passive: false });
      window.addEventListener('touchend', handlePointerUp);
      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('touchmove', handlePointerMove);
        window.removeEventListener('touchend', handlePointerUp);
      };
    }
  }, [activeInteraction, handlePointerMove, handlePointerUp]);

  // Handle image upload in Upload tab
  const handleSignatureImageUpload = (e) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedSigUrl(event.target.result);
    };
    reader.readAsDataURL(uploadedFile);
  };

  const handleExecuteSign = async () => {
    if (!file || placedSignatures.length === 0) return;

    setStatus('processing');
    setProgress(15);
    setError(null);

    const baseName = file.name ? file.name.replace(/\.[^/.]+$/, '') : 'document';
    let blob;
    let filename;

    try {
      try {
        const res = await signPdfPython(file, placedSignatures, (p) => setProgress(p));
        blob = res.blob;
        filename = res.filename || `${baseName}_signed.pdf`;
      } catch (backendErr) {
        console.warn('[SignPDF] Backend API error or offline, running client fallback:', backendErr);
        blob = await signPdfClient(file, placedSignatures, (p) => setProgress(p));
        filename = `${baseName}_signed.pdf`;
      }

      setProcessedResult({ blob, filename });
      setProgress(100);
      setStatus('success');
    } catch (err) {
      console.error('[SignPDF Error]:', err);
      setError(err.message || 'Failed to sign PDF document.');
      setStatus('selected');
    }
  };

  const handleDownload = () => {
    if (processedResult?.blob) {
      downloadFile(processedResult.blob, processedResult.filename, 'Sign PDF');
    }
  };

  const handleResetDocument = () => {
    setProcessedResult(null);
    setPlacedSignatures([]);
    setSelectedSigId(null);
    setThumbnails([]);
    setTotalPages(0);
    reset();
  };

  const currentPageNumber = activePageIndex + 1;
  const currentSignatures = placedSignatures.filter((s) => s.page === currentPageNumber);

  return (
    <div className="sign-pdf-container">
      {/* Top Navigation Row with Back Link */}
      <div className="tool-top-nav-row">
        <Link to="/" className="tool-back-link">
          <FontAwesomeIcon icon={faArrowLeft} />
          <span>Back to Tools</span>
        </Link>
      </div>

      {/* Hero Header */}
      <div className="sign-pdf-hero">
        <div className="sign-pdf-icon">
          <FontAwesomeIcon icon={faSignature} />
        </div>
        <h1 className="sign-pdf-title">Sign PDF</h1>
        <p className="sign-pdf-desc">
          Sign contracts, agreements, and documents online. Draw your signature, choose a handwriting style, or upload a signature image.
        </p>
      </div>

      {/* ERROR ALERT */}
      {error && (
        <div className="upload-error-alert" style={{ maxWidth: '720px', margin: '0 auto', width: '100%' }}>
          <FontAwesomeIcon icon={faCircleInfo} />
          <span>{error}</span>
        </div>
      )}

      {/* 1. UPLOAD STATE */}
      {!file && (
        <div style={{ maxWidth: '720px', margin: '0 auto', width: '100%' }}>
          <UploadBox
            onFileSelect={selectFile}
            acceptedTypes=".pdf,application/pdf"
            multiple={false}
            isDragging={isDragging}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(e, mult) => handleDrop(e, mult, '.pdf')}
            error={error}
            title="Select PDF document"
            subtitle="or drop PDF here to sign"
            buttonText="Choose PDF File"
          />
        </div>
      )}

      {/* 2. LOADING STATE */}
      {file && isLoadingPdf && (
        <div style={{ maxWidth: '540px', margin: '2.5rem auto', width: '100%' }}>
          <ProgressBar
            progress={45}
            title="Loading PDF Document..."
            statusMessage={`Loading pages for ${file.name}...`}
          />
        </div>
      )}

      {/* 3. PROCESSING STATE */}
      {file && status === 'processing' && (
        <div style={{ maxWidth: '540px', margin: '2.5rem auto', width: '100%' }}>
          <ProgressBar
            progress={progress}
            title="Signing PDF Document..."
            statusMessage="Embedding transparent signatures onto document pages..."
          />
        </div>
      )}

      {/* 4. SUCCESS DOWNLOAD STATE */}
      {file && status === 'success' && processedResult && (
        <div className="sign-success-card">
          <div className="sign-success-icon">
            <FontAwesomeIcon icon={faCircleCheck} />
          </div>
          <h2 className="sign-success-title">Your PDF is Signed and Ready!</h2>
          <p className="sign-success-desc">
            {placedSignatures.length} signature(s) successfully stamped onto <strong>{processedResult.filename}</strong>.
          </p>
          <button type="button" className="sign-download-btn" onClick={handleDownload}>
            <FontAwesomeIcon icon={faDownload} />
            <span>Download Signed PDF</span>
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ marginTop: '0.5rem', fontSize: '0.88rem' }}
            onClick={handleResetDocument}
          >
            Sign Another Document
          </button>
        </div>
      )}

      {/* 5. INTERACTIVE WORKSPACE STATE */}
      {file && !isLoadingPdf && status !== 'success' && status !== 'processing' && (
        <div className="sign-workspace-layout">
          {/* Active File Info Bar */}
          <div className="sign-file-info-bar">
            <div className="sign-file-info-left">
              <FontAwesomeIcon icon={faFilePdf} className="sign-file-pdf-icon" />
              <div className="sign-file-meta-text">
                <span className="sign-filename" title={file.name}>{file.name}</span>
                <span className="sign-filesize">
                  {formatFileSize(file.size)} • {totalPages} {totalPages === 1 ? 'page' : 'pages'}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="btn-change-file"
              onClick={handleResetDocument}
              title="Select a different PDF file"
            >
              Change PDF
            </button>
          </div>

          {/* Filmstrip All Pages Preview Bar */}
          <div className="sign-filmstrip-card">
            <div className="sign-filmstrip-header">
              <span>All Document Pages ({totalPages})</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                Click a page to sign or inspect
              </span>
            </div>
            <div className="sign-filmstrip-scroll">
              {thumbnails.map((thumb) => {
                const pageSigs = placedSignatures.filter((s) => s.page === thumb.pageNumber);
                const hasSignatures = pageSigs.length > 0;
                return (
                  <div
                    key={thumb.pageNumber}
                    className={`sign-thumb-item ${activePageIndex === thumb.pageNumber - 1 ? 'active' : ''}`}
                    onClick={() => setActivePageIndex(thumb.pageNumber - 1)}
                  >
                    <div className="sign-thumb-preview">
                      <img src={thumb.dataUrl} alt={`Page ${thumb.pageNumber}`} />
                      <div className="sign-thumb-badge">{thumb.pageNumber}</div>
                      {hasSignatures && (
                        <div className="sign-thumb-has-signatures" title={`${pageSigs.length} signature(s)`}>
                          {pageSigs.length}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Main Workspace Row: Canvas on Left, Controls on Right */}
          <div className="sign-main-grid">
            {/* DOCUMENT CANVAS STAGE */}
            <div className="sign-canvas-card">
              <div className="sign-canvas-header">
                <div className="sign-canvas-title">
                  <span>Page {currentPageNumber} of {totalPages}</span>
                  {currentSignatures.length > 0 && (
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-brand-red)', fontWeight: 600 }}>
                      ({currentSignatures.length} signature placed)
                    </span>
                  )}
                </div>

                <div className="sign-page-nav-controls">
                  <button
                    type="button"
                    className="sign-page-nav-btn"
                    onClick={() => setActivePageIndex((p) => Math.max(0, p - 1))}
                    disabled={activePageIndex === 0 || isPageRendering}
                    title="Previous Page"
                  >
                    <FontAwesomeIcon icon={faChevronLeft} />
                  </button>
                  <span className="sign-page-indicator">{currentPageNumber} / {totalPages}</span>
                  <button
                    type="button"
                    className="sign-page-nav-btn"
                    onClick={() => setActivePageIndex((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={activePageIndex >= totalPages - 1 || isPageRendering}
                    title="Next Page"
                  >
                    <FontAwesomeIcon icon={faChevronRight} />
                  </button>
                </div>
              </div>

              {/* Interactive Document Viewer Stage */}
              <div className="sign-canvas-stage" ref={pageContainerRef}>
                {isPageRendering && (
                  <div className="sign-canvas-loading-overlay">
                    <div className="sign-loading-spinner" />
                    <span>Rendering page {currentPageNumber}...</span>
                  </div>
                )}

                <div
                  className="sign-page-wrapper"
                  style={{
                    width: canvasDimensions.width || 'auto',
                    height: canvasDimensions.height || 'auto',
                  }}
                  onClick={() => setSelectedSigId(null)}
                >
                  <canvas ref={mainCanvasRef} className="sign-main-canvas" />

                  {/* Render Placed Signatures on this Page */}
                  {currentSignatures.map((sig) => {
                    const isSelected = selectedSigId === sig.id;
                    return (
                      <div
                        key={sig.id}
                        className={`placed-signature-stamp ${isSelected ? 'active' : ''}`}
                        style={{
                          left: `${sig.canvasX}px`,
                          top: `${sig.canvasY}px`,
                          width: `${sig.canvasW}px`,
                          height: `${sig.canvasH}px`,
                        }}
                        onPointerDown={(e) => startSignatureInteraction(e, sig.id, 'move')}
                      >
                        <img
                          src={sig.dataUrl}
                          alt="Signature stamp"
                          className="placed-signature-img"
                          draggable={false}
                        />

                        {/* Delete Handle */}
                        <button
                          type="button"
                          className="stamp-delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveSignature(sig.id);
                          }}
                          title="Remove signature"
                        >
                          ✕
                        </button>

                        {/* Corner Resize Handle */}
                        <div
                          className="stamp-resize-handle"
                          onPointerDown={(e) => startSignatureInteraction(e, sig.id, 'resize')}
                          title="Drag to resize"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                💡 Click and drag placed signatures to reposition them. Use the corner handle to resize.
              </div>
            </div>

            {/* CONTROLS & SIGNATURE CREATOR PANEL */}
            <div className="sign-controls-card">
              <div className="sign-controls-header">
                <FontAwesomeIcon icon={faPen} />
                <span>Create & Place Signature</span>
              </div>

              {/* Mode Tabs (Draw / Type / Upload) */}
              <div className="sign-mode-tabs">
                <button
                  type="button"
                  className={`sign-mode-tab ${creationMode === 'draw' ? 'active' : ''}`}
                  onClick={() => setCreationMode('draw')}
                >
                  <FontAwesomeIcon icon={faPen} />
                  <span>Draw</span>
                </button>
                <button
                  type="button"
                  className={`sign-mode-tab ${creationMode === 'type' ? 'active' : ''}`}
                  onClick={() => setCreationMode('type')}
                >
                  <FontAwesomeIcon icon={faKeyboard} />
                  <span>Type</span>
                </button>
                <button
                  type="button"
                  className={`sign-mode-tab ${creationMode === 'upload' ? 'active' : ''}`}
                  onClick={() => setCreationMode('upload')}
                >
                  <FontAwesomeIcon icon={faUpload} />
                  <span>Upload</span>
                </button>
              </div>

              {/* DRAW MODE TAB */}
              {creationMode === 'draw' && (
                <div className="sign-draw-area">
                  <div className="draw-canvas-box">
                    <canvas
                      ref={drawCanvasRef}
                      className="draw-canvas"
                      onMouseDown={startDrawing}
                      onMouseMove={drawMove}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={drawMove}
                      onTouchEnd={stopDrawing}
                    />
                    {!hasDrawnContent && (
                      <div className="draw-canvas-placeholder">Draw signature here</div>
                    )}
                  </div>

                  <div className="draw-toolbar">
                    <div className="color-palette-group">
                      <span className="color-palette-label">Color:</span>
                      <div className="color-palette">
                        {PEN_COLORS.map((c) => (
                          <button
                            key={c.hex}
                            type="button"
                            className={`color-swatch-btn ${penColor.toLowerCase() === c.hex.toLowerCase() ? 'active' : ''}`}
                            style={{ backgroundColor: c.hex }}
                            onClick={() => handleColorChange(c.hex)}
                            title={`${c.name} (${c.hex})`}
                          />
                        ))}
                        <label
                          className={`color-swatch-btn custom-color-picker-label ${isCustomColorActive ? 'active' : ''}`}
                          style={{
                            backgroundColor: isCustomColorActive ? penColor : 'transparent',
                            backgroundImage: !isCustomColorActive
                              ? 'conic-gradient(from 180deg at 50% 50%, #EF4444, #F59E0B, #10B981, #06B6D4, #3B82F6, #8B5CF6, #EC4899, #EF4444)'
                              : 'none',
                          }}
                          title={isCustomColorActive ? `Custom: ${penColor}` : 'Custom color picker'}
                        >
                          <input
                            type="color"
                            className="native-color-input"
                            value={penColor}
                            onChange={(e) => handleColorChange(e.target.value)}
                            aria-label="Custom signature color picker"
                          />
                        </label>
                      </div>
                      {isCustomColorActive && (
                        <span className="custom-color-badge" style={{ color: penColor }}>
                          {penColor.toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="draw-actions">
                      <button
                        type="button"
                        className="btn-draw-action"
                        onClick={clearDrawing}
                        disabled={!hasDrawnContent}
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-place-signature"
                    onClick={handleAddSignature}
                    disabled={!hasDrawnContent}
                  >
                    <FontAwesomeIcon icon={faCheck} />
                    <span>Place Drawn Signature</span>
                  </button>
                </div>
              )}

              {/* TYPE MODE TAB */}
              {creationMode === 'type' && (
                <div className="sign-type-area">
                  <input
                    type="text"
                    className="type-input"
                    placeholder="Type your name or initials..."
                    value={typedName}
                    onChange={(e) => setTypedName(e.target.value)}
                    maxLength={32}
                  />

                  <div className="draw-toolbar">
                    <div className="color-palette-group">
                      <span className="color-palette-label">Color:</span>
                      <div className="color-palette">
                        {PEN_COLORS.map((c) => (
                          <button
                            key={c.hex}
                            type="button"
                            className={`color-swatch-btn ${penColor.toLowerCase() === c.hex.toLowerCase() ? 'active' : ''}`}
                            style={{ backgroundColor: c.hex }}
                            onClick={() => handleColorChange(c.hex)}
                            title={`${c.name} (${c.hex})`}
                          />
                        ))}
                        <label
                          className={`color-swatch-btn custom-color-picker-label ${isCustomColorActive ? 'active' : ''}`}
                          style={{
                            backgroundColor: isCustomColorActive ? penColor : 'transparent',
                            backgroundImage: !isCustomColorActive
                              ? 'conic-gradient(from 180deg at 50% 50%, #EF4444, #F59E0B, #10B981, #06B6D4, #3B82F6, #8B5CF6, #EC4899, #EF4444)'
                              : 'none',
                          }}
                          title={isCustomColorActive ? `Custom: ${penColor}` : 'Custom color picker'}
                        >
                          <input
                            type="color"
                            className="native-color-input"
                            value={penColor}
                            onChange={(e) => handleColorChange(e.target.value)}
                            aria-label="Custom signature color picker"
                          />
                        </label>
                      </div>
                      {isCustomColorActive && (
                        <span className="custom-color-badge" style={{ color: penColor }}>
                          {penColor.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Choose Style:</span>
                  </div>

                  <div className="font-preview-list">
                    {HANDWRITING_FONTS.map((fontItem, idx) => (
                      <div
                        key={fontItem.name}
                        className={`font-preview-item ${selectedFontIndex === idx ? 'active' : ''}`}
                        onClick={() => setSelectedFontIndex(idx)}
                        title={`Select ${fontItem.name} (${fontItem.styleName})`}
                      >
                        <div className="font-preview-main">
                          <span
                            className="font-preview-text"
                            style={{ fontFamily: fontItem.font, color: penColor }}
                          >
                            {typedName.trim() || 'Your Signature'}
                          </span>
                        </div>
                        <div className="font-info-col">
                          <span className="font-tag-name">{fontItem.name}</span>
                          <span className="font-tag-desc">{fontItem.styleName}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="btn-place-signature"
                    onClick={handleAddSignature}
                    disabled={!typedName.trim()}
                  >
                    <FontAwesomeIcon icon={faCheck} />
                    <span>Place Typed Signature</span>
                  </button>
                </div>
              )}

              {/* UPLOAD MODE TAB */}
              {creationMode === 'upload' && (
                <div className="sign-upload-area">
                  <label className="upload-sig-dropzone">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      style={{ display: 'none' }}
                      onChange={handleSignatureImageUpload}
                    />
                    <FontAwesomeIcon icon={faUpload} style={{ fontSize: '1.4rem', color: 'var(--color-brand-red)' }} />
                    <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Click to upload signature</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                      PNG with transparent background recommended
                    </span>
                  </label>

                  {uploadedSigUrl && (
                    <div className="upload-sig-preview">
                      <img src={uploadedSigUrl} alt="Uploaded signature" />
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn-place-signature"
                    onClick={handleAddSignature}
                    disabled={!uploadedSigUrl}
                  >
                    <FontAwesomeIcon icon={faCheck} />
                    <span>Place Uploaded Signature</span>
                  </button>
                </div>
              )}

              {/* Quick Elements Section */}
              <div className="quick-elements-section">
                <span className="quick-elements-label">Quick Stamp Elements</span>
                <div className="quick-elements-grid">
                  <button type="button" className="btn-quick-stamp" onClick={handleAddDateStamp}>
                    <FontAwesomeIcon icon={faCalendarDay} />
                    <span>Today's Date</span>
                  </button>
                  <button
                    type="button"
                    className="btn-quick-stamp"
                    onClick={() => {
                      setCreationMode('type');
                      setTypedName('INITIALS');
                    }}
                  >
                    <FontAwesomeIcon icon={faFont} />
                    <span>Initials</span>
                  </button>
                </div>
              </div>

              {/* Placed Signatures Summary */}
              {placedSignatures.length > 0 && (
                <div className="placed-signatures-card">
                  <div className="placed-signatures-header">
                    <span>Placed Signatures ({placedSignatures.length})</span>
                    <button
                      type="button"
                      className="btn-remove-sig"
                      onClick={() => setPlacedSignatures([])}
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="placed-signatures-list">
                    {placedSignatures.map((s, idx) => (
                      <div key={s.id} className="placed-item-row">
                        <div className="placed-item-info">
                          <span>#{idx + 1}</span>
                          <span>Page {s.page}</span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                            ({s.ptW}×{s.ptH} pt)
                          </span>
                        </div>
                        <button
                          type="button"
                          className="btn-remove-sig"
                          onClick={() => handleRemoveSignature(s.id)}
                          title="Remove signature"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Primary Action Button */}
              <button
                type="button"
                className="btn-execute-sign"
                disabled={placedSignatures.length === 0 || isLoadingPdf || status === 'processing'}
                onClick={handleExecuteSign}
              >
                <FontAwesomeIcon icon={faSignature} />
                <span>
                  {placedSignatures.length === 0
                    ? 'Place Signature on Document'
                    : `Sign PDF Document (${placedSignatures.length})`}
                </span>
              </button>

              <button
                type="button"
                className="btn btn-ghost"
                style={{ width: '100%', fontSize: '0.85rem' }}
                onClick={handleResetDocument}
              >
                Choose Another Document
              </button>

              {/* Transparent Legal / Electronic Signature Disclaimer */}
              <div className="sign-legal-disclaimer">
                <FontAwesomeIcon icon={faCircleInfo} style={{ marginTop: '2px', flexShrink: 0 }} />
                <span>
                  <strong>Standard Electronic Signature:</strong> Adds an image-based electronic signature to your document. This is not a digital certificate (PKI / cryptographic token) signature.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

