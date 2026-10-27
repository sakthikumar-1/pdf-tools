import React, { useRef, useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileLines,
  faXmark,
  faCheck,
  faArrowsRotate,
  faPlus,
  faCircleInfo,
  faArrowUp,
  faArrowDown,
  faUpDown,
  faGripVertical
} from '@fortawesome/free-solid-svg-icons';
import { formatFileSize } from '../utils/formatFileSize';
import { getPdfPageCount } from '../utils/pdfPageCounter';
import './FileUploader.css';

export default function FileUploader({
  file,
  files = [],
  onRemove,
  onRemoveIndex,
  onReorderFiles,
  onMoveFile,
  onAddMore,
  onProcess,
  isProcessing,
  isProcessDisabled = false,
  actionText = 'Convert File Now',
  acceptedTypes = '.pdf'
}) {
  const addMoreInputRef = useRef(null);
  const fileList = files && files.length > 0 ? files : (file ? [file] : []);

  const [pageCounts, setPageCounts] = useState({});
  const [selectedForMoveIdx, setSelectedForMoveIdx] = useState(null);
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  // Fetch page counts for PDF files dynamically
  useEffect(() => {
    let isCancelled = false;
    fileList.forEach(async (f, index) => {
      const key = `${f.name}-${f.size}-${index}`;
      if (!pageCounts[key] && f.name && f.name.toLowerCase().endsWith('.pdf')) {
        try {
          const count = await getPdfPageCount(f);
          if (!isCancelled && count !== null) {
            setPageCounts(prev => ({ ...prev, [key]: count }));
          }
        } catch {
          // Ignore page count resolution errors
        }
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [fileList]);

  if (fileList.length === 0) return null;

  const handleAddMoreChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      if (onAddMore) {
        onAddMore(Array.from(e.target.files));
      }
    }
  };

  const executeMove = (fromIndex, toIndex) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= fileList.length || toIndex >= fileList.length) {
      setSelectedForMoveIdx(null);
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }

    if (onMoveFile) {
      onMoveFile(fromIndex, toIndex);
    } else if (onReorderFiles) {
      const updated = [...fileList];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      onReorderFiles(updated);
    }

    setSelectedForMoveIdx(null);
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  // Drag and drop handlers
  const handleDragStart = (e, idx) => {
    if (fileList.length <= 1 || isProcessing) return;
    setDraggedIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  };

  const handleDragOverCard = (e, idx) => {
    if (draggedIdx === null || draggedIdx === idx) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIdx !== idx) {
      setDragOverIdx(idx);
    }
  };

  const handleDragLeaveCard = () => {
    setDragOverIdx(null);
  };

  const handleDropCard = (e, targetIdx) => {
    e.preventDefault();
    const sourceIdx = draggedIdx !== null ? draggedIdx : Number(e.dataTransfer.getData('text/plain'));
    if (!isNaN(sourceIdx) && sourceIdx !== targetIdx) {
      executeMove(sourceIdx, targetIdx);
    }
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  // Double-click selection handler
  const handleCardDoubleClick = (idx) => {
    if (fileList.length <= 1 || isProcessing) return;
    if (selectedForMoveIdx === idx) {
      setSelectedForMoveIdx(null);
    } else {
      setSelectedForMoveIdx(idx);
    }
  };

  const handleCardClick = (idx) => {
    if (selectedForMoveIdx !== null && selectedForMoveIdx !== idx) {
      executeMove(selectedForMoveIdx, idx);
    }
  };

  const isReorderable = fileList.length > 1 && (onReorderFiles || onMoveFile);

  return (
    <div className="file-uploader-selected">
      {/* Reorder Hint & Status Banner */}
      {isReorderable && (
        <div className="reorder-instructions-banner">
          <div className="reorder-hint-left">
            <FontAwesomeIcon icon={faUpDown} className="reorder-hint-icon" />
            <span>
              {selectedForMoveIdx !== null ? (
                <>
                  Moving <strong>{fileList[selectedForMoveIdx]?.name}</strong> (#{selectedForMoveIdx + 1}). Click another card to place it there.
                </>
              ) : (
                <>
                  <strong>Reorder files:</strong> Drag cards, use <strong>↑ / ↓</strong> buttons, or <strong>double-click</strong> a file to reposition it.
                </>
              )}
            </span>
          </div>
          {selectedForMoveIdx !== null && (
            <button
              type="button"
              className="btn btn-xs btn-secondary cancel-move-btn"
              onClick={() => setSelectedForMoveIdx(null)}
            >
              Cancel Move
            </button>
          )}
        </div>
      )}

      {/* File Cards List */}
      <div className="file-list-container">
        {fileList.map((f, idx) => {
          const key = `${f.name}-${f.size}-${idx}`;
          const pageCount = pageCounts[key];
          const isSelectedForMove = selectedForMoveIdx === idx;
          const isDragOver = dragOverIdx === idx;
          const isDraggingThis = draggedIdx === idx;

          return (
            <div
              className={`selected-file-card ${isReorderable ? 'is-reorderable' : ''} ${isSelectedForMove ? 'selected-for-move' : ''} ${isDragOver ? 'drag-over-target' : ''} ${isDraggingThis ? 'is-dragging' : ''}`}
              key={key}
              draggable={isReorderable && !isProcessing}
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOverCard(e, idx)}
              onDragLeave={handleDragLeaveCard}
              onDrop={(e) => handleDropCard(e, idx)}
              onDragEnd={handleDragEnd}
              onDoubleClick={() => handleCardDoubleClick(idx)}
              onClick={() => handleCardClick(idx)}
              title={
                isReorderable 
                  ? selectedForMoveIdx !== null 
                    ? selectedForMoveIdx === idx 
                      ? "Selected for move. Double-click to cancel."
                      : `Click to move #${selectedForMoveIdx + 1} here`
                    : "Double-click to select for repositioning, or drag to reorder"
                  : ""
              }
            >
              {/* Drag Handle (for multi-file mode) */}
              {isReorderable && (
                <div className="card-drag-handle" title="Drag to reorder file position">
                  <FontAwesomeIcon icon={faGripVertical} />
                </div>
              )}

              {/* File Icon & Position Badge */}
              <div className="file-icon-box">
                <FontAwesomeIcon icon={faFileLines} className="pdf-doc-icon" />
                <span className="file-ext-badge">
                  {fileList.length > 1 ? `#${idx + 1}` : (f.name ? f.name.split('.').pop().toUpperCase() : 'PDF')}
                </span>
              </div>

              {/* File Details */}
              <div className="selected-file-details">
                <div className="filename-row">
                  <h4 className="selected-filename" title={f.name}>{f.name}</h4>
                  {isSelectedForMove && (
                    <span className="move-selection-pill">Selected to Move</span>
                  )}
                </div>
                <div className="selected-file-meta">
                  <span className="file-size-tag">{formatFileSize(f.size)}</span>
                  {pageCount !== undefined && (
                    <>
                      <span className="file-meta-dot">&bull;</span>
                      <span className="file-pages-tag">{pageCount} {pageCount === 1 ? 'page' : 'pages'}</span>
                    </>
                  )}
                  <span className="file-meta-dot">&bull;</span>
                  <span className="file-status-tag">
                    <FontAwesomeIcon icon={faCheck} className="check-fa-icon" />
                    <span>Ready</span>
                  </span>
                </div>
              </div>

              {/* Accessible Reorder Controls (Move Up / Move Down) */}
              {isReorderable && (
                <div className="card-reorder-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="reorder-arrow-btn"
                    onClick={() => executeMove(idx, idx - 1)}
                    disabled={idx === 0 || isProcessing}
                    aria-label={`Move ${f.name} up`}
                    title="Move up"
                  >
                    <FontAwesomeIcon icon={faArrowUp} />
                  </button>
                  <button
                    type="button"
                    className="reorder-arrow-btn"
                    onClick={() => executeMove(idx, idx + 1)}
                    disabled={idx === fileList.length - 1 || isProcessing}
                    aria-label={`Move ${f.name} down`}
                    title="Move down"
                  >
                    <FontAwesomeIcon icon={faArrowDown} />
                  </button>
                </div>
              )}

              {/* Remove File Button */}
              <button
                type="button"
                className="remove-file-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  if (fileList.length > 1 && onRemoveIndex) {
                    onRemoveIndex(idx);
                  } else if (onRemove) {
                    onRemove();
                  }
                }}
                disabled={isProcessing}
                aria-label={`Remove ${f.name}`}
                title="Remove file"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Action Bar */}
      <div className="file-action-bar">
        <input
          ref={addMoreInputRef}
          type="file"
          accept={acceptedTypes}
          multiple
          onChange={handleAddMoreChange}
          style={{ display: 'none' }}
        />

        {onAddMore ? (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => addMoreInputRef.current?.click()}
            disabled={isProcessing}
          >
            <FontAwesomeIcon icon={faPlus} />
            <span>Add More Files</span>
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onRemove}
            disabled={isProcessing}
          >
            <FontAwesomeIcon icon={faArrowsRotate} />
            <span>Choose Different File</span>
          </button>
        )}

        <button
          type="button"
          className="btn btn-primary btn-lg process-action-btn"
          onClick={onProcess}
          disabled={isProcessing || isProcessDisabled}
          title={
            isProcessDisabled 
              ? (actionText.toLowerCase().includes('merge') && fileList.length < 2 
                  ? "Please add at least 2 PDF files to merge" 
                  : "Complete the required settings below to proceed") 
              : ""
          }
        >
          {fileList.length > 1 && actionText.toLowerCase().includes('merge')
            ? `Merge ${fileList.length} Files Now`
            : (fileList.length > 1 && actionText.toLowerCase().includes('convert')
                ? `Convert ${fileList.length} Files to PDF`
                : actionText)}
        </button>
      </div>

      {actionText.toLowerCase().includes('merge') && fileList.length < 2 && (
        <div className="merge-single-file-hint">
          <FontAwesomeIcon icon={faCircleInfo} />
          <span>Please add at least 1 more PDF file to merge. Click <strong>&ldquo;Add More Files&rdquo;</strong> above.</span>
        </div>
      )}
    </div>
  );
}
