import React, { useRef } from 'react';
import { FileText, X, CheckCircle, RefreshCw, Plus } from 'lucide-react';
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
      <div className="file-list-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
        {fileList.map((f, idx) => (
          <div className="selected-file-card" key={idx}>
            <div className="file-icon-box">
              <FileText size={32} className="pdf-doc-icon" />
              <span className="file-ext-badge">{fileList.length > 1 ? `#${idx + 1}` : 'PDF'}</span>
            </div>

            <div className="selected-file-details">
              <h4 className="selected-filename" title={f.name}>{f.name}</h4>
              <div className="selected-file-meta">
                <span className="file-size-tag">{formatFileSize(f.size)}</span>
                <span className="file-meta-dot">•</span>
                <span className="file-status-tag"><CheckCircle size={13} /> Ready to process</span>
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
              <X size={20} />
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
            <Plus size={16} /> Add More Files
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onRemove}
            disabled={isProcessing}
          >
            <RefreshCw size={16} /> Choose Different File
          </button>
        )}

        <button
          type="button"
          className="btn btn-primary btn-lg process-action-btn"
          onClick={onProcess}
          disabled={isProcessing}
        >
          {fileList.length > 1 ? `Merge ${fileList.length} Files Now` : actionText}
        </button>
      </div>
    </div>
  );
}

