import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleInfo,
  faTag,
  faFont,
  faXmark,
  faFloppyDisk,
  faCheck,
  faSpinner,
  faFilePdf,
  faBold,
  faItalic,
  faUnderline,
  faAlignLeft,
  faAlignCenter,
  faAlignRight,
  faAlignJustify,
  faTrashCan,
  faPlus,
  faMinus,
  faRotateLeft,
} from '@fortawesome/free-solid-svg-icons';
import { formatFileSize } from '../../utils/formatFileSize';
import { formatDimensionsDescription } from '../../utils/editorCoordinates';

// Text formatting preset palettes
export const TEXT_COLOR_PRESETS = [
  { label: 'Black', hex: '#111827' },
  { label: 'Dark Slate', hex: '#374151' },
  { label: 'Blue', hex: '#2563EB' },
  { label: 'Red', hex: '#DC2626' },
  { label: 'Green', hex: '#16A34A' },
  { label: 'Purple', hex: '#9333EA' },
  { label: 'Amber', hex: '#D97706' },
];

export const BG_COLOR_PRESETS = [
  { label: 'White', hex: '#FFFFFF' },
  { label: 'Transparent', hex: 'transparent' },
  { label: 'Yellow', hex: '#FEF08A' },
  { label: 'Light Blue', hex: '#DBEAFE' },
  { label: 'Light Green', hex: '#DCFCE7' },
];

