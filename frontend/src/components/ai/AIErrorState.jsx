import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleExclamation,
  faTriangleExclamation,
  faWifi,
  faLock,
  faImage,
  faBan,
  faRotateRight,
  faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import './AIErrorState.css';

export default function AIErrorState({
  error,
  onRetry,
  onReset
}) {
  if (!error) return null;

  const rawMessage = typeof error === 'string' ? error : (error.message || 'An error occurred during AI processing.');
  const lowerMsg = rawMessage.toLowerCase();
  const errorCode = error.code || '';

  let icon = faCircleExclamation;
  let title = 'Document Analysis Error';
  let isQuotaExceeded = false;
  let isOffline = false;
  let isEncrypted = false;
  let isScanned = false;

  if (errorCode === 'AI_LIMIT_REACHED' || lowerMsg.includes('quota') || lowerMsg.includes('limit reached')) {
    icon = faBan;
    title = 'AI Quota Limit Reached';
    isQuotaExceeded = true;
  } else if (lowerMsg.includes('offline') || lowerMsg.includes('network') || lowerMsg.includes('failed to fetch')) {
    icon = faWifi;
    title = 'Internet Connection Required';
    isOffline = true;
  } else if (lowerMsg.includes('password') || lowerMsg.includes('encrypted')) {
    icon = faLock;
    title = 'Password Protected Document';
    isEncrypted = true;
  } else if (errorCode === 'SCANNED_PDF' || lowerMsg.includes('scanned') || lowerMsg.includes('image-only') || lowerMsg.includes('image-based') || lowerMsg.includes('no selectable text')) {
    icon = faImage;
    title = 'Scanned PDF Detected';
    isScanned = true;
  }

  const displayMessage = isScanned
    ? 'This PDF contains image-based pages. Text extraction is not available for this document yet. Please try a digitally generated PDF.'
    : rawMessage;

  return (
    <div className={`ai-error-state ${isQuotaExceeded ? 'quota-error' : ''}`}>
      <div className="ai-error-icon-box">
        <FontAwesomeIcon icon={icon} />
      </div>

      <div className="ai-error-content">
        <h4 className="ai-error-title">{title}</h4>
        <p className="ai-error-message">{displayMessage}</p>

        <div className="ai-error-actions">
          {onRetry && !isQuotaExceeded && (
            <button type="button" className="ai-btn-retry" onClick={onRetry}>
              <FontAwesomeIcon icon={faRotateRight} />
              <span>Try Again</span>
            </button>
          )}

          {onReset && (
            <button type="button" className="ai-btn-reset-error" onClick={onReset}>
              <FontAwesomeIcon icon={faArrowLeft} />
              <span>Choose Another PDF</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
