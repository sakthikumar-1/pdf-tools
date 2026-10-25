import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faShieldHalved } from '@fortawesome/free-solid-svg-icons';
import './ProgressBar.css';

export default function ProgressBar({
  progress = 0,
  statusText = 'Processing document...',
  fileName = '',
  currentPage = 0,
  totalPages = 0,
  isIndeterminate = false,
}) {
  const displayProgress = Math.min(100, Math.max(0, Math.round(progress)));
  const hasPageCount = totalPages > 0;

  return (
    <div className="processing-card" role="status" aria-live="polite">
      <div className="processing-header">
        <div className="spinner-box">
          <FontAwesomeIcon icon={faSpinner} spin className="spin-icon-fa" />
        </div>
        <div className="processing-title-meta">
          <h4 className="processing-status">{statusText}</h4>
          {fileName && <span className="processing-filename">{fileName}</span>}
        </div>
        {!isIndeterminate && (
          <span className="processing-percentage">{displayProgress}%</span>
        )}
      </div>

      <div className="progress-bar-track">
        <div
          className={`progress-bar-fill ${isIndeterminate ? 'indeterminate' : ''}`}
          style={{ width: isIndeterminate ? '100%' : `${displayProgress}%` }}
        />
      </div>

      <div className="processing-footer-info">
        {hasPageCount ? (
          <div className="page-processing-counter">
            <span>Converting page <strong>{currentPage || 1}</strong> of <strong>{totalPages}</strong></span>
          </div>
        ) : (
          <div className="processing-guarantee-tag">
            <FontAwesomeIcon icon={faShieldHalved} className="info-icon" />
            <span>Encrypted in memory &bull; Zero file harvesting</span>
          </div>
        )}
      </div>
    </div>
  );
}