export default function EditorPropertiesPanel({
  isOpen = true,
  onClose,
  file,
  currentPage = 1,
  totalPages = 1,
  pageGeometry = null,
  metadata = null,
  isReadingMetadata = false,
  onUpdateMetadata,
  isSavingMetadata = false,
  metadataSaved = false,
  // Existing Text Active Editing Session Props
  activeTextEdit = null,
  onUpdateActiveTextEdit,
  onApplyActiveTextEdit,
  onCancelActiveTextEdit,
  onRevertActiveTextEdit,
  // Contextual Floating Text Box Props
  selectedTextBox = null,
  onUpdateSelectedTextBox,
  onDeleteSelectedTextBox,
}) {
  const [activeTab, setActiveTab] = useState('properties'); // 'properties' | 'metadata' | 'text'
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [subject, setSubject] = useState('');
  const [keywords, setKeywords] = useState('');

  // Target object to format: either the active existing text edit or the selected floating text box
  const targetFormat = activeTextEdit || selectedTextBox;
  const isEditingExistingText = !!activeTextEdit;

  // Automatically switch tab to 'text' whenever a text selection or text box is active
  useEffect(() => {
    if (activeTextEdit || selectedTextBox) {
      setActiveTab('text');
    } else if (activeTab === 'text') {
      setActiveTab('properties');
    }
  }, [activeTextEdit, selectedTextBox]);

  // Sync internal form when metadata is read from document
  useEffect(() => {
    if (metadata) {
      setTitle(metadata.title || '');
      setAuthor(metadata.author || '');
      setSubject(metadata.subject || '');
      setKeywords(metadata.keywords || '');
    }
  }, [metadata]);

  if (!isOpen) return null;

  // Handler for formatting updates (dispatches to either activeTextEdit or selectedTextBox)
  const handleUpdateFormat = (updates) => {
    if (activeTextEdit && typeof onUpdateActiveTextEdit === 'function') {
      onUpdateActiveTextEdit(updates);
    } else if (selectedTextBox && typeof onUpdateSelectedTextBox === 'function') {
      onUpdateSelectedTextBox(updates);
    }
  };

  const handleMetadataSubmit = (e) => {
    if (e) e.preventDefault();
    if (typeof onUpdateMetadata === 'function') {
      onUpdateMetadata({
        title: title.trim(),
        author: author.trim(),
        subject: subject.trim(),
        keywords: keywords.trim(),
      });
    }
  };

  const dimensionsDesc = pageGeometry
    ? formatDimensionsDescription(pageGeometry.widthPt, pageGeometry.heightPt)
    : '612 × 792 pt (Letter)';

  const orientation = pageGeometry
    ? pageGeometry.widthPt > pageGeometry.heightPt
      ? 'Landscape'
      : 'Portrait'
    : 'Portrait';

  const rotationAngle = pageGeometry?.rotation ? `${pageGeometry.rotation}°` : '0°';

  return (
    <aside
      className="editor-right-properties"
      aria-label="Document Properties and Formatting"
      onMouseDown={(e) => {
        // Prevent clicking inside properties panel from stealing focus / blurring the canvas text editor
        e.stopPropagation();
      }}
    >
      {/* Panel Header */}
      <div className="properties-header-row">
        <div className="properties-tabs-pill-group" role="tablist">
          {targetFormat && (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'text'}
              className={`prop-tab-btn ${activeTab === 'text' ? 'is-active is-text-active' : ''}`}
              onClick={() => setActiveTab('text')}
            >
              <FontAwesomeIcon icon={faFont} />
              <span>{isEditingExistingText ? 'Edit Text' : 'Text'}</span>
            </button>
          )}

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'properties'}
            className={`prop-tab-btn ${activeTab === 'properties' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('properties')}
          >
            <FontAwesomeIcon icon={faCircleInfo} />
            <span>Doc</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'metadata'}
            className={`prop-tab-btn ${activeTab === 'metadata' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('metadata')}
          >
            <FontAwesomeIcon icon={faTag} />
            <span>Metadata</span>
          </button>
        </div>

        {onClose && (
          <button
            type="button"
            className="properties-close-btn"
            onClick={onClose}
            title="Close Panel"
            aria-label="Close properties panel"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        )}
      </div>

      {/* Tab Panels */}
      <div className="properties-scroll-body">
        {activeTab === 'text' && targetFormat ? (
          /* ====================================================================
             TAB 1: TEXT FORMATTING CONTROLS (Word-like Rich Text Inspector)
             ==================================================================== */
          <div className="properties-section text-format-section">
            {/* Header info badge */}
            <div className="text-section-badge-row">
              <span className="text-section-type-badge">
                {isEditingExistingText
                  ? (targetFormat.type || targetFormat.sectionType || 'Text').toUpperCase()
                  : 'FLOATING TEXT BOX'}
              </span>
              <span className="text-section-page-badge">Page {currentPage}</span>
            </div>

            {/* SECTION 1: FONT */}
            <div className="prop-section-group font-group">
              <h5 className="prop-section-header">Font</h5>

              {/* Font Family */}
              <div className="format-control-group">
                <label htmlFor="font-family-select" className="format-control-label">
                  Font Family
                </label>
                <select
                  id="font-family-select"
                  className="format-select-input"
                  value={targetFormat.fontFamily || 'Helvetica'}
                  onChange={(e) => handleUpdateFormat({ fontFamily: e.target.value })}
                >
                  <option value="Helvetica">Helvetica (Sans-serif)</option>
                  <option value="Times Roman">Times New Roman (Serif)</option>
                  <option value="Courier">Courier New (Monospace)</option>
                  <option value="Arial">Arial (Clean Sans)</option>
                  <option value="Georgia">Georgia (Editorial Serif)</option>
                </select>
              </div>

              {/* Font Size (Number + Steppers + Range Slider) */}
              <div className="format-control-group">
                <div className="label-with-value-row">
                  <label htmlFor="font-size-input" className="format-control-label">
                    Font Size
                  </label>
                  <span className="format-val-badge">{targetFormat.fontSize || 14} pt</span>
                </div>
                <div className="font-size-stepper-row">
                  <button
                    type="button"
                    className="size-step-btn"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() =>
                      handleUpdateFormat({
                        fontSize: Math.max(6, (targetFormat.fontSize || 14) - 1),
                      })
                    }
                    title="Decrease Font Size"
                    aria-label="Decrease font size"
                  >
                    <FontAwesomeIcon icon={faMinus} />
                  </button>
                  <input
                    id="font-size-input"
                    type="number"
                    min="6"
                    max="120"
                    className="size-number-input"
                    value={targetFormat.fontSize || 14}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val >= 6 && val <= 120) {
                        handleUpdateFormat({ fontSize: val });
                      }
                    }}
                    aria-label="Font size in points"
                  />
                  <button
                    type="button"
                    className="size-step-btn"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() =>
                      handleUpdateFormat({
                        fontSize: Math.min(120, (targetFormat.fontSize || 14) + 1),
                      })
                    }
                    title="Increase Font Size"
                    aria-label="Increase font size"
                  >
                    <FontAwesomeIcon icon={faPlus} />
                  </button>
                  <input
                    type="range"
                    min="8"
                    max="72"
                    className="format-range-slider"
                    value={Math.min(72, Math.max(8, targetFormat.fontSize || 14))}
                    onChange={(e) => handleUpdateFormat({ fontSize: parseInt(e.target.value, 10) })}
                    aria-label="Font size slider"
                  />
                </div>
              </div>

              {/* Font Style Toggles (Bold, Italic, Underline) */}
              <div className="format-control-group">
                <label className="format-control-label">Font Style</label>
                <div className="format-toggles-row">
                  <button
                    type="button"
                    className={`format-toggle-btn ${targetFormat.bold ? 'is-active' : ''}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleUpdateFormat({ bold: !targetFormat.bold })}
                    title="Bold (Ctrl+B)"
                    aria-label="Bold text"
                    aria-pressed={!!targetFormat.bold}
                  >
                    <FontAwesomeIcon icon={faBold} />
                  </button>
                  <button
                    type="button"
                    className={`format-toggle-btn ${targetFormat.italic ? 'is-active' : ''}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleUpdateFormat({ italic: !targetFormat.italic })}
                    title="Italic (Ctrl+I)"
                    aria-label="Italic text"
                    aria-pressed={!!targetFormat.italic}
                  >
                    <FontAwesomeIcon icon={faItalic} />
                  </button>
                  <button
                    type="button"
                    className={`format-toggle-btn ${targetFormat.underline ? 'is-active' : ''}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleUpdateFormat({ underline: !targetFormat.underline })}
                    title="Underline (Ctrl+U)"
                    aria-label="Underline text"
                    aria-pressed={!!targetFormat.underline}
                  >
                    <FontAwesomeIcon icon={faUnderline} />
                  </button>
                </div>
              </div>
            </div>

            {/* SECTION 2: COLOR */}
            <div className="prop-section-group color-group">
              <h5 className="prop-section-header">Color</h5>

              {/* Text Color */}
              <div className="format-control-group">
                <label className="format-control-label">Text Color</label>
                <div className="color-swatches-row">
                  {TEXT_COLOR_PRESETS.map((color) => {
                    const isCur = (targetFormat.color || '#111827').toLowerCase() === color.hex.toLowerCase();
                    return (
                      <button
                        key={color.hex}
                        type="button"
                        className={`color-swatch-btn ${isCur ? 'is-active' : ''}`}
                        style={{ backgroundColor: color.hex }}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleUpdateFormat({ color: color.hex })}
                        title={color.label}
                        aria-label={`Color ${color.label}`}
                      >
                        {isCur && <FontAwesomeIcon icon={faCheck} className="swatch-check" />}
                      </button>
                    );
                  })}
                  <label className="custom-color-picker-label" title="Custom color picker">
                    <input
                      type="color"
                      className="custom-color-input"
                      value={targetFormat.color || '#111827'}
                      onChange={(e) => handleUpdateFormat({ color: e.target.value })}
                      aria-label="Custom text color"
                    />
                    <span className="custom-color-indicator" style={{ backgroundColor: targetFormat.color || '#111827' }} />
                  </label>
                </div>
              </div>

              {/* Background / Cover Color */}
              <div className="format-control-group">
                <label className="format-control-label">Background / Cover</label>
                <div className="color-swatches-row">
                  {BG_COLOR_PRESETS.map((bg) => {
                    const isCur = (targetFormat.backgroundColor || '#FFFFFF').toLowerCase() === bg.hex.toLowerCase();
                    return (
                      <button
                        key={bg.hex}
                        type="button"
                        className={`color-swatch-btn ${bg.hex === 'transparent' ? 'is-transparent-swatch' : ''} ${isCur ? 'is-active' : ''}`}
                        style={{ backgroundColor: bg.hex === 'transparent' ? 'transparent' : bg.hex }}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleUpdateFormat({ backgroundColor: bg.hex })}
                        title={bg.label}
                        aria-label={`Background ${bg.label}`}
                      >
                        {bg.hex === 'transparent' && <span className="none-slash-icon">/</span>}
                        {isCur && bg.hex !== 'transparent' && <FontAwesomeIcon icon={faCheck} className="swatch-check" />}
                      </button>
                    );
                  })}
                  <label className="custom-color-picker-label" title="Custom background color">
                    <input
                      type="color"
                      className="custom-color-input"
                      value={targetFormat.backgroundColor || '#FFFFFF'}
                      onChange={(e) => handleUpdateFormat({ backgroundColor: e.target.value })}
                      aria-label="Custom background color"
                    />
                    <span className="custom-color-indicator" style={{ backgroundColor: targetFormat.backgroundColor || '#FFFFFF' }} />
                  </label>
                </div>
              </div>
            </div>

            {/* SECTION 3: ALIGNMENT */}
            <div className="prop-section-group alignment-group">
              <h5 className="prop-section-header">Alignment</h5>
              <div className="format-toggles-row alignment-toggles-row">
                <button
                  type="button"
                  className={`format-toggle-btn ${targetFormat.align === 'left' || !targetFormat.align ? 'is-active' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleUpdateFormat({ align: 'left' })}
                  title="Align Left"
                  aria-label="Align left"
                  aria-pressed={targetFormat.align === 'left' || !targetFormat.align}
                >
                  <FontAwesomeIcon icon={faAlignLeft} />
                  <span className="toggle-label-text">Left</span>
                </button>
                <button
                  type="button"
                  className={`format-toggle-btn ${targetFormat.align === 'center' ? 'is-active' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleUpdateFormat({ align: 'center' })}
                  title="Align Center"
                  aria-label="Align center"
                  aria-pressed={targetFormat.align === 'center'}
                >
                  <FontAwesomeIcon icon={faAlignCenter} />
                  <span className="toggle-label-text">Center</span>
                </button>
                <button
                  type="button"
                  className={`format-toggle-btn ${targetFormat.align === 'right' ? 'is-active' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleUpdateFormat({ align: 'right' })}
                  title="Align Right"
                  aria-label="Align right"
                  aria-pressed={targetFormat.align === 'right'}
                >
                  <FontAwesomeIcon icon={faAlignRight} />
                  <span className="toggle-label-text">Right</span>
                </button>
                <button
                  type="button"
                  className={`format-toggle-btn ${targetFormat.align === 'justify' ? 'is-active' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleUpdateFormat({ align: 'justify' })}
                  title="Align Justify"
                  aria-label="Align justify"
                  aria-pressed={targetFormat.align === 'justify'}
                >
                  <FontAwesomeIcon icon={faAlignJustify} />
                  <span className="toggle-label-text">Justify</span>
                </button>
              </div>
            </div>

            {/* SECTION 4: SPACING & LAYOUT */}
            <div className="prop-section-group spacing-group">
              <h5 className="prop-section-header">Spacing</h5>

              {/* Line Spacing */}
              <div className="format-control-group">
                <div className="label-with-value-row">
                  <label htmlFor="line-spacing-select" className="format-control-label">
                    Line Spacing
                  </label>
                  <span className="format-val-badge">{targetFormat.lineHeight || 1.25}x</span>
                </div>
                <select
                  id="line-spacing-select"
                  className="format-select-input"
                  value={targetFormat.lineHeight || 1.25}
                  onChange={(e) => handleUpdateFormat({ lineHeight: parseFloat(e.target.value) })}
                >
                  <option value="1.0">Single (1.0)</option>
                  <option value="1.15">Compact (1.15)</option>
                  <option value="1.25">Standard (1.25)</option>
                  <option value="1.5">1.5 Lines</option>
                  <option value="2.0">Double (2.0)</option>
                </select>
              </div>

              {/* Character Spacing */}
              <div className="format-control-group">
                <div className="label-with-value-row">
                  <label htmlFor="letter-spacing-select" className="format-control-label">
                    Character Spacing
                  </label>
                  <span className="format-val-badge">{targetFormat.letterSpacing || 0} pt</span>
                </div>
                <select
                  id="letter-spacing-select"
                  className="format-select-input"
                  value={targetFormat.letterSpacing || 0}
                  onChange={(e) => handleUpdateFormat({ letterSpacing: parseFloat(e.target.value) })}
                >
                  <option value="-0.5">Tight (-0.5 pt)</option>
                  <option value="0">Normal (0 pt)</option>
                  <option value="1">Wide (+1 pt)</option>
                  <option value="2">Expanded (+2 pt)</option>
                  <option value="3">Very Wide (+3 pt)</option>
                </select>
              </div>

              {/* Text Opacity */}
              <div className="format-control-group">
                <div className="label-with-value-row">
                  <label htmlFor="text-opacity-slider" className="format-control-label">
                    Text Opacity
                  </label>
                  <span className="format-val-badge">{Math.round((targetFormat.opacity ?? 1.0) * 100)}%</span>
                </div>
                <input
                  id="text-opacity-slider"
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  className="format-range-slider"
                  value={targetFormat.opacity ?? 1.0}
                  onChange={(e) => handleUpdateFormat({ opacity: parseFloat(e.target.value) })}
                  aria-label="Text opacity slider"
                />
              </div>

              {/* Capitalization Pattern (For existing text edits) */}
              {isEditingExistingText && (
                <div className="format-control-group">
                  <label className="format-control-label">Capitalization</label>
                  <div className="capitalization-pills-row">
                    {[
                      { id: 'preserve', label: 'Match Original' },
                      { id: 'none', label: 'As Typed' },
                      { id: 'upper', label: 'UPPER' },
                      { id: 'lower', label: 'lower' },
                      { id: 'title', label: 'Title' },
                    ].map((cap) => (
                      <button
                        key={cap.id}
                        type="button"
                        className={`cap-pill-btn ${(targetFormat.capitalization || 'preserve') === cap.id ? 'is-active' : ''}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleUpdateFormat({ capitalization: cap.id })}
                      >
                        {cap.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ACTION CONTROLS: Apply, Cancel, Revert (or Delete if floating box) */}
            <div className="format-action-row">
              {isEditingExistingText ? (
                <div className="existing-edit-panel-actions">
                  <button
                    type="button"
                    className="btn btn-primary panel-apply-btn"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={onApplyActiveTextEdit}
                    title="Apply text and formatting changes"
                  >
                    <FontAwesomeIcon icon={faCheck} />
                    <span>Apply Changes</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary panel-cancel-btn"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={onCancelActiveTextEdit}
                    title="Cancel changes in current unfinished session"
                  >
                    <FontAwesomeIcon icon={faXmark} />
                    <span>Cancel</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary panel-revert-btn"
                    disabled={
                      !targetFormat.isExistingReplacement &&
                      !(Array.isArray(targetFormat.history) && targetFormat.history.length > 0) &&
                      !(targetFormat.wordHistories && Object.keys(targetFormat.wordHistories).length > 0)
                    }
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={onRevertActiveTextEdit}
                    title="Revert most recent applied edit to previous version or original text"
                  >
                    <FontAwesomeIcon icon={faRotateLeft} />
                    <span>Revert</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-danger-outline delete-textbox-btn"
                  onClick={onDeleteSelectedTextBox}
                  title="Delete Selected Text Box"
                  aria-label="Delete text box"
                >
                  <FontAwesomeIcon icon={faTrashCan} />
                  <span>Delete Text Box</span>
                </button>
              )}
            </div>
          </div>
        ) : activeTab === 'properties' ? (
          /* ====================================================================
             TAB 2: DOCUMENT INFORMATION SPECIFICATIONS
             ==================================================================== */
          <div className="properties-section">
            <h4 className="properties-section-title">Document Information</h4>

            <div className="prop-spec-grid">
              <div className="prop-spec-item">
                <span className="spec-label">File Name</span>
                <span className="spec-value text-truncate" title={file?.name || 'Document.pdf'}>
                  {file?.name || 'Document.pdf'}
                </span>
              </div>

              <div className="prop-spec-item">
                <span className="spec-label">File Size</span>
                <span className="spec-value">
                  {file?.size ? formatFileSize(file.size) : 'Unknown'}
                </span>
              </div>

              <div className="prop-spec-item">
                <span className="spec-label">Total Pages</span>
                <span className="spec-value">{totalPages}</span>
              </div>

              <div className="prop-spec-item">
                <span className="spec-label">Current Page</span>
                <span className="spec-value">Page {currentPage} of {totalPages}</span>
              </div>

              <div className="prop-spec-item">
                <span className="spec-label">Page Dimensions</span>
                <span className="spec-value" style={{ fontSize: '0.82rem' }}>
                  {dimensionsDesc}
                </span>
              </div>

              <div className="prop-spec-item">
                <span className="spec-label">Orientation</span>
                <span className="spec-value">{orientation}</span>
              </div>

              <div className="prop-spec-item">
                <span className="spec-label">Rotation</span>
                <span className="spec-value">{rotationAngle}</span>
              </div>
            </div>
          </div>
        ) : (
          /* ====================================================================
             TAB 3: DOCUMENT METADATA EDITOR
             ==================================================================== */
          <div className="properties-section">
            <div className="metadata-header-row">
              <h4 className="properties-section-title">Document Metadata</h4>
              {isReadingMetadata && (
                <span className="metadata-status-pill loading">
                  <FontAwesomeIcon icon={faSpinner} spin /> Reading...
                </span>
              )}
              {metadataSaved && (
                <span className="metadata-status-pill saved">
                  <FontAwesomeIcon icon={faCheck} /> Saved
                </span>
              )}
            </div>

            <form onSubmit={handleMetadataSubmit} className="metadata-form">
              <div className="form-group">
                <label htmlFor="meta-title" className="form-label">Title</label>
                <input
                  id="meta-title"
                  type="text"
                  className="form-control"
                  placeholder="e.g. Annual Financial Report"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isSavingMetadata || isReadingMetadata}
                />
              </div>

              <div className="form-group">
                <label htmlFor="meta-author" className="form-label">Author / Creator</label>
                <input
                  id="meta-author"
                  type="text"
                  className="form-control"
                  placeholder="e.g. Jane Doe or Simatrix Academy"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  disabled={isSavingMetadata || isReadingMetadata}
                />
              </div>

              <div className="form-group">
                <label htmlFor="meta-subject" className="form-label">Subject</label>
                <input
                  id="meta-subject"
                  type="text"
                  className="form-control"
                  placeholder="e.g. Financial Statements & Analysis"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={isSavingMetadata || isReadingMetadata}
                />
              </div>

              <div className="form-group">
                <label htmlFor="meta-keywords" className="form-label">Keywords</label>
                <input
                  id="meta-keywords"
                  type="text"
                  className="form-control"
                  placeholder="e.g. finance, 2026, Q3 report, metrics"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  disabled={isSavingMetadata || isReadingMetadata}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary save-metadata-btn"
                disabled={isSavingMetadata || isReadingMetadata}
              >
                {isSavingMetadata ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin />
                    <span>Saving Metadata...</span>
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faFloppyDisk} />
                    <span>Save & Update Metadata</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </aside>
  );
}
