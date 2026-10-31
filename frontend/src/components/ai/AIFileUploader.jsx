import React, { useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCloudArrowUp,
  faFilePdf,
  faTrashCan,
  faArrowRotateRight,
  faCircleExclamation,
  faBookOpen
} from '@fortawesome/free-solid-svg-icons';
import { formatBytes } from '../../utils/fileUtils';
import AISampleDocumentButton from './AISampleDocumentButton';
import './AIFileUploader.css';

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

export default function AIFileUploader({
  file,
  onSelectFile,
  onClear,
  pageCount,
  isProcessing = false,
  error: externalError,
  title = 'Select or drop your PDF document here',
  subtitle = 'Supports PDF documents up to 15MB',
  showSampleButton = true
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [internalError, setInternalError] = useState(null);
  const fileInputRef = useRef(null);

  const error = externalError || internalError;

  const validateAndSelect = (candidateFile) => {
    setInternalError(null);
    if (!candidateFile) return;

    if (!candidateFile.name.toLowerCase().endsWith('.pdf') && candidateFile.type !== 'application/pdf') {
      setInternalError('Invalid file type: Please select a valid PDF document (.pdf).');
      return;
    }

    if (candidateFile.size > MAX_FILE_SIZE_BYTES) {
      setInternalError(
        `File exceeds maximum limit: ${formatBytes(candidateFile.size)} selected, but AI operations support up to 15MB.`
      );
      return;
    }

    if (candidateFile.size === 0) {
      setInternalError('The selected file is empty (0 bytes). Please select a valid PDF.');
      return;
    }

    if (onSelectFile) {
      onSelectFile(candidateFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isProcessing) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isProcessing) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSelect(e.target.files[0]);
    }
  };

  const handleBoxClick = () => {
    if (!isProcessing && fileInputRef.current) {
      fileInputRef.current.value = null;
      fileInputRef.current.click();
    }
  };

  return (
    <div className="ai-file-uploader-container">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        disabled={isProcessing}
      />

      {!file ? (
        <div
          className={`ai-upload-dropzone ${isDragging ? 'dragging' : ''} ${error ? 'has-error' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleBoxClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleBoxClick();
            }
          }}
        >
          <div className="ai-dropzone-icon">
            <FontAwesomeIcon icon={faCloudArrowUp} />
          </div>

          <div className="ai-dropzone-content">
            <h4 className="ai-dropzone-title">{title}</h4>
            <p className="ai-dropzone-sub">{subtitle}</p>
          </div>

          <div className="ai-dropzone-actions" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="ai-btn-browse"
              onClick={handleBoxClick}
              disabled={isProcessing}
            >
              Choose PDF File
            </button>

            {showSampleButton && (
              <AISampleDocumentButton
                onSelectFile={validateAndSelect}
                disabled={isProcessing}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="ai-file-selected-card">
          <div className="ai-file-info-left">
            <div className="ai-file-pdf-icon">
              <FontAwesomeIcon icon={faFilePdf} />
            </div>
            <div className="ai-file-details">
              <span className="ai-file-name" title={file.name}>
                {file.name}
              </span>
              <div className="ai-file-meta-tags">
                <span className="ai-file-meta-chip">{formatBytes(file.size)}</span>
                {pageCount !== null && pageCount !== undefined && (
                  <span className="ai-file-meta-chip page-chip">
                    <FontAwesomeIcon icon={faBookOpen} />
                    {pageCount} page{pageCount === 1 ? '' : 's'}
                  </span>
                )}
                <span className="ai-file-meta-chip verified-chip">Ready for AI</span>
              </div>
            </div>
          </div>

          <div className="ai-file-actions">
            <button
              type="button"
              className="ai-file-btn-change"
              onClick={handleBoxClick}
              disabled={isProcessing}
              title="Replace document"
            >
              <FontAwesomeIcon icon={faArrowRotateRight} />
              <span>Change</span>
            </button>
            {onClear && (
              <button
                type="button"
                className="ai-file-btn-remove"
                onClick={onClear}
                disabled={isProcessing}
                title="Remove document"
              >
                <FontAwesomeIcon icon={faTrashCan} />
              </button>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="ai-uploader-error">
          <FontAwesomeIcon icon={faCircleExclamation} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

