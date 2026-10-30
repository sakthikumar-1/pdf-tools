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
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  error,
  acceptedTypes = '.pdf',
  maxSizeText = '50MB',
  title = 'Drop your PDF file here',
  subtitle = 'or click to browse',
  buttonText = 'Choose PDF File',
  multiple = false,
}) {
  const fileInputRef = useRef(null);

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      if (multiple) {
        onFileSelect(filesArray);
      } else {
        onFileSelect(filesArray[0]);
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
        onFileSelect([sampleFile]);
      } else {
        onFileSelect(sampleFile);
      }
    } catch (err) {
      console.warn('[UploadBox] Could not load sample document:', err);
    }
  };

  return (
    <div className="upload-box-wrapper">
      <div
        className={`upload-box ${isDragging ? 'dragging' : ''} ${error ? 'has-error' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, multiple)}
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
          accept={acceptedTypes}
          multiple={multiple}
          onChange={handleInputChange}
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
          {buttonText}
        </button>

        <div className="upload-meta-row">
          <span className="upload-limit-text">Max file size: {maxSizeText}</span>
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
