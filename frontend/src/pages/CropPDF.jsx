import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowLeft, 
  faCropSimple, 
  faCheck, 
  faDownload, 
  faArrowRotateLeft, 
  faWandMagicSparkles, 
  faLayerGroup, 
  faCircleCheck,
  faSliders,
  faCircleInfo,
  faArrowsUpDownLeftRight,
  faEye,
  faExpand
} from '@fortawesome/free-solid-svg-icons';
import { pdfjsLib } from '../utils/pdfjsConfig';
import UploadBox from '../components/UploadBox';
import ProgressBar from '../components/ProgressBar';
import { useFileUpload } from '../hooks/useFileUpload';
import { downloadFile } from '../utils/fileUtils';
import { formatFileSize } from '../utils/formatFileSize';
import { cropPdf } from '../utils/pdfProcessor';
import { cropPdfPython } from '../services/api';
import './CropPDF.css';

const PRESETS = [
  { label: '0.5 in (36 pt)', top: 36, bottom: 36, left: 36, right: 36 },
  { label: '0.75 in (54 pt)', top: 54, bottom: 54, left: 54, right: 54 },
  { label: '1.0 in (72 pt)', top: 72, bottom: 72, left: 72, right: 72 },
  { label: 'Full Page (0 pt)', top: 0, bottom: 0, left: 0, right: 0 },
];

