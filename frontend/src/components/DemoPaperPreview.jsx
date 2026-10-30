import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronLeft,
  faChevronRight,
  faRotateLeft,
  faRotateRight,
  faArrowsRotate,
  faCheck,
  faShieldHalved,
  faScissors,
  faFileLines,
  faStamp,
  faHashtag,
  faEye,
  faLock
} from '@fortawesome/free-solid-svg-icons';
import { pdfjsLib } from '../utils/pdfjsConfig';
import './DemoPaperPreview.css';

// 5 Standard Watermark Positions with readable labels & coordinates
const WM_POSITIONS = [
  { key: 'top-left', label: 'Top Left', top: '14%', left: '14%', align: 'flex-start' },
  { key: 'top-right', label: 'Top Right', top: '14%', right: '14%', align: 'flex-end' },
  { key: 'center', label: 'Center', top: '50%', left: '50%', align: 'center', isCenter: true },
  { key: 'bottom-left', label: 'Bottom Left', bottom: '14%', left: '14%', align: 'flex-start' },
  { key: 'bottom-right', label: 'Bottom Right', bottom: '14%', right: '14%', align: 'flex-end' },
];

// 6 Page Number Positions
const NUM_POSITIONS = [
  { key: 'top-left', label: 'Top Left', top: '12px', left: '16px' },
  { key: 'top-center', label: 'Top Center', top: '12px', left: '50%', transform: 'translateX(-50%)' },
  { key: 'top-right', label: 'Top Right', top: '12px', right: '16px' },
  { key: 'bottom-left', label: 'Bottom Left', bottom: '12px', left: '16px' },
  { key: 'bottom-center', label: 'Bottom Center', bottom: '12px', left: '50%', transform: 'translateX(-50%)' },
  { key: 'bottom-right', label: 'Bottom Right', bottom: '12px', right: '16px' },
];

