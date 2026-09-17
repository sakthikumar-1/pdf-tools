import React, { useRef } from 'react';
import { Upload, FileText, AlertCircle, Shield } from 'lucide-react';
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
  subtitle = 'or drop PDF here',
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
          <Upload size={26} className="upload-icon" />
        </div>

        <div className="upload-box-content">
          <h3 className="upload-main-title">{title}</h3>
          <p className="upload-subtitle">{subtitle}</p>

          <button type="button" className="btn btn-primary upload-btn" onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}>
            <FileText size={18} /> {multiple ? 'Choose PDF Files' : 'Choose PDF File'}
          </button>

          <div className="upload-info-row">
            <span>Max file size: <strong>{maxSizeText}</strong></span>
            <span className="info-dot">•</span>
            <span className="secure-tag"><Shield size={13} /> Encrypted & Private</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="upload-error-alert" role="alert">
          <AlertCircle size={18} className="error-icon" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

