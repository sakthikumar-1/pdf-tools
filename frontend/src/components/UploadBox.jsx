import React, { useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCloudArrowUp,
  faFileLines,
  faTriangleExclamation
} from '@fortawesome/free-solid-svg-icons';
import './UploadBox.css';

export default function UploadBox({
  onFileSelect,
  onFileSelected,
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  error,
  acceptedTypes = '.pdf',
  accept,
  maxSizeText = '50MB',
  fileLimitInfo,
  title = 'Drop your PDF file here',
  subtitle = 'or click to browse',
  buttonText = 'Choose PDF File',
  buttonLabel,
  multiple = false,
}) {
  const fileInputRef = useRef(null);

  const effectiveAccept = accept || acceptedTypes || '.pdf';
  const effectiveButtonText = buttonText || buttonLabel || 'Choose PDF File';
  const effectiveLimitText = maxSizeText || fileLimitInfo || '50MB';

  const triggerFileCallback = (files) => {
    if (typeof onFileSelect === 'function') {
      onFileSelect(files);
    } else if (typeof onFileSelected === 'function') {
      onFileSelected(files);
    }
  };

  const handleClick = (e) => {
    if (e && e.target && e.target.tagName === 'INPUT') return;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      if (multiple) {
        triggerFileCallback(filesArray);
      } else {
        triggerFileCallback(filesArray[0]);
      }
    }
  };

  const handleLoadSample = async (e) => {
    e.stopPropagation();
    try {
      const res = await fetch('/sample_document.pdf');
      if (!res.ok) throw new Error('Sample file request failed');
      const blob = await res.blob();
      const sampleFile = new File([blob], 'sample_document.pdf', { type: 'application/pdf' });
      if (multiple) {
        triggerFileCallback([sampleFile]);
      } else {
        triggerFileCallback(sampleFile);
      }
    } catch (err) {
      console.warn('[UploadBox] Could not load sample document:', err);
    }
  };

  return (
    <div className="upload-box-wrapper">
      <div
        className={`upload-box ${isDragging ? 'dragging' : ''} ${error ? 'has-error' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (onDragOver) onDragOver(e);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (onDragLeave) onDragLeave(e);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (onDrop) onDrop(e, multiple);
        }}
        onClick={handleClick}
        tabIndex={0}
        role="button"
        aria-label="Upload files"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={effectiveAccept}
          multiple={multiple}
          onChange={handleInputChange}
          onClick={(e) => e.stopPropagation()}
          className="file-input-hidden"
        />

        <div className="upload-icon-circle">
          <FontAwesomeIcon icon={faCloudArrowUp} className="upload-icon-fa" />
        </div>

        <div className="upload-box-content">
          <h3 className="upload-main-title">{title}</h3>
          <p className="upload-subtitle">{subtitle}</p>
        </div>

        <button 
          type="button" 
          className="upload-choose-btn"
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
        >
          {effectiveButtonText}
        </button>

        <div className="upload-meta-row">
          <span className="upload-limit-text">Max file size: {effectiveLimitText}</span>
          {acceptedTypes.includes('.pdf') && (
            <>
              <span className="upload-meta-dot">&bull;</span>
              <button
                type="button"
                className="upload-sample-link"
                onClick={handleLoadSample}
                title="Load sample document to test this tool"
              >
                <FontAwesomeIcon icon={faFileLines} />
                <span>Try with sample PDF</span>
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="upload-error-alert" role="alert">
          <FontAwesomeIcon icon={faTriangleExclamation} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