export default function DemoPaperPreview({
  file,
  title = '',
  // Watermark props
  wmText = 'CONFIDENTIAL',
  wmOpacity = 0.35,
  wmRotation = 45,
  wmFontSize = 48,
  wmColor = '#EF4444',
  wmPosition = 'center',
  onWmPositionChange,
  // Page Numbers props
  startNumber = 1,
  numFormat = 'Page {n}',
  numPosition = 'bottom-right',
  numFontSize = 11,
  numFontColor = '#334155',
  numMarginPt = 36,
  onNumPositionChange,
  // Rotate props
  rotateAngle = 90,
  onRotateChange,
  // Split props
  splitRange = '1',
  docPageCount = null
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(docPageCount || 1);
  const [isRendering, setIsRendering] = useState(false);
  const [hasRenderedCanvas, setHasRenderedCanvas] = useState(false);
  const [pdfDoc, setPdfDoc] = useState(null);

  const canvasRef = useRef(null);
  const toolNameLower = title.toLowerCase();
  const isWatermarkTool = toolNameLower.includes('watermark');
  const isPageNumTool = toolNameLower.includes('page number') || toolNameLower.includes('add page');
  const isRotateTool = toolNameLower.includes('rotate');
  const isProtectTool = toolNameLower.includes('protect');
  const isSplitTool = toolNameLower.includes('split');

  // Load PDF Document when file changes
  useEffect(() => {
    let isMounted = true;
    setCurrentPage(1);

    if (!file || !(file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf'))) {
      setHasRenderedCanvas(false);
      setPdfDoc(null);
      return;
    }

    const loadPdfDocument = async () => {
      try {
        setIsRendering(true);
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (!isMounted) return;

        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
      } catch (err) {
        console.warn('[DemoPaperPreview] PDF preview load error:', err);
        if (isMounted) {
          setHasRenderedCanvas(false);
          setIsRendering(false);
        }
      }
    };

    loadPdfDocument();

    return () => {
      isMounted = false;
    };
  }, [file]);

  // Update totalPages if docPageCount changes externally
  useEffect(() => {
    if (docPageCount && docPageCount > 0) {
      setTotalPages(docPageCount);
    }
  }, [docPageCount]);

  // Render current page onto canvas
  useEffect(() => {
    let isCancelled = false;

    const renderCurrentPage = async () => {
      if (!pdfDoc || !canvasRef.current) return;

      try {
        setIsRendering(true);
        const safePageNum = Math.min(Math.max(1, currentPage), pdfDoc.numPages);
        const page = await pdfDoc.getPage(safePageNum);
        if (isCancelled) return;

        const baseViewport = page.getViewport({ scale: 1.0 });
        const targetWidth = 330;
        const scale = targetWidth / baseViewport.width;
        const viewport = page.getViewport({ scale: scale * 1.5 }); // High-res rendering

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: ctx, viewport }).promise;
        if (!isCancelled) {
          setHasRenderedCanvas(true);
          setIsRendering(false);
        }
      } catch (err) {
        console.warn('[DemoPaperPreview] Canvas render failed:', err);
        if (!isCancelled) {
          setHasRenderedCanvas(false);
          setIsRendering(false);
        }
      }
    };

    renderCurrentPage();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, currentPage]);

  // Page Navigation Handlers
  const handlePrevPage = (e) => {
    e.stopPropagation();
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleNextPage = (e) => {
    e.stopPropagation();
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  // Watermark Hotspot Click Handler
  const handleWatermarkHotspotClick = (posKey, e) => {
    e.stopPropagation();
    if (onWmPositionChange) {
      onWmPositionChange(posKey);
    }
  };

  // Page Number Hotspot Click Handler
  const handleNumHotspotClick = (posKey, e) => {
    e.stopPropagation();
    if (onNumPositionChange) {
      onNumPositionChange(posKey);
    }
  };

  // Rotate Action Handlers
  const handleRotateQuick = (deltaDeg, e) => {
    e.stopPropagation();
    if (onRotateChange) {
      const nextAngle = (rotateAngle + deltaDeg + 360) % 360;
      onRotateChange(nextAngle);
    }
  };

  // Formatted page number text for current page
  const getFormattedPageNumber = () => {
    const currentNum = (Number(startNumber) || 1) + (currentPage - 1);
    const total = totalPages || 1;
    const fmt = numFormat || 'Page {n}';
    return fmt.replace('{n}', currentNum).replace('{total}', total);
  };

  // Split Range Check for Current Page
  const isCurrentPageInSplitRange = () => {
    if (!splitRange || splitRange.trim() === '') return true;
    const parts = splitRange.split(',').map((p) => p.trim());
    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map((n) => parseInt(n, 10));
        if (!isNaN(start) && !isNaN(end) && currentPage >= start && currentPage <= end) {
          return true;
        }
      } else {
        const num = parseInt(part, 10);
        if (!isNaN(num) && num === currentPage) {
          return true;
        }
      }
    }
    return false;
  };

  return (
    <div className="demo-paper-card" aria-label="Interactive Document Sheet Preview">
      {/* Header bar of preview */}
      <div className="demo-paper-header">
        <div className="preview-title-badge">
          <FontAwesomeIcon icon={isWatermarkTool ? faStamp : isPageNumTool ? faHashtag : isRotateTool ? faArrowsRotate : faFileLines} className="preview-badge-icon" />
          <span className="preview-title-text">
            {isWatermarkTool
              ? 'Interactive Watermark Sheet'
              : isPageNumTool
              ? 'Page Numbering Placement'
              : isRotateTool
              ? 'Live Document Rotation'
              : 'Interactive Document Preview'}
          </span>
        </div>

        {/* Page Switcher Navigation (Direct Page Access) */}
        {totalPages > 1 && (
          <div className="preview-page-navigator" aria-label="Page Controls">
            <button
              type="button"
              className="page-nav-arrow"
              onClick={handlePrevPage}
              disabled={currentPage <= 1 || isRendering}
              title="Previous Page"
              aria-label="Previous Page"
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            <span className="page-nav-indicator">
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
            </span>
            <button
              type="button"
              className="page-nav-arrow"
              onClick={handleNextPage}
              disabled={currentPage >= totalPages || isRendering}
              title="Next Page"
              aria-label="Next Page"
            >
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>
        )}
      </div>

      {/* Quick Interactive Rotation Controls on Paper */}
      {isRotateTool && (
        <div className="paper-rotation-bar">
          <span className="rotation-status-label">
            Current Orientation: <strong>{rotateAngle}&deg;</strong>
          </span>
          <div className="rotation-actions-group">
            <button
              type="button"
              className="paper-rotate-btn"
              onClick={(e) => handleRotateQuick(-90, e)}
              title="Rotate 90° Left"
            >
              <FontAwesomeIcon icon={faRotateLeft} />
              <span>-90&deg;</span>
            </button>
            <button
              type="button"
              className="paper-rotate-btn"
              onClick={(e) => handleRotateQuick(180, e)}
              title="Flip 180°"
            >
              <FontAwesomeIcon icon={faArrowsRotate} />
              <span>180&deg;</span>
            </button>
            <button
              type="button"
              className="paper-rotate-btn"
              onClick={(e) => handleRotateQuick(90, e)}
              title="Rotate 90° Right"
            >
              <FontAwesomeIcon icon={faRotateRight} />
              <span>+90&deg;</span>
            </button>
          </div>
        </div>
      )}

      {/* The Physical Paper Canvas / Sheet */}
      <div className="demo-paper-viewport">
        <div
          className={`demo-paper-sheet ${isRotateTool ? `rotate-${rotateAngle}` : ''}`}
          style={{
            transform: isRotateTool ? `rotate(${rotateAngle}deg)` : undefined
          }}
        >
          {/* Actual Rendered PDF Canvas */}
          <canvas
            ref={canvasRef}
            className={`pdf-rendered-canvas ${hasRenderedCanvas ? 'is-visible' : 'is-hidden'}`}
          />

          {/* Skeleton Document Page Fallback (when rendering or non-PDF) */}
          {!hasRenderedCanvas && (
            <div className="paper-skeleton-layout" aria-hidden="true">
              <div className="skeleton-line title" />
              <div className="skeleton-line subtitle" />
              <div className="skeleton-paragraph">
                <div className="skeleton-line" />
                <div className="skeleton-line" />
                <div className="skeleton-line short" />
              </div>
              <div className="skeleton-box" />
              <div className="skeleton-paragraph">
                <div className="skeleton-line" />
                <div className="skeleton-line short" />
              </div>
            </div>
          )}

          {/* ============================================================
              1. WATERMARK INTERACTIVE LAYER
              ============================================================ */}
          {isWatermarkTool && (
            <div className="watermark-interactive-layer">
              {/* Dynamic Watermark Text Rendered on Paper */}
              <div
                className={`watermark-rendered-text position-${wmPosition}`}
                style={{
                  color: wmColor || '#EF4444',
                  opacity: Math.max(0.1, Math.min(1.0, wmOpacity)),
                  transform:
                    wmPosition === 'center'
                      ? `translate(-50%, -50%) rotate(${wmRotation}deg)`
                      : `rotate(${wmRotation}deg)`,
                  fontSize: `${Math.max(16, Math.min(32, (wmFontSize || 48) * 0.45))}px`
                }}
              >
                {wmText || 'CONFIDENTIAL'}
              </div>

              {/* 5 Clickable Position Hotspots across the Paper */}
              {WM_POSITIONS.map((pos) => {
                const isActive = wmPosition === pos.key;
                return (
                  <button
                    key={pos.key}
                    type="button"
                    className={`wm-position-hotspot ${isActive ? 'is-active' : ''}`}
                    style={{
                      top: pos.top,
                      bottom: pos.bottom,
                      left: pos.left,
                      right: pos.right,
                      transform: pos.isCenter ? 'translate(-50%, -50%)' : undefined
                    }}
                    onClick={(e) => handleWatermarkHotspotClick(pos.key, e)}
                    title={`Click to place watermark at ${pos.label}`}
                    aria-label={`Place watermark at ${pos.label}`}
                  >
                    <span className="hotspot-pin-dot">
                      {isActive && <FontAwesomeIcon icon={faCheck} className="hotspot-check" />}
                    </span>
                    <span className="hotspot-pin-label">{pos.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* ============================================================
              2. ADD PAGE NUMBERS INTERACTIVE LAYER
              ============================================================ */}
          {isPageNumTool && (
            <div className="pagenum-interactive-layer">
              {/* 6 Clickable Placement Targets */}
              {NUM_POSITIONS.map((pos) => {
                const isActive = numPosition === pos.key;
                return (
                  <button
                    key={pos.key}
                    type="button"
                    className={`pagenum-position-hotspot ${isActive ? 'is-active' : ''}`}
                    style={{
                      top: pos.top,
                      bottom: pos.bottom,
                      left: pos.left,
                      right: pos.right,
                      transform: pos.transform
                    }}
                    onClick={(e) => handleNumHotspotClick(pos.key, e)}
                    title={`Place page number at ${pos.label}`}
                    aria-label={`Place page number at ${pos.label}`}
                  >
                    {isActive ? (
                      <span
                        className="active-page-number-badge"
                        style={{
                          color: numFontColor || '#334155',
                          fontSize: `${Math.max(10, Math.min(15, numFontSize || 11))}px`
                        }}
                      >
                        {getFormattedPageNumber()}
                      </span>
                    ) : (
                      <span className="inactive-pagenum-target">
                        <span className="target-dot" />
                        <span className="target-label">{pos.label}</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* ============================================================
              3. SPLIT PDF STATUS LAYER
              ============================================================ */}
          {isSplitTool && (
            <div className="split-page-indicator-layer">
              {isCurrentPageInSplitRange() ? (
                <div className="split-status-badge included">
                  <FontAwesomeIcon icon={faCheck} />
                  <span>Page {currentPage} will be extracted</span>
                </div>
              ) : (
                <div className="split-status-badge skipped">
                  <FontAwesomeIcon icon={faScissors} />
                  <span>Page {currentPage} will be skipped</span>
                </div>
              )}
            </div>
          )}

          {/* ============================================================
              4. PROTECT PDF SECURITY LAYER
              ============================================================ */}
          {isProtectTool && (
            <div className="protect-security-layer">
              <div className="security-watermark-stamp">
                <FontAwesomeIcon icon={faShieldHalved} className="security-shield-icon" />
                <span className="security-stamp-title">ENCRYPTED DOCUMENT</span>
                <span className="security-stamp-sub">AES-256 Protected</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Helpful Interactive Hint at Bottom of Paper */}
      <div className="demo-paper-footer">
        <span className="interactive-hint-text">
          {isWatermarkTool && (
            <>
              <FontAwesomeIcon icon={faStamp} className="hint-icon" />
              <span>Click any spot on the paper above to directly move watermark position.</span>
            </>
          )}
          {isPageNumTool && (
            <>
              <FontAwesomeIcon icon={faHashtag} className="hint-icon" />
              <span>Click any corner or edge on the paper to set page number placement.</span>
            </>
          )}
          {isRotateTool && (
            <>
              <FontAwesomeIcon icon={faArrowsRotate} className="hint-icon" />
              <span>Use the rotation buttons above to adjust document orientation in real-time.</span>
            </>
          )}
          {isSplitTool && (
            <>
              <FontAwesomeIcon icon={faScissors} className="hint-icon" />
              <span>Use page arrows &lt; &gt; to verify which pages are selected for extraction.</span>
            </>
          )}
          {!isWatermarkTool && !isPageNumTool && !isRotateTool && !isSplitTool && (
            <>
              <FontAwesomeIcon icon={faEye} className="hint-icon" />
              <span>Live document preview. Real-time updates reflect your chosen options.</span>
            </>
          )}
        </span>
      </div>
    </div>
  );
}