export default function CropPDF() {
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

  const [totalPages, setTotalPages] = useState(0);
  const [thumbnails, setThumbnails] = useState([]);
  const [activePageIndex, setActivePageIndex] = useState(0); // 0-based
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [isPageRendering, setIsPageRendering] = useState(false);
  const [pdfDocProxy, setPdfDocProxy] = useState(null);

  // View mode: 'crop' (interactive box) | 'preview' (trimmed view)
  const [viewMode, setViewMode] = useState('crop');

  // Crop margins in points (pt)
  const [margins, setMargins] = useState({ top: 36, bottom: 36, left: 36, right: 36 });
  const [cropScope, setCropScope] = useState('all'); // 'all' | 'current' | 'range'
  const [customRange, setCustomRange] = useState('');
  const [processedResult, setProcessedResult] = useState(null);

  // Canvas & Page Measurements
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const renderTaskRef = useRef(null);

  const [pageSizePt, setPageSizePt] = useState({ width: 612, height: 792 }); // Unscaled PDF point dimensions
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 480, height: 620 });

  // Interactive Dragging State
  const [draggingHandle, setDraggingHandle] = useState(null);
  const dragStartRef = useRef({ x: 0, y: 0, initialMargins: { ...margins } });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // 1. Load PDF Document & render filmstrip thumbnails
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

        const loadedThumbs = [];
        for (let i = 1; i <= count; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.3 });
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({ canvasContext: ctx, viewport }).promise;
          loadedThumbs.push({
            pageNumber: i,
            dataUrl: canvas.toDataURL('image/jpeg', 0.8),
            width: viewport.width,
            height: viewport.height
          });
        }

        if (isMounted) {
          setThumbnails(loadedThumbs);
          setActivePageIndex(0);
          setIsLoadingPdf(false);
        }
      } catch (err) {
        console.error('[CropPDF Load Error]:', err);
        if (isMounted) {
          setError('Failed to load PDF document for cropping. Please ensure the file is not damaged.');
          setIsLoadingPdf(false);
        }
      }
    };

    loadPdf();
    return () => { isMounted = false; };
  }, [file]);

  // 2. Render high-res active page onto main interactive canvas
  useEffect(() => {
    if (!pdfDocProxy || totalPages === 0) return;

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

        // Unscaled points
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const ptWidth = unscaledViewport.width;
        const ptHeight = unscaledViewport.height;
        setPageSizePt({ width: ptWidth, height: ptHeight });

        // Calculate fitting scale for comfortable viewport (approx 480-540px width)
        const containerWidth = containerRef.current ? containerRef.current.clientWidth : 540;
        const targetMaxWidth = Math.min(Math.max(340, containerWidth - 48), 540);
        const scale = Math.min(targetMaxWidth / ptWidth, 680 / ptHeight);

        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas || isCancelled) return;

        const ctx = canvas.getContext('2d');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        setCanvasDimensions({ width: canvas.width, height: canvas.height });

        const task = page.render({ canvasContext: ctx, viewport });
        renderTaskRef.current = task;
        await task.promise;

        if (!isCancelled) {
          setIsPageRendering(false);
        }
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('[CropPDF Page Render Error]:', err);
        }
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
  }, [pdfDocProxy, activePageIndex, totalPages]);

  // Scale ratio: Canvas Pixels per PDF Point
  const scaleX = canvasDimensions.width > 0 && pageSizePt.width > 0 ? canvasDimensions.width / pageSizePt.width : 1;
  const scaleY = canvasDimensions.height > 0 && pageSizePt.height > 0 ? canvasDimensions.height / pageSizePt.height : 1;

  // Pixel coordinates of crop box on the canvas
  const cropBoxPx = {
    x: Math.round(margins.left * scaleX),
    y: Math.round(margins.top * scaleY),
    width: Math.max(30, Math.round(canvasDimensions.width - (margins.left + margins.right) * scaleX)),
    height: Math.max(30, Math.round(canvasDimensions.height - (margins.top + margins.bottom) * scaleY))
  };

  // Dragging event handlers for interactive handles
  const handlePointerDown = (handle, e) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingHandle(handle);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialMargins: { ...margins }
    };
  };

  const handlePointerMove = useCallback((e) => {
    if (!draggingHandle || canvasDimensions.width === 0 || canvasDimensions.height === 0) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const dxPt = dx / scaleX;
    const dyPt = dy / scaleY;

    const init = dragStartRef.current.initialMargins;
    const minRemainW = 40;
    const minRemainH = 40;

    let newTop = init.top;
    let newBottom = init.bottom;
    let newLeft = init.left;
    let newRight = init.right;

    if (draggingHandle === 'move') {
      const currentBoxW = pageSizePt.width - init.left - init.right;
      const currentBoxH = pageSizePt.height - init.top - init.bottom;

      newLeft = Math.max(0, Math.min(pageSizePt.width - currentBoxW, init.left + dxPt));
      newRight = pageSizePt.width - currentBoxW - newLeft;
      newTop = Math.max(0, Math.min(pageSizePt.height - currentBoxH, init.top + dyPt));
      newBottom = pageSizePt.height - currentBoxH - newTop;
    } else {
      if (draggingHandle.includes('t') || draggingHandle === 'top') {
        newTop = Math.max(0, Math.min(pageSizePt.height - init.bottom - minRemainH, init.top + dyPt));
      }
      if (draggingHandle.includes('b') || draggingHandle === 'bottom') {
        newBottom = Math.max(0, Math.min(pageSizePt.height - init.top - minRemainH, init.bottom - dyPt));
      }
      if (draggingHandle.includes('l') || draggingHandle === 'left') {
        newLeft = Math.max(0, Math.min(pageSizePt.width - init.right - minRemainW, init.left + dxPt));
      }
      if (draggingHandle.includes('r') || draggingHandle === 'right') {
        newRight = Math.max(0, Math.min(pageSizePt.width - init.left - minRemainW, init.right - dxPt));
      }
    }

    setMargins({
      top: Math.round(newTop),
      bottom: Math.round(newBottom),
      left: Math.round(newLeft),
      right: Math.round(newRight)
    });
  }, [draggingHandle, canvasDimensions, scaleX, scaleY, pageSizePt]);

  const handlePointerUp = useCallback(() => {
    setDraggingHandle(null);
  }, []);

  useEffect(() => {
    if (draggingHandle) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };
    }
  }, [draggingHandle, handlePointerMove, handlePointerUp]);

  // Execute Lossless PDF Crop
  const handleExecuteCrop = async () => {
    if (!file) return;

    setStatus('processing');
    setProgress(20);
    setError(null);

    const baseName = file.name ? file.name.replace(/\.[^/.]+$/, '') : 'document';
    
    let pageRangeArg = 'all';
    if (cropScope === 'current') {
      pageRangeArg = String(activePageIndex + 1);
    } else if (cropScope === 'range' && customRange.trim()) {
      pageRangeArg = customRange.trim();
    }

    const cropOptions = {
      cropMargins: {
        top: Number(margins.top) || 0,
        bottom: Number(margins.bottom) || 0,
        left: Number(margins.left) || 0,
        right: Number(margins.right) || 0
      },
      pageRange: pageRangeArg
    };

    try {
      let blob;
      let filename;

      try {
        const res = await cropPdfPython(file, cropOptions, (p) => setProgress(p));
        blob = res.blob;
        filename = res.filename || `${baseName}_cropped.pdf`;
      } catch (backendErr) {
        console.warn('[CropPDF] Backend API error or offline, running client fallback:', backendErr);
        blob = await cropPdf(file, cropOptions, (p) => setProgress(p));
        filename = `${baseName}_cropped.pdf`;
      }

      setProcessedResult({ blob, filename });
      setProgress(100);
      setStatus('success');
    } catch (err) {
      console.error('[CropPDF Error]:', err);
      setError(err.message || 'Failed to crop PDF document.');
      setStatus('selected');
    }
  };

  const handleDownload = () => {
    if (processedResult) {
      downloadFile(processedResult.blob, processedResult.filename, 'Crop PDF');
    }
  };

  const handleFullReset = () => {
    setProcessedResult(null);
    setThumbnails([]);
    setTotalPages(0);
    setMargins({ top: 36, bottom: 36, left: 36, right: 36 });
    setCropScope('all');
    reset();
  };

  const remainingPtWidth = Math.max(0, Math.round(pageSizePt.width - margins.left - margins.right));
  const remainingPtHeight = Math.max(0, Math.round(pageSizePt.height - margins.top - margins.bottom));

  return (
    <div className="crop-pdf-container">
      {/* Top Navigation Row with Back Button */}
      <div className="tool-top-nav-row">
        <Link to="/" className="tool-back-link">
          <FontAwesomeIcon icon={faArrowLeft} />
          <span>Back to Tools</span>
        </Link>
      </div>

      {/* HEADER SECTION */}
      <div className="crop-pdf-hero">
        <div className="crop-pdf-icon">
          <FontAwesomeIcon icon={faCropSimple} />
        </div>
        <div className="capability-chip">
          <FontAwesomeIcon icon={faWandMagicSparkles} /> PyMuPDF ISO-Standard Crop Engine
        </div>
        <h1 className="crop-pdf-title">Crop PDF Pages</h1>
        <p className="crop-pdf-desc">
          Visually crop and trim document margins. Inspect all pages and drag interactive crop handles directly on your document.
        </p>
      </div>

      {/* ERROR ALERT */}
      {error && (
        <div className="error-alert" style={{ maxWidth: '820px', margin: '0 auto', width: '100%' }}>
          <span>{error}</span>
        </div>
      )}

      {/* UPLOAD SCREEN */}
      {(status === 'idle' || (status === 'error' && !file)) && (
        <div style={{ maxWidth: '720px', margin: '0 auto', width: '100%' }}>
          <UploadBox
            onFileSelect={selectFile}
            accept=".pdf"
            multiple={false}
            isDragging={isDragging}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            title="Choose a PDF document to crop"
            subtitle="Drag & drop your PDF file here, or click to browse"
            buttonLabel="Select PDF File"
            fileLimitInfo="Supports PDF files up to 50MB"
          />
        </div>
      )}

      {/* PROCESSING SCREEN */}
      {status === 'processing' && (
        <div style={{ maxWidth: '540px', margin: '2.5rem auto', width: '100%' }}>
          <ProgressBar
            progress={progress}
            title="Cropping PDF Document..."
            statusMessage="Trimming CropBox & MediaBox boundaries losslessly..."
          />
        </div>
      )}

      {/* SUCCESS / DOWNLOAD SCREEN */}
      {status === 'success' && processedResult && (
        <div className="result-card" style={{ maxWidth: '640px', margin: '2rem auto', width: '100%' }}>
          <div className="result-icon-box">
            <FontAwesomeIcon icon={faCheck} size="2x" />
          </div>
          <h2 className="result-title">Your Cropped PDF is Ready!</h2>
          <p className="result-filename">{processedResult.filename}</p>
          <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center', marginBottom: '1.5rem', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            <span>Size: {formatFileSize(processedResult.blob.size)}</span>
            <span>Target: {cropScope === 'all' ? `All Pages (${totalPages})` : cropScope === 'current' ? `Page ${activePageIndex + 1}` : customRange}</span>
          </div>

          <div className="result-actions">
            <button type="button" onClick={handleDownload} className="btn btn-primary">
              <FontAwesomeIcon icon={faDownload} /> Download Cropped PDF
            </button>
            <button type="button" onClick={handleFullReset} className="btn btn-secondary">
              <FontAwesomeIcon icon={faArrowRotateLeft} /> Crop Another Document
            </button>
          </div>
        </div>
      )}

      {/* WORKSPACE AREA (WHEN FILE IS SELECTED) */}
      {(status === 'selected' || (status === 'error' && file)) && file && (
        <div className="crop-workspace-layout">
          
          {/* ALL PAGES FILMSTRIP / CAROUSEL BAR */}
          <div className="crop-filmstrip-card">
            <div className="filmstrip-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FontAwesomeIcon icon={faLayerGroup} style={{ color: 'var(--color-primary)' }} />
                <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--color-heading)' }}>
                  All Document Pages ({totalPages})
                </span>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                Viewing Page <strong>{activePageIndex + 1}</strong> of {totalPages} (Click any page thumbnail below to inspect)
              </span>
            </div>

            <div className="filmstrip-scroll-area">
              {thumbnails.map((t, idx) => (
                <div
                  key={t.pageNumber}
                  className={`filmstrip-thumb-item ${activePageIndex === idx ? 'active' : ''}`}
                  onClick={() => setActivePageIndex(idx)}
                  title={`Click to preview and crop Page ${t.pageNumber}`}
                >
                  <div className="thumb-img-wrapper">
                    <img src={t.dataUrl} alt={`Page ${t.pageNumber}`} />
                    
                    {/* Miniature Crop Outline showing decreased crop area on each page */}
                    {(cropScope === 'all' || activePageIndex === idx) && (
                      <div 
                        className="thumb-crop-cutout"
                        style={{
                          top: `${Math.min(45, (margins.top / pageSizePt.height) * 100)}%`,
                          bottom: `${Math.min(45, (margins.bottom / pageSizePt.height) * 100)}%`,
                          left: `${Math.min(45, (margins.left / pageSizePt.width) * 100)}%`,
                          right: `${Math.min(45, (margins.right / pageSizePt.width) * 100)}%`,
                        }}
                      />
                    )}

                    <span className="thumb-page-badge">{t.pageNumber}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="crop-main-workspace-row">
            {/* VISUAL INTERACTIVE CROP CANVAS */}
            <div className="crop-canvas-card">
              <div className="crop-canvas-header">
                <div>
                  <div className="canvas-header-title">
                    <FontAwesomeIcon icon={faArrowsUpDownLeftRight} /> Interactive Page Preview (Page {activePageIndex + 1})
                  </div>
                  <div className="canvas-header-sub">
                    {viewMode === 'crop' 
                      ? 'Drag handles or the blue box to visually trim margins. Content inside the box is kept.' 
                      : 'Live preview of the trimmed document after applying crop.'}
                  </div>
                </div>

                {/* View Mode Toggle: Interactive Box vs Trimmed Document */}
                <div className="crop-view-toggle">
                  <button
                    type="button"
                    className={`view-mode-btn ${viewMode === 'crop' ? 'active' : ''}`}
                    onClick={() => setViewMode('crop')}
                    title="Interactive crop box with adjustable handles"
                  >
                    <FontAwesomeIcon icon={faCropSimple} />
                    <span>Crop Box</span>
                  </button>
                  <button
                    type="button"
                    className={`view-mode-btn ${viewMode === 'preview' ? 'active' : ''}`}
                    onClick={() => setViewMode('preview')}
                    title="Preview document with margins trimmed"
                  >
                    <FontAwesomeIcon icon={faEye} />
                    <span>Trimmed Preview</span>
                  </button>
                </div>
              </div>

              <div className="canvas-viewport-container" ref={containerRef}>
                {isPageRendering && (
                  <div className="canvas-loading-overlay">
                    <div className="loading-spinner"></div>
                    <span>Rendering page...</span>
                  </div>
                )}

                {/* MODE 1: INTERACTIVE CROP BOX OVERLAY */}
                {viewMode === 'crop' && (
                  <div 
                    className="canvas-stage-wrapper" 
                    style={{ 
                      width: canvasDimensions.width || 'auto', 
                      height: canvasDimensions.height || 'auto' 
                    }}
                  >
                    {/* Underlying High-Resolution Document Canvas */}
                    <canvas ref={canvasRef} className="page-render-canvas" />

                    {/* Darkened Backdrop Overlays Outside Crop Area */}
                    <div className="dim-mask top" style={{ top: 0, left: 0, right: 0, height: cropBoxPx.y }} />
                    <div className="dim-mask bottom" style={{ top: cropBoxPx.y + cropBoxPx.height, left: 0, right: 0, bottom: 0 }} />
                    <div className="dim-mask left" style={{ top: cropBoxPx.y, left: 0, width: cropBoxPx.x, height: cropBoxPx.height }} />
                    <div className="dim-mask right" style={{ top: cropBoxPx.y, left: cropBoxPx.x + cropBoxPx.width, right: 0, height: cropBoxPx.height }} />

                    {/* Interactive Draggable & Resizable Crop Box */}
                    <div
                      className={`visual-crop-box ${draggingHandle ? 'active-dragging' : ''}`}
                      style={{
                        left: cropBoxPx.x,
                        top: cropBoxPx.y,
                        width: cropBoxPx.width,
                        height: cropBoxPx.height
                      }}
                      onPointerDown={(e) => handlePointerDown('move', e)}
                    >
                      {/* Live Dimension Tag */}
                      <div className="crop-dimension-pill">
                        {remainingPtWidth} × {remainingPtHeight} pt
                        <span style={{ opacity: 0.75, marginLeft: '4px' }}>
                          ({(remainingPtWidth / 72).toFixed(2)}″ × {(remainingPtHeight / 72).toFixed(2)}″)
                        </span>
                      </div>

                      {/* 4 Corner Handles */}
                      <div className="crop-handle handle-tl" onPointerDown={(e) => handlePointerDown('tl', e)} title="Resize top-left" />
                      <div className="crop-handle handle-tr" onPointerDown={(e) => handlePointerDown('tr', e)} title="Resize top-right" />
                      <div className="crop-handle handle-bl" onPointerDown={(e) => handlePointerDown('bl', e)} title="Resize bottom-left" />
                      <div className="crop-handle handle-br" onPointerDown={(e) => handlePointerDown('br', e)} title="Resize bottom-right" />

                      {/* 4 Edge Handles */}
                      <div className="crop-handle handle-t" onPointerDown={(e) => handlePointerDown('top', e)} title="Resize top" />
                      <div className="crop-handle handle-b" onPointerDown={(e) => handlePointerDown('bottom', e)} title="Resize bottom" />
                      <div className="crop-handle handle-l" onPointerDown={(e) => handlePointerDown('left', e)} title="Resize left" />
                      <div className="crop-handle handle-r" onPointerDown={(e) => handlePointerDown('right', e)} title="Resize right" />
                    </div>
                  </div>
                )}

                {/* MODE 2: TRIMMED DOCUMENT PREVIEW (Decreased size reflecting the crop) */}
                {viewMode === 'preview' && (
                  <div className="trimmed-preview-stage">
                    <div 
                      className="trimmed-viewport-box"
                      style={{
                        width: cropBoxPx.width,
                        height: cropBoxPx.height,
                      }}
                    >
                      <div style={{
                        position: 'absolute',
                        left: -cropBoxPx.x,
                        top: -cropBoxPx.y,
                        width: canvasDimensions.width,
                        height: canvasDimensions.height,
                      }}>
                        {/* Cloned page canvas representation */}
                        {canvasRef.current && (
                          <img 
                            src={canvasRef.current.toDataURL()} 
                            alt="Trimmed Preview" 
                            style={{ display: 'block', width: canvasDimensions.width, height: canvasDimensions.height }}
                          />
                        )}
                      </div>
                    </div>
                    <div className="trimmed-info-tag">
                      Trimmed Preview: {remainingPtWidth} × {remainingPtHeight} pt
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* CONTROLS & MARGIN SETTINGS PANEL */}
            <div className="crop-settings-panel">
              <div className="panel-header">
                <FontAwesomeIcon icon={faSliders} />
                <span>Crop Settings</span>
              </div>

              {/* Quick Presets */}
              <div className="crop-section">
                <label className="crop-section-label">Quick Margin Presets:</label>
                <div className="crop-presets-grid">
                  {PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="preset-chip-btn"
                      onClick={() => setMargins({ top: p.top, bottom: p.bottom, left: p.left, right: p.right })}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Numeric Margin Inputs (Synchronized with visual handles) */}
              <div className="crop-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="crop-section-label">Margins in Points (pt):</label>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>72 pt = 1 inch</span>
                </div>
                <div className="margin-inputs-grid">
                  <div className="margin-field">
                    <span>Top:</span>
                    <input
                      type="number"
                      min="0"
                      max={Math.round(pageSizePt.height - 40)}
                      value={margins.top}
                      onChange={(e) => setMargins(m => ({ ...m, top: Math.max(0, parseInt(e.target.value) || 0) }))}
                    />
                  </div>
                  <div className="margin-field">
                    <span>Bottom:</span>
                    <input
                      type="number"
                      min="0"
                      max={Math.round(pageSizePt.height - 40)}
                      value={margins.bottom}
                      onChange={(e) => setMargins(m => ({ ...m, bottom: Math.max(0, parseInt(e.target.value) || 0) }))}
                    />
                  </div>
                  <div className="margin-field">
                    <span>Left:</span>
                    <input
                      type="number"
                      min="0"
                      max={Math.round(pageSizePt.width - 40)}
                      value={margins.left}
                      onChange={(e) => setMargins(m => ({ ...m, left: Math.max(0, parseInt(e.target.value) || 0) }))}
                    />
                  </div>
                  <div className="margin-field">
                    <span>Right:</span>
                    <input
                      type="number"
                      min="0"
                      max={Math.round(pageSizePt.width - 40)}
                      value={margins.right}
                      onChange={(e) => setMargins(m => ({ ...m, right: Math.max(0, parseInt(e.target.value) || 0) }))}
                    />
                  </div>
                </div>
              </div>

              {/* Target Page Scope */}
              <div className="crop-section">
                <label className="crop-section-label">Apply Crop To:</label>
                <div className="scope-radio-group">
                  <label className={`scope-radio-btn ${cropScope === 'all' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="cropScope"
                      checked={cropScope === 'all'}
                      onChange={() => setCropScope('all')}
                    />
                    <span>All Document Pages ({totalPages})</span>
                  </label>
                  <label className={`scope-radio-btn ${cropScope === 'current' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="cropScope"
                      checked={cropScope === 'current'}
                      onChange={() => setCropScope('current')}
                    />
                    <span>Current Page Only (Page {activePageIndex + 1})</span>
                  </label>
                  <label className={`scope-radio-btn ${cropScope === 'range' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="cropScope"
                      checked={cropScope === 'range'}
                      onChange={() => setCropScope('range')}
                    />
                    <span>Specific Page Range</span>
                  </label>
                </div>

                {cropScope === 'range' && (
                  <input
                    type="text"
                    className="custom-range-input"
                    placeholder="e.g. 1-3, 5"
                    value={customRange}
                    onChange={(e) => setCustomRange(e.target.value)}
                  />
                )}
              </div>

              {/* Lossless Quality Note */}
              <div className="crop-info-callout">
                <FontAwesomeIcon icon={faCircleInfo} />
                <span>
                  <strong>Lossless ISO Crop:</strong> Adjusts document boundary boxes (CropBox & MediaBox) conforming to ISO 32000-1 without rasterizing or losing text searchability.
                </span>
              </div>

              {/* Action Buttons */}
              <button
                type="button"
                className="btn-process-action"
                onClick={handleExecuteCrop}
                disabled={isLoadingPdf || isPageRendering}
              >
                <FontAwesomeIcon icon={faCropSimple} />
                <span>Crop PDF Pages Now</span>
              </button>

              <button
                type="button"
                className="btn btn-ghost"
                style={{ width: '100%', fontSize: '0.85rem' }}
                onClick={handleFullReset}
              >
                Choose Another Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
