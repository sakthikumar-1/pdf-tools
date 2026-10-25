import React, { useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCloudArrowUp,
  faTriangleExclamation,
  faShieldHalved
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
  maxSizeText = '50 MB',
  title = 'Select PDF file',
  subtitle = 'or drag and drop your document here',
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

        <div className="upload-meta-strip">
          <span className="upload-limit">Max size {maxSizeText}</span>
          <span className="meta-sep">&bull;</span>
          <span className="upload-private">
            <FontAwesomeIcon icon={faShieldHalved} className="shield-mini-fa" />
            <span>Client &amp; Private Sandbox</span>
          </span>
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
