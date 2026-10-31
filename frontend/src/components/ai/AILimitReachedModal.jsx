import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBan,
  faXmark
} from '@fortawesome/free-solid-svg-icons';
import './AILimitReachedModal.css';

export default function AILimitReachedModal({
  isOpen,
  onClose
}) {
  if (!isOpen) return null;

  return (
    <div className="ai-limit-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="ai-limit-modal-title">
      <div className="ai-limit-modal-card">
        <div className="ai-limit-modal-header">
          <div className="ai-limit-modal-icon">
            <FontAwesomeIcon icon={faBan} />
          </div>
          <div className="ai-limit-modal-title-box">
            <h3 id="ai-limit-modal-title" className="ai-limit-modal-title">
              AI Quota Limit Reached
            </h3>
            <span className="ai-limit-modal-subtitle">5 of 5 Free AI Operations Consumed</span>
          </div>
          <button
            type="button"
            className="ai-limit-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className="ai-limit-modal-body">
          <p className="ai-limit-modal-intro">
            You have used all <strong>5 free high-fidelity requests</strong> allocated to your account.
          </p>

          <div className="ai-limit-modal-options">
            <div className="ai-limit-option-card standard-tools">
              <div className="ai-limit-option-badge standard">Included</div>
              <h4 className="ai-limit-option-title">19 Core PDF Utilities</h4>
              <p className="ai-limit-option-desc">
                All 19 standard PDF utilities (Word to PDF, Merge, Split, Protect, Crop, Sign, Rotate, etc.) remain 100% free and unlimited.
              </p>
            </div>
          </div>
        </div>

        <div className="ai-limit-modal-footer">
          <button type="button" className="ai-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
