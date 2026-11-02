/**
 * Simatrix PDF Tools - Editor Text Replacement Dialog (Phase 2B)
 * 
 * Provides an honest, reliable modal for replacing detected text or manual areas:
 * - Shows original text.
 * - Allows entering replacement text.
 * - Provides background cover color options (White, Pale Yellow, Tinted, Custom).
 * - Matches or customizes font family, size, color, bold, italic, and alignment.
 * - Transparently notes that replacement applies a matching background cover.
 */

import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faXmark,
  faCheck,
  faBold,
  faItalic,
  faAlignLeft,
  faAlignCenter,
  faAlignRight,
  faShieldHalved,
  faPlus,
  faMinus,
} from '@fortawesome/free-solid-svg-icons';
import { TEXT_COLOR_PRESETS, BG_COLOR_PRESETS } from './EditorPropertiesPanel';

export default function EditorReplaceModal({
  isOpen = false,
  replacementData = null,
  onApply,
  onCancel,
}) {
  const [replacementText, setReplacementText] = useState('');
  const [fontFamily, setFontFamily] = useState('Helvetica');
  const [fontSize, setFontSize] = useState(14);
  const [color, setColor] = useState('#111827');
  const [backgroundColor, setBackgroundColor] = useState('#FFFFFF');
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [align, setAlign] = useState('left');

  const textareaRef = useRef(null);

  useEffect(() => {
    if (replacementData) {
      setReplacementText(replacementData.originalText || '');
      setFontFamily(replacementData.fontFamily || 'Helvetica');
      setFontSize(replacementData.fontSize || 14);
      setColor('#111827');
      setBackgroundColor('#FFFFFF'); // White cover by default
      setBold(false);
      setItalic(false);
      setAlign('left');

      // Autofocus textarea after modal renders
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.select();
        }
      }, 60);
    }
  }, [replacementData]);

  if (!isOpen || !replacementData) return null;

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!replacementText.trim()) return;

    onApply({
      ...replacementData,
      text: replacementText,
      fontFamily,
      fontSize,
      color,
      backgroundColor,
      bold,
      italic,
      align,
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onCancel();
    }
  };

  return (
    <div
      className="editor-modal-backdrop"
      onKeyDown={handleKeyDown}
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="replace-modal-title"
    >
      <div
        className="editor-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="editor-modal-header">
          <h3 id="replace-modal-title" className="editor-modal-title">
            {replacementData.isManualArea ? 'Replace Document Area' : 'Replace Existing Text'}
          </h3>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onCancel}
            title="Cancel and close dialog (Esc)"
            aria-label="Close"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="editor-modal-body">
          {/* 1. Original Text Section */}
          <div className="replace-field-group">
            <label className="replace-field-label">
              {replacementData.isManualArea ? 'Selected Area Dimensions' : 'Original Text Detected'}
            </label>
            {replacementData.isManualArea ? (
              <div className="replace-original-quote is-area-dimensions">
                {replacementData.ptWidth} × {replacementData.ptHeight} pt (Page {replacementData.page || 1})
              </div>
            ) : (
              <div className="replace-original-quote">
                "{replacementData.originalText}"
              </div>
            )}
          </div>

          {/* 2. Replacement Text Input */}
          <div className="replace-field-group">
            <label htmlFor="replacement-textarea" className="replace-field-label">
              Replacement Text <span className="required-star">*</span>
            </label>
            <textarea
              id="replacement-textarea"
              ref={textareaRef}
              rows={3}
              className="replace-textarea-input"
              value={replacementText}
              onChange={(e) => setReplacementText(e.target.value)}
              placeholder="Enter replacement text..."
              required
            />
          </div>

          {/* 3. Typography & Styling Settings */}
          <div className="replace-formatting-grid">
            {/* Font Family */}
            <div className="format-col">
              <label htmlFor="replace-font-family" className="replace-field-label">
                Font Family
              </label>
              <select
                id="replace-font-family"
                className="format-select-input"
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
              >
                <option value="Helvetica">Helvetica (Sans-Serif)</option>
                <option value="Times Roman">Times Roman (Serif)</option>
                <option value="Courier">Courier (Monospace)</option>
              </select>
            </div>

            {/* Font Size */}
            <div className="format-col">
              <label htmlFor="replace-font-size" className="replace-field-label">
                Font Size ({fontSize} pt)
              </label>
              <div className="font-size-stepper-row">
                <button
                  type="button"
                  className="size-step-btn"
                  onClick={() => setFontSize((prev) => Math.max(8, prev - 1))}
                  title="Decrease Size"
                >
                  <FontAwesomeIcon icon={faMinus} />
                </button>
                <input
                  id="replace-font-size"
                  type="number"
                  min="8"
                  max="96"
                  className="size-number-input"
                  value={fontSize}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v) && v >= 6 && v <= 120) setFontSize(v);
                  }}
                />
                <button
                  type="button"
                  className="size-step-btn"
                  onClick={() => setFontSize((prev) => Math.min(96, prev + 1))}
                  title="Increase Size"
                >
                  <FontAwesomeIcon icon={faPlus} />
                </button>
              </div>
            </div>
          </div>

          {/* 4. Style & Alignment Toggles */}
          <div className="replace-formatting-grid">
            <div className="format-col">
              <label className="replace-field-label">Style & Alignment</label>
              <div className="format-toggles-row">
                <button
                  type="button"
                  className={`format-toggle-btn ${bold ? 'is-active' : ''}`}
                  onClick={() => setBold(!bold)}
                  title="Bold"
                >
                  <FontAwesomeIcon icon={faBold} />
                </button>
                <button
                  type="button"
                  className={`format-toggle-btn ${italic ? 'is-active' : ''}`}
                  onClick={() => setItalic(!italic)}
                  title="Italic"
                >
                  <FontAwesomeIcon icon={faItalic} />
                </button>
                <div className="toggles-divider" />
                <button
                  type="button"
                  className={`format-toggle-btn ${align === 'left' ? 'is-active' : ''}`}
                  onClick={() => setAlign('left')}
                  title="Align Left"
                >
                  <FontAwesomeIcon icon={faAlignLeft} />
                </button>
                <button
                  type="button"
                  className={`format-toggle-btn ${align === 'center' ? 'is-active' : ''}`}
                  onClick={() => setAlign('center')}
                  title="Align Center"
                >
                  <FontAwesomeIcon icon={faAlignCenter} />
                </button>
                <button
                  type="button"
                  className={`format-toggle-btn ${align === 'right' ? 'is-active' : ''}`}
                  onClick={() => setAlign('right')}
                  title="Align Right"
                >
                  <FontAwesomeIcon icon={faAlignRight} />
                </button>
              </div>
            </div>

            {/* Text Color */}
            <div className="format-col">
              <label className="replace-field-label">Text Color</label>
              <div className="color-swatches-row">
                {TEXT_COLOR_PRESETS.slice(0, 4).map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    className={`color-swatch-btn ${color.toLowerCase() === c.hex.toLowerCase() ? 'is-active' : ''}`}
                    style={{ backgroundColor: c.hex }}
                    onClick={() => setColor(c.hex)}
                    title={c.label}
                  >
                    {color.toLowerCase() === c.hex.toLowerCase() && (
                      <FontAwesomeIcon icon={faCheck} className="swatch-check" />
                    )}
                  </button>
                ))}
                <label className="custom-color-picker-label" title="Custom text color">
                  <input
                    type="color"
                    className="custom-color-input"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                  />
                  <span className="custom-color-indicator" style={{ backgroundColor: color }} />
                </label>
              </div>
            </div>
          </div>

          {/* 5. Cover Background Color (Whiteout) */}
          <div className="replace-field-group">
            <label className="replace-field-label">
              Background Cover Overlay (covers original text)
            </label>
            <div className="color-swatches-row">
              {BG_COLOR_PRESETS.map((bg) => (
                <button
                  key={bg.hex}
                  type="button"
                  className={`color-swatch-btn ${bg.hex === 'transparent' ? 'is-transparent-swatch' : ''} ${backgroundColor.toLowerCase() === bg.hex.toLowerCase() ? 'is-active' : ''}`}
                  style={{ backgroundColor: bg.hex === 'transparent' ? 'transparent' : bg.hex }}
                  onClick={() => setBackgroundColor(bg.hex)}
                  title={bg.label}
                >
                  {bg.hex === 'transparent' && <span className="none-slash-icon">/</span>}
                  {backgroundColor.toLowerCase() === bg.hex.toLowerCase() && bg.hex !== 'transparent' && (
                    <FontAwesomeIcon icon={faCheck} className="swatch-check" />
                  )}
                </button>
              ))}
              <label className="custom-color-picker-label" title="Custom background color match">
                <input
                  type="color"
                  className="custom-color-input"
                  value={backgroundColor === 'transparent' ? '#FFFFFF' : backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                />
                <span className="custom-color-indicator" style={{ backgroundColor }} />
              </label>
            </div>
          </div>

          {/* 6. Technical Notice */}
          <div className="replace-notice-box">
            <FontAwesomeIcon icon={faShieldHalved} className="replace-notice-icon" />
            <p className="replace-notice-text">
              <strong>Notice:</strong> This feature applies a matching background cover overlay and renders replacement text at the exact document coordinates. It visually replaces the text while preserving the rest of the original PDF document.
            </p>
          </div>

          {/* 7. Action Buttons */}
          <div className="editor-modal-footer">
            <button
              type="button"
              className="btn btn-secondary modal-cancel-btn"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary modal-apply-btn"
              disabled={!replacementText.trim()}
            >
              <FontAwesomeIcon icon={faCheck} />
              <span>Apply Replacement</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

