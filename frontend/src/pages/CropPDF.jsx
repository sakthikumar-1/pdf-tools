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
  { label: 'Reset (0 pt)', top: 0, bottom: 0, left: 0, right: 0 },
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
  const [thumbnails, setThumbnails] = useState([]); // array of { pageNumber, dataUrl, width, height }
  const [activePageIndex, setActivePageIndex] = useState(0); // 0-based
  const [isRendering, setIsRendering] = useState(false);
  const [pdfDocProxy, setPdfDocProxy] = useState(null);

  // Crop margins in points (pt)
  const [margins, setMargins] = useState({ top: 36, bottom: 36, left: 36, right: 36 });
  const [cropScope, setCropScope] = useState('all'); // 'all' | 'current' | 'range'
  const [customRange, setCustomRange] = useState('');
  const [processedResult, setProcessedResult] = useState(null);

  // Visual Interactive Canvas & Handles
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [pageSizePt, setPageSizePt] = useState({ width: 612, height: 792 }); // default standard Letter
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });

  // Dragging state for visual crop overlay
  const [draggingHandle, setDraggingHandle] = useState(null); // 'move' | 'top' | 'bottom' | 'left' | 'right' | 'tl' | 'tr' | 'bl' | 'br'
  const dragStartRef = useRef({ x: 0, y: 0, initialMargins: { ...margins } });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // 1. Render all page thumbnails & initialize PDF doc
  useEffect(() => {
    if (!file) return;

    let isMounted = true;
    const loadPdf = async () => {
      try {
        setIsRendering(true);
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (!isMounted) return;

        setPdfDocProxy(pdf);
        const count = pdf.numPages;
        setTotalPages(count);

        const loadedThumbs = [];
        for (let i = 1; i <= count; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.35 });
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
          setIsRendering(false);
        }
      } catch (err) {
        console.error('[CropPDF Load Error]:', err);
        if (isMounted) {
          setError('Failed to load PDF pages for cropping. Ensure file is not corrupt.');
          setIsRendering(false);
        }
      }
    };

    loadPdf();
    return () => { isMounted = false; };
  }, [file]);

  // 2. Render high-res active page onto main interactive canvas
  useEffect(() => {
    if (!pdfDocProxy || totalPages === 0) return;

    let isMounted = true;
    const renderActivePage = async () => {
      try {
        const pageNumber = activePageIndex + 1;
        const page = await pdfDocProxy.getPage(pageNumber);
        
        // Get unscaled PDF point size
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        setPageSizePt({ width: unscaledViewport.width, height: unscaledViewport.height });

        // Fit inside preview container (approx 520px max width/height)
        const containerMaxWidth = Math.min(window.innerWidth > 960 ? 560 : 360, window.innerWidth - 60);
        const fitScale = Math.min(containerMaxWidth / unscaledViewport.width, 680 / unscaledViewport.height);
        const scale = Math.max(fitScale, 0.4);

        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        setCanvasDimensions({ width: viewport.width, height: viewport.height });

        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch (err) {
        console.error('[CropPDF Page Render Error]:', err);
      }
    };

    renderActivePage();
  }, [pdfDocProxy, activePageIndex, totalPages]);

  // Conversion helpers between Canvas Pixels and PDF Points (pt)
  const scaleX = canvasDimensions.width > 0 ? canvasDimensions.width / pageSizePt.width : 1;
  const scaleY = canvasDimensions.height > 0 ? canvasDimensions.height / pageSizePt.height : 1;

  // Pixel coordinates of crop box inside canvas
  const cropBoxPx = {
    x: margins.left * scaleX,
    y: margins.top * scaleY,
    width: Math.max(20, canvasDimensions.width - (margins.left + margins.right) * scaleX),
    height: Math.max(20, canvasDimensions.height - (margins.top + margins.bottom) * scaleY)
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
    const maxPtW = pageSizePt.width - 40;
    const maxPtH = pageSizePt.height - 40;

    let newTop = init.top;
    let newBottom = init.bottom;
    let newLeft = init.left;
    let newRight = init.right;

    if (draggingHandle === 'move') {
      // Reposition box without resizing
      newLeft = Math.max(0, Math.min(pageSizePt.width - (pageSizePt.width - init.left - init.right), init.left + dxPt));
      newRight = pageSizePt.width - (newLeft + (pageSizePt.width - init.left - init.right));
      newTop = Math.max(0, Math.min(pageSizePt.height - (pageSizePt.height - init.top - init.bottom), init.top + dyPt));
      newBottom = pageSizePt.height - (newTop + (pageSizePt.height - init.top - init.bottom));
    } else {
      if (draggingHandle.includes('t') || draggingHandle === 'top') {
        newTop = Math.max(0, Math.min(pageSizePt.height - init.bottom - 40, init.top + dyPt));
      }
      if (draggingHandle.includes('b') || draggingHandle === 'bottom') {
        newBottom = Math.max(0, Math.min(pageSizePt.height - init.top - 40, init.bottom - dyPt));
      }
      if (draggingHandle.includes('l') || draggingHandle === 'left') {
        newLeft = Math.max(0, Math.min(pageSizePt.width - init.right - 40, init.left + dxPt));
      }
      if (draggingHandle.includes('r') || draggingHandle === 'right') {
        newRight = Math.max(0, Math.min(pageSizePt.width - init.left - 40, init.right - dxPt));
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

  // Execute Crop
  const handleExecuteCrop = async () => {
    if (!file) return;

    setStatus('processing');
    setProgress(15);
    setError(null);

    const baseName = file.name ? file.name.replace(/\.[^/.]+$/, '') : 'document';
    
    // Determine target page range
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

      // 1. Try Python Django Ninja backend
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
          <h2 className="result-title">PDF Cropped Successfully!</h2>
          <p className="result-filename">{processedResult.filename}</p>
          <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center', marginBottom: '1.5rem', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            <span>Size: {formatFileSize(processedResult.blob.size)}</span>
            <span>Target: {cropScope === 'all' ? 'All Pages' : cropScope === 'current' ? `Page ${activePageIndex + 1}` : customRange}</span>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={handleDownload} className="btn-process-action" style={{ minWidth: '190px' }}>
              <FontAwesomeIcon icon={faDownload} /> Download Cropped PDF
            </button>
            <button onClick={handleFullReset} className="btn-secondary-sm" style={{ padding: '0.75rem 1.25rem' }}>
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
                Viewing Page <strong>{activePageIndex + 1}</strong> of {totalPages}
              </span>
            </div>

            <div className="filmstrip-scroll-area">
              {thumbnails.map((t, idx) => (
                <div
                  key={t.pageNumber}
                  className={`filmstrip-thumb-item ${activePageIndex === idx ? 'active' : ''}`}
                  onClick={() => setActivePageIndex(idx)}
                  title={`Click to preview Page ${t.pageNumber}`}
                >
                  <div className="thumb-img-wrapper">
                    <img src={t.dataUrl} alt={`Page ${t.pageNumber}`} />
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
                <span className="canvas-header-title">
                  <FontAwesomeIcon icon={faArrowsUpDownLeftRight} /> Interactive Page Preview
                </span>
                <span className="canvas-header-sub">
                  Drag the handles or the crop box to trim margins visually
                </span>
              </div>

              <div className="canvas-viewport-container" ref={containerRef}>
                {isRendering ? (
                  <div className="rendering-placeholder">
                    <div className="loading-spinner"></div>
                    <span>Rendering page canvas...</span>
                  </div>
                ) : (
                  <div 
                    className="canvas-stage-wrapper" 
                    style={{ 
                      width: canvasDimensions.width || 'auto', 
                      height: canvasDimensions.height || 'auto' 
                    }}
                  >
                    {/* The Underlying High-Res Page Canvas */}
                    <canvas ref={canvasRef} className="page-render-canvas" />

                    {/* Semi-transparent Dimmed Backdrop Overlays Outside Crop Area */}
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
                        {Math.round(pageSizePt.width - margins.left - margins.right)} × {Math.round(pageSizePt.height - margins.top - margins.bottom)} pt
                      </div>

                      {/* 4 Corner Handles */}
                      <div className="crop-handle handle-tl" onPointerDown={(e) => handlePointerDown('tl', e)} />
                      <div className="crop-handle handle-tr" onPointerDown={(e) => handlePointerDown('tr', e)} />
                      <div className="crop-handle handle-bl" onPointerDown={(e) => handlePointerDown('bl', e)} />
                      <div className="crop-handle handle-br" onPointerDown={(e) => handlePointerDown('br', e)} />

                      {/* 4 Edge Handles */}
                      <div className="crop-handle handle-t" onPointerDown={(e) => handlePointerDown('top', e)} />
                      <div className="crop-handle handle-b" onPointerDown={(e) => handlePointerDown('bottom', e)} />
                      <div className="crop-handle handle-l" onPointerDown={(e) => handlePointerDown('left', e)} />
                      <div className="crop-handle handle-r" onPointerDown={(e) => handlePointerDown('right', e)} />
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

              {/* Numeric Margin Inputs (Synchronized Live with Visual Handles) */}
              <div className="crop-section">
                <label className="crop-section-label">Margins in Points (pt):</label>
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
                    <span>All Pages ({totalPages})</span>
                  </label>
                  <label className={`scope-radio-btn ${cropScope === 'current' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="cropScope"
                      checked={cropScope === 'current'}
                      onChange={() => setCropScope('current')}
                    />
                    <span>Current Page ({activePageIndex + 1})</span>
                  </label>
                  <label className={`scope-radio-btn ${cropScope === 'range' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="cropScope"
                      checked={cropScope === 'range'}
                      onChange={() => setCropScope('range')}
                    />
                    <span>Page Range</span>
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
                  <strong>Lossless ISO Crop:</strong> Trims document viewport boundaries (CropBox & MediaBox) without re-encoding or degrading text and vector quality.
                </span>
              </div>

              {/* Action Buttons */}
              <button
                type="button"
                className="btn-process-action"
                onClick={handleExecuteCrop}
                disabled={isRendering}
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
