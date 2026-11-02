import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowPointer,
  faFont,
  faPen,
  faHighlighter,
  faShapes,
  faImage,
  faEraser,
  faChevronLeft,
  faChevronRight,
  faMagnifyingGlassMinus,
  faMagnifyingGlassPlus,
  faExpand,
  faSliders,
  faBars,
  faArrowRotateLeft,
  faFilePdf,
  faRotateLeft,
  faRotateRight,
  faDownload,
  faSpinner,
  faCropSimple,
  faPenToSquare,
  faMagnifyingGlass,
} from '@fortawesome/free-solid-svg-icons';

export const ZOOM_PRESETS = [
  { label: '50%', value: 0.5 },
  { label: '75%', value: 0.75 },
  { label: '100%', value: 1.0 },
  { label: '125%', value: 1.25 },
  { label: '150%', value: 1.5 },
  { label: '200%', value: 2.0 },
];

export default function EditorToolbar({
  activeTool = 'select',
  onSelectTool,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  zoom = 1.0,
  onZoomIn,
  onZoomOut,
  onZoomSelect,
  onFitPage,
  fileName = 'Document.pdf',
  onCloseDocument,
  isSidebarOpen = true,
  onToggleSidebar,
  isPropertiesOpen = true,
  onToggleProperties,
  // Undo / Redo Props
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  // Export & Download Props (Part C)
  onDownload,
  isExporting = false,
  exportProgress = 0,
  // Find & Replace Props
  isFindOpen = false,
  onToggleFind,
  // Section-based Selection Scope for Edit Text
  selectionLevel = 'line',
  onSelectSelectionLevel,
}) {
  const [pageInputVal, setPageInputVal] = useState(String(currentPage));

  useEffect(() => {
    setPageInputVal(String(currentPage));
  }, [currentPage]);

  const handlePageInputSubmit = (e) => {
    if (e) e.preventDefault();
    const val = parseInt(pageInputVal, 10);
    if (!isNaN(val) && val >= 1 && val <= totalPages) {
      onPageChange(val);
    } else {
      setPageInputVal(String(currentPage));
    }
  };

  const handleToolClick = (toolId, disabledMessage) => {
    if (typeof onSelectTool === 'function') {
      onSelectTool(toolId, disabledMessage);
    }
  };

  const currentZoomPercent = Math.round(zoom * 100);

  return (
    <header className="editor-top-toolbar" role="toolbar" aria-label="PDF Editor Toolbar">
      {/* 1. PRIMARY ROW: Document Info, Page Navigation, Zoom, Undo/Redo, and Panel Toggles */}
      <div className="toolbar-primary-row">
        {/* Left Section: Sidebar Toggle & File Badge */}
        <div className="toolbar-section toolbar-left">
          <button
            type="button"
            className={`toolbar-btn icon-only-btn ${isSidebarOpen ? 'is-active' : ''}`}
            onClick={onToggleSidebar}
            title={isSidebarOpen ? 'Hide Page Thumbnails' : 'Show Page Thumbnails'}
            aria-label="Toggle page thumbnails"
          >
            <FontAwesomeIcon icon={faBars} />
          </button>

          <div className="toolbar-file-badge" title={fileName}>
            <FontAwesomeIcon icon={faFilePdf} className="file-badge-icon" />
            <span className="file-badge-name">{fileName}</span>
          </div>
        </div>

        {/* Center Section: Page Navigation, Zoom Controls, and Undo/Redo */}
        <div className="toolbar-section toolbar-center">
          {/* Undo / Redo Group */}
          <div className="toolbar-history-group" aria-label="Undo and Redo History">
            <button
              type="button"
              className="toolbar-btn icon-only-btn"
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              aria-label="Undo action"
            >
              <FontAwesomeIcon icon={faRotateLeft} />
            </button>
            <button
              type="button"
              className="toolbar-btn icon-only-btn"
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
              aria-label="Redo action"
            >
              <FontAwesomeIcon icon={faRotateRight} />
            </button>
          </div>

          <div className="toolbar-divider" />

          {/* Page Navigation */}
          <div className="toolbar-nav-group" aria-label="Page Navigation">
            <button
              type="button"
              className="toolbar-btn icon-only-btn"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              title="Previous Page (Arrow Left)"
              aria-label="Previous page"
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>

            <form className="toolbar-page-form" onSubmit={handlePageInputSubmit}>
              <input
                type="text"
                className="toolbar-page-input"
                value={pageInputVal}
                onChange={(e) => setPageInputVal(e.target.value)}
                onBlur={handlePageInputSubmit}
                aria-label="Current page number"
              />
              <span className="toolbar-page-total">/ {totalPages || 1}</span>
            </form>

            <button
              type="button"
              className="toolbar-btn icon-only-btn"
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              title="Next Page (Arrow Right)"
              aria-label="Next page"
            >
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>

          <div className="toolbar-divider" />

          {/* Zoom Controls */}
          <div className="toolbar-zoom-group" aria-label="Zoom Controls">
            <button
              type="button"
              className="toolbar-btn icon-only-btn"
              onClick={onZoomOut}
              disabled={zoom <= 0.25}
              title="Zoom Out (Ctrl -)"
              aria-label="Zoom out"
            >
              <FontAwesomeIcon icon={faMagnifyingGlassMinus} />
            </button>

            <select
              className="toolbar-zoom-select"
              value={zoom}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) onZoomSelect(val);
              }}
              aria-label="Select zoom percentage"
            >
              {ZOOM_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
              {!ZOOM_PRESETS.some((p) => Math.abs(p.value - zoom) < 0.02) && (
                <option value={zoom}>{currentZoomPercent}%</option>
              )}
            </select>

            <button
              type="button"
              className="toolbar-btn icon-only-btn"
              onClick={onZoomIn}
              disabled={zoom >= 3.0}
              title="Zoom In (Ctrl +)"
              aria-label="Zoom in"
            >
              <FontAwesomeIcon icon={faMagnifyingGlassPlus} />
            </button>

            <button
              type="button"
              className="toolbar-btn icon-only-btn"
              onClick={onFitPage}
              title="Fit Page to Window"
              aria-label="Fit page"
            >
              <FontAwesomeIcon icon={faExpand} />
            </button>
          </div>
        </div>

        {/* Right Section: Download PDF, Properties Toggle & New File */}
        <div className="toolbar-section toolbar-right">
          <button
            type="button"
            className={`toolbar-btn download-pdf-btn ${isExporting ? 'is-exporting' : ''}`}
            onClick={onDownload}
            disabled={isExporting}
            title={isExporting ? `Preparing PDF (${exportProgress}%)...` : 'Export and Download Edited PDF'}
            aria-label="Download Edited PDF"
          >
            {isExporting ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin className="download-spin-icon" />
                <span className="btn-text-download">Preparing PDF ({exportProgress}%)...</span>
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faDownload} />
                <span className="btn-text-download">Download PDF</span>
              </>
            )}
          </button>

          <button
            type="button"
            className={`toolbar-btn text-btn ${isPropertiesOpen ? 'is-active' : ''}`}
            onClick={onToggleProperties}
            title={isPropertiesOpen ? 'Hide Document Properties' : 'Show Document Properties'}
            aria-label="Toggle document properties"
          >
            <FontAwesomeIcon icon={faSliders} />
            <span className="btn-text-desktop">Properties</span>
          </button>

          <button
            type="button"
            className="toolbar-btn text-btn close-doc-btn"
            onClick={onCloseDocument}
            title="Close Document and Choose Another File"
            aria-label="Close document"
          >
            <FontAwesomeIcon icon={faArrowRotateLeft} />
            <span className="btn-text-desktop">New File</span>
          </button>
        </div>
      </div>

      {/* 2. TOOLS ROW: Horizontally scrollable touch-friendly ribbon for editing tools */}
      <div className="toolbar-tools-row" role="radiogroup" aria-label="Editor Tools">
        {/* Select Tool */}
        <button
          type="button"
          className={`toolbar-tool-btn ${activeTool === 'select' ? 'is-active' : ''}`}
          onClick={() => handleToolClick('select')}
          title="Select & Move elements"
          aria-label="Select tool"
          aria-pressed={activeTool === 'select'}
        >
          <FontAwesomeIcon icon={faArrowPointer} />
          <span className="tool-btn-label">Select</span>
        </button>

        {/* Edit Text Tool (Direct Click-to-Edit Existing Words/Lines/Sections) */}
        <button
          type="button"
          className={`toolbar-tool-btn ${activeTool === 'edit-text' ? 'is-active' : ''}`}
          onClick={() => handleToolClick('edit-text')}
          title="Direct Edit: Click any existing PDF word, line, or paragraph to directly modify it"
          aria-label="Direct text edit tool"
          aria-pressed={activeTool === 'edit-text'}
        >
          <FontAwesomeIcon icon={faPenToSquare} />
          <span className="tool-btn-label">Edit Text</span>
        </button>

        {/* Section Selection Scope Controls (Active when Edit Text tool is selected) */}
        {activeTool === 'edit-text' && (
          <div className="toolbar-selection-levels" role="group" aria-label="Selection Scope">
            <span className="selection-level-hint">Scope:</span>
            {[
              { id: 'word', label: 'Word' },
              { id: 'line', label: 'Line' },
              { id: 'heading', label: 'Heading' },
              { id: 'subtitle', label: 'Subtitle' },
              { id: 'bullet', label: 'Bullet' },
              { id: 'paragraph', label: 'Paragraph' },
            ].map((lvl) => (
              <button
                key={lvl.id}
                type="button"
                className={`sel-level-pill ${selectionLevel === lvl.id ? 'is-active' : ''}`}
                onClick={() => onSelectSelectionLevel?.(lvl.id)}
                title={`Select and edit by ${lvl.label}`}
                aria-pressed={selectionLevel === lvl.id}
              >
                {lvl.label}
              </button>
            ))}
          </div>
        )}

        {/* Add Text Tool - Fully Active in Phase 2A */}
        <button
          type="button"
          className={`toolbar-tool-btn ${activeTool === 'text' ? 'is-active' : ''}`}
          onClick={() => handleToolClick('text')}
          title="Add Text: Click anywhere on the document to insert new text"
          aria-label="Add text tool"
          aria-pressed={activeTool === 'text'}
        >
          <FontAwesomeIcon icon={faFont} />
          <span className="tool-btn-label">Add Text</span>
        </button>

        {/* Replace Area Tool - Phase 2B Marquee */}
        <button
          type="button"
          className={`toolbar-tool-btn ${activeTool === 'replace-area' ? 'is-active' : ''}`}
          onClick={() => handleToolClick('replace-area')}
          title="Replace Area: Drag a rectangular selection box to cover and replace text or paragraph"
          aria-label="Replace text area tool"
          aria-pressed={activeTool === 'replace-area'}
        >
          <FontAwesomeIcon icon={faCropSimple} />
          <span className="tool-btn-label">Replace Area</span>
        </button>

        {/* Find and Replace Tool */}
        <button
          type="button"
          className={`toolbar-tool-btn ${isFindOpen ? 'is-active' : ''}`}
          onClick={onToggleFind}
          title="Find & Replace: Search for words and replace occurrences across the PDF"
          aria-label="Find and replace tool"
          aria-pressed={isFindOpen}
        >
          <FontAwesomeIcon icon={faMagnifyingGlass} />
          <span className="tool-btn-label">Find & Replace</span>
        </button>

        {/* Draw Tool (Phase 3) */}
        <button
          type="button"
          className={`toolbar-tool-btn ${activeTool === 'draw' ? 'is-active' : ''}`}
          onClick={() => handleToolClick('draw', 'Freehand drawing will be available in Phase 3')}
          title="Freehand Ink Drawing (Phase 3)"
          aria-label="Draw tool"
        >
          <FontAwesomeIcon icon={faPen} />
          <span className="tool-btn-label">Draw</span>
          <span className="tool-phase-tag">P3</span>
        </button>

        {/* Highlight Tool (Phase 3) */}
        <button
          type="button"
          className={`toolbar-tool-btn ${activeTool === 'highlight' ? 'is-active' : ''}`}
          onClick={() => handleToolClick('highlight', 'Highlighting will be available in Phase 3')}
          title="Highlight Text (Phase 3)"
          aria-label="Highlight tool"
        >
          <FontAwesomeIcon icon={faHighlighter} />
          <span className="tool-btn-label">Highlight</span>
          <span className="tool-phase-tag">P3</span>
        </button>

        {/* Shapes Tool (Phase 3) */}
        <button
          type="button"
          className={`toolbar-tool-btn ${activeTool === 'shapes' ? 'is-active' : ''}`}
          onClick={() => handleToolClick('shapes', 'Shapes will be available in Phase 3')}
          title="Shapes & Lines (Phase 3)"
          aria-label="Shapes tool"
        >
          <FontAwesomeIcon icon={faShapes} />
          <span className="tool-btn-label">Shapes</span>
          <span className="tool-phase-tag">P3</span>
        </button>

        {/* Image Tool (Phase 3) */}
        <button
          type="button"
          className={`toolbar-tool-btn ${activeTool === 'image' ? 'is-active' : ''}`}
          onClick={() => handleToolClick('image', 'Image insertion will be available in Phase 3')}
          title="Insert Image (Phase 3)"
          aria-label="Image tool"
        >
          <FontAwesomeIcon icon={faImage} />
          <span className="tool-btn-label">Image</span>
          <span className="tool-phase-tag">P3</span>
        </button>

        {/* Whiteout Tool (Phase 2B) */}
        <button
          type="button"
          className={`toolbar-tool-btn ${activeTool === 'whiteout' ? 'is-active' : ''}`}
          onClick={() => handleToolClick('whiteout', 'Whiteout redaction will be available in Phase 2B')}
          title="Whiteout Redact (Phase 2B)"
          aria-label="Whiteout tool"
        >
          <FontAwesomeIcon icon={faEraser} />
          <span className="tool-btn-label">Whiteout</span>
          <span className="tool-phase-tag">P2B</span>
        </button>
      </div>
    </header>
  );
}
