import React, { useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileLines,
  faXmark,
  faCheck,
  faArrowsRotate,
  faPlus,
  faCircleInfo
} from '@fortawesome/free-solid-svg-icons';
import { formatFileSize } from '../utils/formatFileSize';
import './FileUploader.css';

export default function FileUploader({
  file,
  files = [],
  onRemove,
  onRemoveIndex,
  onAddMore,
  onProcess,
  isProcessing,
  isProcessDisabled = false,
  actionText = 'Convert File Now',
  acceptedTypes = '.pdf'
}) {
  const addMoreInputRef = useRef(null);
  const fileList = files && files.length > 0 ? files : (file ? [file] : []);

  if (fileList.length === 0) return null;

  const handleAddMoreChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      if (onAddMore) {
        onAddMore(Array.from(e.target.files));
      }
    }
  };

  return (
    <div className="file-uploader-selected">
      <div className="file-list-container">
        {fileList.map((f, idx) => (
          <div className="selected-file-card" key={idx}>
            <div className="file-icon-box">
              <FontAwesomeIcon icon={faFileLines} className="pdf-doc-icon" />
              <span className="file-ext-badge">
                {fileList.length > 1 ? `#${idx + 1}` : (f.name ? f.name.split('.').pop().toUpperCase() : 'PDF')}
              </span>
            </div>

            <div className="selected-file-details">
              <h4 className="selected-filename" title={f.name}>{f.name}</h4>
              <div className="selected-file-meta">
                <span className="file-size-tag">{formatFileSize(f.size)}</span>
                <span className="file-meta-dot">&bull;</span>
                <span className="file-status-tag">
                  <FontAwesomeIcon icon={faCheck} className="check-fa-icon" />
                  <span>Ready to process</span>
                </span>
              </div>
            </div>

            <button
              type="button"
              className="remove-file-btn"
              onClick={() => {
                if (fileList.length > 1 && onRemoveIndex) {
                  onRemoveIndex(idx);
                } else if (onRemove) {
                  onRemove();
                }
              }}
              disabled={isProcessing}
              aria-label="Remove file"
              title="Remove file"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        ))}
      </div>

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
