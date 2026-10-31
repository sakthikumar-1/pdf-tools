import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowLeft, 
  faUpDown, 
  faWandMagicSparkles, 
  faCheck, 
  faDownload, 
  faArrowRotateLeft, 
  faArrowRotateRight,
  faChevronLeft,
  faChevronRight,
  faCircleInfo,
  faLayerGroup,
  faFileLines,
  faCircleExclamation
} from '@fortawesome/free-solid-svg-icons';
import { pdfjsLib } from '../utils/pdfjsConfig';
import UploadBox from '../components/UploadBox';
import ProgressBar from '../components/ProgressBar';
import { useFileUpload } from '../hooks/useFileUpload';
import { downloadFile } from '../utils/fileUtils';
import { formatFileSize } from '../utils/formatFileSize';
import { reorderPdfPages } from '../utils/pdfProcessor';
import { reorderPdfPagesPython } from '../services/api';
import './ReorderPages.css';

export default function ReorderPages() {
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
  const [pages, setPages] = useState([]); // array of { originalPage, rotation, thumbnail }
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [isRendering, setIsRendering] = useState(false);
  const [processedResult, setProcessedResult] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Render thumbnails on upload
  useEffect(() => {
    if (!file) return;

    let isMounted = true;
    const renderPages = async () => {
      try {
        setIsRendering(true);
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const count = pdf.numPages;
        setTotalPages(count);

        const loadedPages = [];
        for (let i = 1; i <= count; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.45 });
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({ canvasContext: ctx, viewport }).promise;
          loadedPages.push({
            originalPage: i,
            rotation: 0,
            thumbnail: canvas.toDataURL('image/jpeg', 0.85)
          });
        }

        if (isMounted) {
          setPages(loadedPages);
          setIsRendering(false);
        }
      } catch (err) {
        console.error('[ReorderPages Render Error]:', err);
        if (isMounted) {
          setError('Failed to render PDF page previews. Ensure the file is not damaged.');
          setIsRendering(false);
        }
      }
    };

    renderPages();
    return () => {
      isMounted = false;
    };
  }, [file]);

  // Drag and Drop handlers
  const handleDragStart = (index, e) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
  };

  const handleCardDragOver = (index, e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleCardDragLeave = (index, e) => {
    if (dragOverIndex === index) {
      setDragOverIndex(null);
    }
  };

  const handleCardDrop = (index, e) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...pages];
    const [movedItem] = updated.splice(draggedIndex, 1);
    updated.splice(index, 0, movedItem);

    setPages(updated);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Accessible move controls
  const movePage = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= pages.length) return;
    const updated = [...pages];
    const [movedItem] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, movedItem);
    setPages(updated);
  };

  // Rotate single page
  const rotatePage = (index) => {
    const updated = [...pages];
    updated[index] = {
      ...updated[index],
      rotation: (updated[index].rotation + 90) % 360
    };
    setPages(updated);
  };

  // Reverse page sequence
  const handleReverseOrder = () => {
    setPages([...pages].reverse());
  };

  // Reset to original sequence
  const handleResetOrder = () => {
    const sorted = [...pages].sort((a, b) => a.originalPage - b.originalPage).map(p => ({
      ...p,
      rotation: 0
    }));
    setPages(sorted);
  };

  // Process reordering
  const handleProcess = async () => {
    if (!file || pages.length === 0) return;

    setStatus('processing');
    setProgress(15);
    setError(null);

    const baseName = file.name ? file.name.replace(/\.[^/.]+$/, '') : 'document';
    const pageOrderArray = pages.map(p => p.originalPage);
    const rotations = {};
    pages.forEach(p => {
      if (p.rotation !== 0) {
        rotations[p.originalPage] = p.rotation;
      }
    });

    try {
      let blob;
      let filename;

      // Direct instant in-browser reordering via pdf-lib (~50ms)
      try {
        blob = await reorderPdfPages(file, pageOrderArray, rotations, (p) => setProgress(p));
        filename = `${baseName}_reordered.pdf`;
      } catch (clientErr) {
        console.warn('[ReorderPages] Client reordering failed, falling back to Python:', clientErr);
        const res = await reorderPdfPagesPython(file, pageOrderArray, (p) => setProgress(p));
        blob = res.blob;
        filename = res.filename || `${baseName}_reordered.pdf`;
      }

      setProcessedResult({ blob, filename });
      setProgress(100);
      setStatus('success');
    } catch (err) {
      console.error('[Reorder Error]:', err);
      setError(err.message || 'Failed to reorder PDF pages. Please verify the document.');
      setStatus('selected');
    }
  };

  const handleDownload = () => {
    if (processedResult) {
      downloadFile(processedResult.blob, processedResult.filename, 'Reorder PDF');
    }
  };

  const handleFullReset = () => {
    setProcessedResult(null);
    setPages([]);
    setTotalPages(0);
    reset();
  };

  const orderString = pages.map(p => p.originalPage).join(', ');
  const isOrderChanged = pages.some((p, idx) => p.originalPage !== idx + 1 || p.rotation !== 0);

  return (
    <div className="reorder-pages-container">
      {/* Top Navigation Row with Back Button */}
      <div className="tool-top-nav-row">
        <Link to="/" className="tool-back-link">
          <FontAwesomeIcon icon={faArrowLeft} />
          <span>Back to Tools</span>
        </Link>
      </div>

      {/* HEADER SECTION */}
      <div className="reorder-pages-hero">
        <div className="reorder-pages-icon">
          <FontAwesomeIcon icon={faUpDown} />
        </div>
        <div className="capability-chip">
          <FontAwesomeIcon icon={faWandMagicSparkles} /> PyMuPDF Page Sequence Engine
        </div>
        <h1 className="reorder-pages-title">Reorder PDF Pages</h1>
        <p className="reorder-pages-desc">
          Drag and drop thumbnail pages or use navigation arrows to organize your PDF pages in any desired sequence.
        </p>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="error-alert" style={{ width: '100%' }}>
          <FontAwesomeIcon icon={faCircleExclamation} />
          <span>{error}</span>
        </div>
      )}

      {/* UPLOAD SCREEN */}
      {(status === 'idle' || status === 'error') && (
        <div style={{ width: '100%' }}>
          <UploadBox
            onFileSelect={selectFile}
            accept=".pdf"
            multiple={false}
            isDragging={isDragging}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            title="Choose a PDF file to reorder"
            subtitle="Drag & drop your multi-page PDF here, or click to browse"
            buttonLabel="Select PDF File"
            fileLimitInfo="Supports PDF files up to 50MB"
          />
        </div>
      )}

      {/* PROCESSING SCREEN */}
      {status === 'processing' && (
        <div style={{ maxWidth: '540px', margin: '2rem auto', width: '100%' }}>
          <ProgressBar
            progress={progress}
            title="Reordering PDF Pages..."
            statusMessage="Generating and compiling your reorganized PDF document..."
          />
        </div>
      )}

      {/* SUCCESS / DOWNLOAD SCREEN */}
      {status === 'success' && processedResult && (
        <div className="result-card" style={{ maxWidth: '640px', margin: '2rem auto', width: '100%' }}>
          <div className="result-icon-box">
            <FontAwesomeIcon icon={faCheck} size="2x" />
          </div>
          <h2 className="result-title">Pages Reordered Successfully!</h2>
          <p className="result-filename">{processedResult.filename}</p>
          <div className="result-meta" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '1.5rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            <span>Size: {formatFileSize(processedResult.blob.size)}</span>
            <span>Pages: {pages.length}</span>
          </div>

          <div className="result-actions">
            <button type="button" onClick={handleDownload} className="btn btn-primary">
              <FontAwesomeIcon icon={faDownload} /> Download Reordered PDF
            </button>
            <button type="button" onClick={handleFullReset} className="btn btn-secondary">
              <FontAwesomeIcon icon={faArrowRotateLeft} /> Reorder Another Document
            </button>
          </div>
        </div>
      )}

      {/* REORDERING WORKSPACE (WHEN FILE IS SELECTED) */}
      {(status === 'selected' || status === 'error') && file && (
        <div className="reorder-pages-layout">
          {/* LEFT: THUMBNAILS GRID */}
          <div className="pages-grid-wrapper">
            <div className="grid-toolbar">
              <div className="grid-toolbar-info">
                <FontAwesomeIcon icon={faLayerGroup} />
                <span>{totalPages} Pages in Document</span>
              </div>
              <div className="grid-toolbar-actions">
                <button
                  type="button"
                  className="btn-secondary-sm"
                  onClick={handleReverseOrder}
                  title="Reverse page sequence from end to beginning"
                >
                  <FontAwesomeIcon icon={faUpDown} /> Reverse Order
                </button>
                <button
                  type="button"
                  className="btn-secondary-sm"
                  onClick={handleResetOrder}
                  title="Reset to original document sequence"
                >
                  <FontAwesomeIcon icon={faArrowRotateLeft} /> Reset Original
                </button>
              </div>
            </div>

            {isRendering ? (
              <div className="rendering-placeholder">
                <div className="loading-spinner"></div>
                <span>Rendering high-resolution page previews...</span>
              </div>
            ) : (
              <div className="pages-reorder-grid">
                {pages.map((p, idx) => {
                  const isDragged = draggedIndex === idx;
                  const isDragOver = dragOverIndex === idx;

                  return (
                    <div
                      key={`page-${p.originalPage}-${idx}`}
                      className={`page-reorder-card ${isDragged ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(idx, e)}
                      onDragOver={(e) => handleCardDragOver(idx, e)}
                      onDragLeave={(e) => handleCardDragLeave(idx, e)}
                      onDrop={(e) => handleCardDrop(idx, e)}
                    >
                      {/* Current Sequence Number */}
                      <div className="page-index-badge">{idx + 1}</div>

                      {/* Original Page Label */}
                      <div className="orig-page-badge" title="Original Page Number">
                        Orig: #{p.originalPage}
                      </div>

                      {/* Thumbnail Image */}
                      <div className="page-thumbnail-box">
                        <img
                          src={p.thumbnail}
                          alt={`Page ${p.originalPage}`}
                          className="page-thumbnail-img"
                          style={{
                            transform: `rotate(${p.rotation}deg)`
                          }}
                        />
                      </div>

                      {/* Accessible Card Action Controls */}
                      <div className="page-controls-row">
                        <button
                          type="button"
                          className="btn-page-ctrl"
                          onClick={() => movePage(idx, idx - 1)}
                          disabled={idx === 0}
                          title="Move page left"
                          aria-label={`Move page ${idx + 1} left`}
                        >
                          <FontAwesomeIcon icon={faChevronLeft} />
                        </button>

                        <button
                          type="button"
                          className="btn-page-ctrl"
                          onClick={() => rotatePage(idx)}
                          title="Rotate page 90° clockwise"
                          aria-label={`Rotate page ${idx + 1} clockwise`}
                        >
                          <FontAwesomeIcon icon={faArrowRotateRight} />
                        </button>

                        <button
                          type="button"
                          className="btn-page-ctrl"
                          onClick={() => movePage(idx, idx + 1)}
                          disabled={idx === pages.length - 1}
                          title="Move page right"
                          aria-label={`Move page ${idx + 1} right`}
                        >
                          <FontAwesomeIcon icon={faChevronRight} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT: ACTION / SETTINGS PANEL */}
          <div className="reorder-control-panel">
            <div className="panel-header">
              <FontAwesomeIcon icon={faFileLines} />
              <span>Document Summary</span>
            </div>

            <div style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>File:</span>
                <span style={{ fontWeight: 600, color: 'var(--color-heading)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {file.name}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>File Size:</span>
                <span style={{ fontWeight: 600, color: 'var(--color-heading)' }}>
                  {formatFileSize(file.size)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Pages:</span>
                <span style={{ fontWeight: 600, color: 'var(--color-heading)' }}>
                  {totalPages} pages
                </span>
              </div>
            </div>

            <div className="order-summary-box">
              <div className="summary-label">Target Page Sequence:</div>
              <div className="summary-value">{orderString}</div>
            </div>

            <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
              <FontAwesomeIcon icon={faCircleInfo} style={{ display: "inline", verticalAlign: "text-bottom", marginRight: "4px" }} />
              Drag any page thumbnail to reorder, or use the arrow buttons for accessible keyboard-friendly navigation.
            </div>

            <button
              type="button"
              className="btn-process-action"
              onClick={handleProcess}
              disabled={pages.length === 0 || isRendering}
            >
              <FontAwesomeIcon icon={faDownload} /> Reorder & Download PDF
            </button>

            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: '100%', fontSize: '0.85rem' }}
              onClick={handleFullReset}
            >
              Cancel & Choose Another File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
