import React from 'react';
import { Loader2 } from 'lucide-react';
import './ProgressBar.css';

export default function ProgressBar({
  progress = 0,
  statusText = 'Processing PDF file...',
  fileName = '',
  currentPage = 0,
  totalPages = 0,
}) {
  return (
    <div className="processing-card">
      <div className="processing-header">
        <div className="spinner-box">
          <Loader2 size={24} className="spin-icon" />
        </div>
        <div className="processing-title-meta">
          <h4 className="processing-status">{statusText}</h4>
          {fileName && <span className="processing-filename">{fileName}</span>}
        </div>
        <span className="processing-percentage">{Math.min(100, Math.max(0, progress))}%</span>
      </div>

      <div className="progress-bar-track">
        <div
          className="progress-bar-fill"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>

      {totalPages > 0 && (
        <div className="page-processing-counter">
          <span>Converting page <strong>{currentPage}</strong> of <strong>{totalPages}</strong></span>
        </div>
      )}
    </div>
  );
}
