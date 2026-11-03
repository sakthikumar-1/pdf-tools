import React, { useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faLayerGroup,
  faXmark,
  faFileLines,
} from '@fortawesome/free-solid-svg-icons';

export default function EditorSidebar({
  isOpen = true,
  currentPage = 1,
  totalPages = 1,
  thumbnails = [],
  onSelectPage,
  onClose,
}) {
  const activeThumbRef = useRef(null);

  // Auto-scroll active thumbnail into view smoothly
  useEffect(() => {
    if (activeThumbRef.current) {
      activeThumbRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentPage]);

  if (!isOpen) return null;

  // Build full array of pages (1 to totalPages)
  const pageNumbers = Array.from({ length: totalPages || 1 }, (_, i) => i + 1);

  return (
    <aside className="editor-left-sidebar" aria-label="Document Page Thumbnails">
      <div className="sidebar-header-row">
        <div className="sidebar-title-badge">
          <FontAwesomeIcon icon={faLayerGroup} className="sidebar-title-icon" />
          <span className="sidebar-title-text">Pages</span>
          <span className="sidebar-count-pill">{totalPages}</span>
        </div>
        {onClose && (
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={onClose}
            title="Hide Thumbnails"
            aria-label="Close page thumbnails"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        )}
      </div>

      <div className="sidebar-thumbnails-scroll" role="tablist" aria-label="Page navigation tabs">
        {pageNumbers.map((num) => {
          const thumb = thumbnails.find((t) => t.pageNumber === num);
          const isActive = num === currentPage;

          return (
            <div
              key={num}
              ref={isActive ? activeThumbRef : null}
              role="tab"
              tabIndex={0}
              aria-selected={isActive}
              aria-label={`Page ${num}`}
              className={`sidebar-thumb-card ${isActive ? 'is-active' : ''}`}
              onClick={() => onSelectPage(num)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectPage(num);
                }
              }}
            >
              <div className="thumb-preview-box">
                {thumb && thumb.dataUrl ? (
                  <img
                    src={thumb.dataUrl}
                    alt={`Thumbnail preview for page ${num}`}
                    className="thumb-image"
                    loading="lazy"
                  />
                ) : (
                  <div className="thumb-skeleton" aria-label="Generating preview">
                    <FontAwesomeIcon icon={faFileLines} className="thumb-skeleton-icon" />
                    <span className="thumb-skeleton-label">Loading...</span>
                  </div>
                )}
                {isActive && <div className="thumb-active-glow" />}
              </div>

              <div className="thumb-footer-row">
                <span className="thumb-page-badge">{num}</span>
                {thumb && thumb.format && (
                  <span className="thumb-format-badge">{thumb.format}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

