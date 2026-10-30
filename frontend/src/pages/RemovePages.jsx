import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowLeft, 
  faTrashCan, 
  faWandMagicSparkles, 
  faCheck, 
  faDownload, 
  faXmark, 
  faCircleInfo, 
  faArrowRotateLeft, 
  faFileLines 
} from '@fortawesome/free-solid-svg-icons';
import { pdfjsLib } from '../utils/pdfjsConfig';
import UploadBox from '../components/UploadBox';
import FileUploader from '../components/FileUploader';
import ProgressBar from '../components/ProgressBar';
import { useFileUpload } from '../hooks/useFileUpload';
import { downloadFile } from '../utils/fileUtils';
import { 
  removePagesFromPdf, 
  parsePageRanges, 
  formatPageRanges 
} from '../utils/pdfProcessor';
import './RemovePages.css';

export default function RemovePages() {
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
  const [pageThumbnails, setPageThumbnails] = useState([]);
  const [removedPages, setRemovedPages] = useState(new Set()); // 1-based page numbers
  const [rangeInput, setRangeInput] = useState('');
  const [lastClickedPage, setLastClickedPage] = useState(null);
  const [isRendering, setIsRendering] = useState(false);
  const [processedResult, setProcessedResult] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Render Page Thumbnails using PDF.js when file is uploaded
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

        const thumbs = [];
        for (let i = 1; i <= count; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.45 });
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({ canvasContext: ctx, viewport }).promise;
          thumbs.push({
            pageNumber: i,
            dataUrl: canvas.toDataURL('image/jpeg', 0.85)
          });
        }

        if (isMounted) {
          setPageThumbnails(thumbs);
          setIsRendering(false);
        }
      } catch (err) {
        console.error('[RemovePages Render Error]:', err);
        if (isMounted) {
          setError('Failed to render PDF page previews.');
          setIsRendering(false);
        }
      }
    };

    renderPages();
    return () => {
      isMounted = false;
    };
  }, [file]);

  // Sync Input Box -> Removed Pages Set
  const handleRangeInputChange = (e) => {
    const val = e.target.value;
    setRangeInput(val);
    const parsed = parsePageRanges(val, totalPages);
    setRemovedPages(new Set(parsed));
  };

  // Sync Thumbnail Click -> Removed Pages Set & Input Box
  const handlePageClick = (pageNumber, e) => {
    const nextSet = new Set(removedPages);

    if (e && e.shiftKey && lastClickedPage !== null) {
      const start = Math.min(lastClickedPage, pageNumber);
      const end = Math.max(lastClickedPage, pageNumber);
      const shouldRemove = !removedPages.has(pageNumber);

      for (let p = start; p <= end; p++) {
        if (shouldRemove) {
          nextSet.add(p);
        } else {
          nextSet.delete(p);
        }
      }
    } else {
      if (nextSet.has(pageNumber)) {
        nextSet.delete(pageNumber);
      } else {
        nextSet.add(pageNumber);
      }
    }

    setLastClickedPage(pageNumber);
    setRemovedPages(nextSet);
    setRangeInput(formatPageRanges(Array.from(nextSet)));
  };

  // Execute Page Removal
  const handleProcess = async () => {
    if (!file) return;
    const pageArray = Array.from(removedPages).sort((a, b) => a - b);
    if (pageArray.length === 0) {
      setError('Please select at least one page to remove from the document.');
      return;
    }
    if (pageArray.length >= totalPages) {
      setError('Cannot remove all pages from PDF. At least one page must remain.');
      return;
    }

    setStatus('processing');
    setProgress(15);
    setError(null);

    try {
      const blob = await removePagesFromPdf(file, pageArray, (p) => setProgress(p));
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      setProcessedResult({
        blob,
        filename: `${baseName}_pages_removed.pdf`
      });
      setProgress(100);
      setStatus('success');
    } catch (err) {
      console.error('[RemovePages Error]:', err);
      setError(err.message || 'Failed to remove pages from PDF.');
      setStatus('error');
    }
  };

  const handleDownload = () => {
    if (processedResult) {
      downloadFile(processedResult.blob, processedResult.filename, 'Remove Pages');
    }
  };

  const handleResetAll = () => {
    setProcessedResult(null);
    setRemovedPages(new Set());
    setRangeInput('');
    setLastClickedPage(null);
    reset();
  };

  return (
    <div className="remove-pages-container container">
      {/* Top Navigation Row with Back Button */}
      <div className="tool-top-nav-row">
        <Link to="/" className="tool-back-link">
          <FontAwesomeIcon icon={faArrowLeft} /> Back to Tools
        </Link>
      </div>

      {/* Tool Header */}
      <div className="remove-pages-hero">
        <div className="remove-pages-icon">
          <FontAwesomeIcon icon={faTrashCan} size="2x" />
        </div>
        <div className="remove-pages-info">
          <div className="capability-chip">
            <FontAwesomeIcon icon={faWandMagicSparkles} /> AVAILABLE: Client WebWorker Engine
          </div>
          <h1 className="remove-pages-title">Remove PDF Pages</h1>
          <p className="remove-pages-desc">
            Delete unwanted pages from your PDF document easily. Click thumbnails to mark pages for removal.
          </p>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="tool-workspace">
        {(status === 'idle' || status === 'error') && (
          <UploadBox
            onFileSelect={selectFile}
            isDragging={isDragging}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            error={error}
            title="Select PDF file to remove pages"
            subtitle="or drag &amp; drop file here"
          />
        )}

        {status === 'selected' && (
          <div className="remove-pages-layout">
            {/* LEFT AREA: PAGE THUMBNAILS GRID */}
            <div className="pages-grid-wrapper">
              {isRendering ? (
                <div className="rendering-placeholder">
                  <div className="loading-spinner"></div>
                  <p>Rendering page previews...</p>
                </div>
              ) : (
                <div className="pages-grid">
                  {pageThumbnails.map((thumb) => {
                    const isRemoved = removedPages.has(thumb.pageNumber);
                    return (
                      <div
                        key={thumb.pageNumber}
                        className={`page-card ${isRemoved ? 'removed' : ''}`}
                        onClick={(e) => handlePageClick(thumb.pageNumber, e)}
                        title={`Click to ${isRemoved ? 'keep' : 'remove'} Page ${thumb.pageNumber}`}
                      >
                        <div className="page-thumbnail-box">
                          <img
                            src={thumb.dataUrl}
                            alt={`Page ${thumb.pageNumber}`}
                            className="page-thumbnail-img"
                          />
                          {isRemoved && (
                            <div className="remove-overlay-badge">
                              <FontAwesomeIcon icon={faXmark} size="3x" className="remove-x-icon" />
                            </div>
                          )}
                        </div>
                        <div className="page-card-footer">
                          <span className="page-label">Page {thumb.pageNumber}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* RIGHT AREA: OPTIONS & REMOVE CONTROL PANEL (MATCHES SCREENSHOT 2) */}
            <div className="remove-control-panel">
              <h3 className="control-panel-title">Remove pages</h3>

              {/* Info Box Callout (Matches Screenshot 2) */}
              <div className="info-callout-box">
                <FontAwesomeIcon icon={faCircleInfo} className="info-icon" />
                <span>
                  Click on pages to remove from document. You can use &quot;shift&quot; key to set ranges.
                </span>
              </div>

              <div className="total-pages-counter">
                Total pages: <strong>{totalPages}</strong>
              </div>

              {/* Pages to remove Input Box (Matches Screenshot 2) */}
              <div className="pages-input-group">
                <label className="pages-input-label">Pages to remove:</label>
                <input
                  type="text"
                  value={rangeInput}
                  onChange={handleRangeInputChange}
                  placeholder="e.g. 3-4 or 1, 3-5"
                  className="pages-text-input"
                />
              </div>

              {error && (
                <div className="remove-error-box">
                  {error}
                </div>
              )}

              <button
                type="button"
                className="btn btn-primary btn-lg remove-action-btn"
                onClick={handleProcess}
                disabled={removedPages.size === 0 || removedPages.size >= totalPages}
              >
                <FontAwesomeIcon icon={faTrashCan} /> Remove Pages Now ({removedPages.size} selected)
              </button>
            </div>
          </div>
        )}

        {status === 'processing' && (
          <ProgressBar progress={progress} statusText="Removing selected pages from PDF..." />
        )}

        {status === 'success' && processedResult && (
          <div className="success-result-card">
            <div className="success-icon-badge">
              <FontAwesomeIcon icon={faCheck} size="2x" />
            </div>
            <h2>PDF Pages Removed Successfully!</h2>
            <p>Your modified PDF is ready for download.</p>
            <div className="success-actions">
              <button type="button" onClick={handleDownload} className="btn btn-primary">
                <FontAwesomeIcon icon={faDownload} /> Download Modified PDF
              </button>
              <button type="button" onClick={handleResetAll} className="btn btn-secondary">
                <FontAwesomeIcon icon={faArrowRotateLeft} /> Remove Pages from Another PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
