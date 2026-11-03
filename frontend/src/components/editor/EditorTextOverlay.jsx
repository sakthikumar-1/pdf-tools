import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTrashCan,
  faPen,
  faArrowsUpDownLeftRight,
  faCheck,
} from '@fortawesome/free-solid-svg-icons';

// Font family mapping from standard PDF names to CSS font stacks
export const FONT_STACKS = {
  'Helvetica': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
  'Times Roman': '"Times New Roman", Times, Georgia, serif',
  'Courier': '"Courier New", Courier, monospace',
};

export default function EditorTextOverlay({
  textBoxes = [],
  currentPage = 1,
  zoom = 1.0,
  pagePtWidth = 612,
  pagePtHeight = 792,
  activeTool = 'select',
  selectedTextBoxId = null,
  onSelectTextBox,
  onDeselect,
  onCreateTextBox,
  onUpdateTextBox,
  onDeleteTextBox,
}) {
  const containerRef = useRef(null);

  // ID of the text box currently in inline textarea editing mode
  const [editingId, setEditingId] = useState(null);
  const editingInitialTextRef = useRef('');

  // Active interaction: { type: 'move' | 'resize', boxId, handle, startClientX, startClientY, origPtX, origPtY, origPtW, origPtH }
  const interactionRef = useRef(null);

  // Filter text boxes belonging to the active page
  const pageBoxes = textBoxes.filter((b) => b.page === currentPage);

  // Finish inline editing when clicking outside
  const finishEditing = useCallback((boxId, newText) => {
    if (editingId === boxId) {
      setEditingId(null);
      if (editingInitialTextRef.current !== newText) {
        onUpdateTextBox(boxId, { text: newText }, true);
      }
    }
  }, [editingId, onUpdateTextBox]);

  // --------------------------------------------------------------------------
  // CLICK OVERLAY: Create new text box when activeTool is 'text'
  // --------------------------------------------------------------------------
  const handleOverlayClick = (e) => {
    // If user clicked a text box or handle, stop
    if (e.target.closest('.editor-text-box-item')) {
      return;
    }

    // If a text box was selected, deselect it
    if (selectedTextBoxId) {
      onDeselect();
    }
    if (editingId) {
      setEditingId(null);
    }

    // Only create a new text box if the Text tool is active
    if (activeTool !== 'text') {
      return;
    }

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // Convert to unscaled PDF points
    const rawPtX = screenX / zoom;
    const rawPtY = screenY / zoom;

    const defaultPtW = 160;
    const defaultPtH = 44;

    // Clamp within page boundaries
    const ptX = Math.max(0, Math.min(Math.round(rawPtX), pagePtWidth - defaultPtW));
    const ptY = Math.max(0, Math.min(Math.round(rawPtY), pagePtHeight - defaultPtH));

    const newBox = {
      id: `tb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      page: currentPage,
      ptX,
      ptY,
      ptWidth: defaultPtW,
      ptHeight: defaultPtH,
      text: 'Type your text here',
      fontFamily: 'Helvetica',
      fontSize: 14,
      color: '#111827',
      bold: false,
      italic: false,
      align: 'left',
      lineHeight: 1.25,
      backgroundColor: 'transparent',
    };

    onCreateTextBox(newBox);
    setEditingId(newBox.id);
    editingInitialTextRef.current = newBox.text;
  };

  // --------------------------------------------------------------------------
  // DRAG & MOVE INTERACTION (Mouse & Touch)
  // --------------------------------------------------------------------------
  const startMove = (e, box) => {
    // If currently editing text inside the textarea, let typing/selection proceed
    if (editingId === box.id && (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT')) {
      return;
    }

    e.stopPropagation();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    onSelectTextBox(box.id);

    interactionRef.current = {
      type: 'move',
      boxId: box.id,
      startClientX: clientX,
      startClientY: clientY,
      origPtX: box.ptX,
      origPtY: box.ptY,
      hasMoved: false,
    };
  };

  // --------------------------------------------------------------------------
  // RESIZE INTERACTION (Mouse & Touch)
  // --------------------------------------------------------------------------
  const startResize = (e, box, handle) => {
    e.stopPropagation();
    if (e.cancelable && e.touches) {
      e.preventDefault();
    }

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    onSelectTextBox(box.id);

    interactionRef.current = {
      type: 'resize',
      boxId: box.id,
      handle,
      startClientX: clientX,
      startClientY: clientY,
      origPtX: box.ptX,
      origPtY: box.ptY,
      origPtW: box.ptWidth,
      origPtH: box.ptHeight,
      hasResized: false,
    };
  };

  // --------------------------------------------------------------------------
  // GLOBAL MOUSE & TOUCH EVENT LISTENERS (WINDOW SCOPE)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const handleMove = (e) => {
      const interaction = interactionRef.current;
      if (!interaction) return;

      if (e.cancelable && e.touches) {
        e.preventDefault();
      }

      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      const deltaScreenX = clientX - interaction.startClientX;
      const deltaScreenY = clientY - interaction.startClientY;

      const deltaPtX = deltaScreenX / zoom;
      const deltaPtY = deltaScreenY / zoom;

      const box = pageBoxes.find((b) => b.id === interaction.boxId);
      if (!box) return;

      if (interaction.type === 'move') {
        if (Math.abs(deltaScreenX) > 2 || Math.abs(deltaScreenY) > 2) {
          interaction.hasMoved = true;
        }

        const newPtX = Math.max(0, Math.min(Math.round(interaction.origPtX + deltaPtX), pagePtWidth - box.ptWidth));
        const newPtY = Math.max(0, Math.min(Math.round(interaction.origPtY + deltaPtY), pagePtHeight - box.ptHeight));

        onUpdateTextBox(box.id, { ptX: newPtX, ptY: newPtY }, false);
      } else if (interaction.type === 'resize') {
        interaction.hasResized = true;
        const handle = interaction.handle;

        let newPtX = interaction.origPtX;
        let newPtY = interaction.origPtY;
        let newPtW = interaction.origPtW;
        let newPtH = interaction.origPtH;

        const minW = 40;
        const minH = 24;

        if (handle.includes('e')) {
          newPtW = Math.max(minW, Math.min(Math.round(interaction.origPtW + deltaPtX), pagePtWidth - newPtX));
        }
        if (handle.includes('s')) {
          newPtH = Math.max(minH, Math.min(Math.round(interaction.origPtH + deltaPtY), pagePtHeight - newPtY));
        }
        if (handle.includes('w')) {
          const maxLeftShift = interaction.origPtW - minW;
          const shift = Math.min(maxLeftShift, Math.max(-interaction.origPtX, deltaPtX));
          newPtX = Math.round(interaction.origPtX + shift);
          newPtW = Math.round(interaction.origPtW - shift);
        }
        if (handle.includes('n')) {
          const maxUpShift = interaction.origPtH - minH;
          const shift = Math.min(maxUpShift, Math.max(-interaction.origPtY, deltaPtY));
          newPtY = Math.round(interaction.origPtY + shift);
          newPtH = Math.round(interaction.origPtH - shift);
        }

        onUpdateTextBox(box.id, { ptX: newPtX, ptY: newPtY, ptWidth: newPtW, ptHeight: newPtH }, false);
      }
    };

    const handleEnd = () => {
      const interaction = interactionRef.current;
      if (!interaction) return;

      const box = pageBoxes.find((b) => b.id === interaction.boxId);
      if (box && (interaction.hasMoved || interaction.hasResized)) {
        // Record undo history state snapshot now that gesture has ended
        onUpdateTextBox(box.id, {
          ptX: box.ptX,
          ptY: box.ptY,
          ptWidth: box.ptWidth,
          ptHeight: box.ptHeight,
        }, true);
      }

      interactionRef.current = null;
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [pageBoxes, zoom, pagePtWidth, pagePtHeight, onUpdateTextBox]);

  return (
    <div
      ref={containerRef}
      className={`editor-text-overlay ${activeTool === 'text' ? 'is-text-tool-active' : ''}`}
      onClick={handleOverlayClick}
      aria-label="Interactive Text Overlay"
    >
      {pageBoxes.map((box) => {
        const isSelected = box.id === selectedTextBoxId;
        const isEditing = box.id === editingId;

        // Convert unscaled PDF point coordinates into screen display pixels
        const screenX = Math.round(box.ptX * zoom);
        const screenY = Math.round(box.ptY * zoom);
        const screenW = Math.round(box.ptWidth * zoom);
        const screenH = Math.round(box.ptHeight * zoom);
        const screenFontSize = Math.max(9, Math.round(box.fontSize * zoom));

        const fontCss = FONT_STACKS[box.fontFamily] || FONT_STACKS['Helvetica'];

        return (
          <div
            key={box.id}
            className={`editor-text-box-item ${isSelected ? 'is-selected' : ''} ${isEditing ? 'is-editing' : ''}`}
            style={{
              left: `${screenX}px`,
              top: `${screenY}px`,
              width: `${screenW}px`,
              height: `${screenH}px`,
              backgroundColor: box.backgroundColor || 'transparent',
            }}
            onMouseDown={(e) => startMove(e, box)}
            onTouchStart={(e) => startMove(e, box)}
            onClick={(e) => {
              e.stopPropagation();
              onSelectTextBox(box.id);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditingId(box.id);
              editingInitialTextRef.current = box.text;
            }}
          >
            {/* Inline Text Content / Editor */}
            {isEditing ? (
              <textarea
                autoFocus
                className="box-inline-textarea"
                value={box.text}
                onChange={(e) => onUpdateTextBox(box.id, { text: e.target.value }, false)}
                onBlur={(e) => finishEditing(box.id, e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation(); // Avoid triggering parent global shortcuts while typing
                  if (e.key === 'Escape') {
                    finishEditing(box.id, e.target.value);
                  }
                }}
                style={{
                  fontFamily: fontCss,
                  fontSize: `${screenFontSize}px`,
                  color: box.color || '#111827',
                  fontWeight: box.bold ? 'bold' : 'normal',
                  fontStyle: box.italic ? 'italic' : 'normal',
                  textAlign: box.align || 'left',
                  lineHeight: box.lineHeight || 1.25,
                }}
              />
            ) : (
              <div
                className="box-rendered-text"
                style={{
                  fontFamily: fontCss,
                  fontSize: `${screenFontSize}px`,
                  color: box.color || '#111827',
                  fontWeight: box.bold ? 'bold' : 'normal',
                  fontStyle: box.italic ? 'italic' : 'normal',
                  textAlign: box.align || 'left',
                  lineHeight: box.lineHeight || 1.25,
                }}
              >
                {box.text || <span className="empty-text-placeholder">Click to enter text</span>}
              </div>
            )}

            {/* Selected State: Floating Action Badge (Edit & Delete) */}
            {isSelected && (
              <div className="box-floating-toolbar" onMouseDown={(e) => e.stopPropagation()}>
                <span className="box-drag-grip" title="Drag to move">
                  <FontAwesomeIcon icon={faArrowsUpDownLeftRight} />
                </span>
                {isEditing ? (
                  <button
                    type="button"
                    className="box-action-btn done-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      finishEditing(box.id, box.text);
                    }}
                    title="Done editing text"
                    aria-label="Done editing"
                  >
                    <FontAwesomeIcon icon={faCheck} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="box-action-btn edit-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(box.id);
                      editingInitialTextRef.current = box.text;
                    }}
                    title="Edit text content (Double-click)"
                    aria-label="Edit text content"
                  >
                    <FontAwesomeIcon icon={faPen} />
                  </button>
                )}
                <button
                  type="button"
                  className="box-action-btn delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteTextBox(box.id);
                  }}
                  title="Delete text box"
                  aria-label="Delete text box"
                >
                  <FontAwesomeIcon icon={faTrashCan} />
                </button>
              </div>
            )}

            {/* Selected State: 8 Resize Handles with generous touch hit zones */}
            {isSelected && !isEditing && (
              <>
                <div
                  className="resize-handle handle-nw"
                  onMouseDown={(e) => startResize(e, box, 'nw')}
                  onTouchStart={(e) => startResize(e, box, 'nw')}
                />
                <div
                  className="resize-handle handle-n"
                  onMouseDown={(e) => startResize(e, box, 'n')}
                  onTouchStart={(e) => startResize(e, box, 'n')}
                />
                <div
                  className="resize-handle handle-ne"
                  onMouseDown={(e) => startResize(e, box, 'ne')}
                  onTouchStart={(e) => startResize(e, box, 'ne')}
                />
                <div
                  className="resize-handle handle-e"
                  onMouseDown={(e) => startResize(e, box, 'e')}
                  onTouchStart={(e) => startResize(e, box, 'e')}
                />
                <div
                  className="resize-handle handle-se"
                  onMouseDown={(e) => startResize(e, box, 'se')}
                  onTouchStart={(e) => startResize(e, box, 'se')}
                />
                <div
                  className="resize-handle handle-s"
                  onMouseDown={(e) => startResize(e, box, 's')}
                  onTouchStart={(e) => startResize(e, box, 's')}
                />
                <div
                  className="resize-handle handle-sw"
                  onMouseDown={(e) => startResize(e, box, 'sw')}
                  onTouchStart={(e) => startResize(e, box, 'sw')}
                />
                <div
                  className="resize-handle handle-w"
                  onMouseDown={(e) => startResize(e, box, 'w')}
                  onTouchStart={(e) => startResize(e, box, 'w')}
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
