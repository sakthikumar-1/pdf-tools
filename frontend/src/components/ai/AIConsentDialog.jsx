import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShieldHalved,
  faCircleCheck,
  faXmark,
  faExternalLinkAlt,
  faClock,
  faServer
} from '@fortawesome/free-solid-svg-icons';
import './AIConsentDialog.css';

export const AI_CONSENT_STORAGE_KEY = 'simatrix_ai_consent_accepted';

export function hasUserGivenAIConsent() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(AI_CONSENT_STORAGE_KEY) === 'true';
}

export function setUserAIConsent(val = true) {
  if (typeof window === 'undefined') return;
  if (val) {
    localStorage.setItem(AI_CONSENT_STORAGE_KEY, 'true');
  } else {
    localStorage.removeItem(AI_CONSENT_STORAGE_KEY);
  }
}

export default function AIConsentDialog({
  isOpen,
  onConfirm,
  onCancel,
  showCancel = true
}) {
  const [rememberPreference, setRememberPreference] = useState(true);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (rememberPreference) {
      setUserAIConsent(true);
    }
    if (onConfirm) onConfirm();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
  };

  return (
    <div className="ai-consent-overlay" role="dialog" aria-modal="true" aria-labelledby="ai-consent-title">
      <div className="ai-consent-card">
        <div className="ai-consent-header">
          <div className="ai-consent-icon-box">
            <FontAwesomeIcon icon={faShieldHalved} />
          </div>
          <div className="ai-consent-header-text">
            <h3 id="ai-consent-title" className="ai-consent-title">External AI Processing Notice</h3>
            <span className="ai-consent-subtitle">Privacy & Data Governance Disclosure</span>
          </div>
          {showCancel && (
            <button
              type="button"
              className="ai-consent-close"
              onClick={handleCancel}
              aria-label="Close dialog"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          )}
        </div>

        <div className="ai-consent-body">
          <p className="ai-consent-intro">
            Simatrix PDF uses modern artificial intelligence engines (<strong>DeepSeek API</strong> and <strong>Google Gemini API</strong>) to process document requests, extract structured summaries, and power grounded document search.
          </p>

          <div className="ai-consent-points">
            <div className="ai-consent-point">
              <div className="ai-point-icon">
                <FontAwesomeIcon icon={faServer} />
              </div>
              <div className="ai-point-text">
                <strong>Ephemeral Processing:</strong> Extracted document text is transmitted securely over TLS to external AI providers exclusively to execute your prompt.
              </div>
            </div>

            <div className="ai-consent-point">
              <div className="ai-point-icon">
                <FontAwesomeIcon icon={faClock} />
              </div>
              <div className="ai-point-text">
                <strong>24-Hour Expiration:</strong> Chat sessions and chunk caches automatically expire and are purged from database storage within 24 hours.
              </div>
            </div>

            <div className="ai-consent-point">
              <div className="ai-point-icon">
                <FontAwesomeIcon icon={faCircleCheck} />
              </div>
              <div className="ai-point-text">
                <strong>No Public Model Training:</strong> Your uploaded documents are processed via enterprise API agreements and are not used for public model retraining.
              </div>
            </div>
          </div>

          <label className="ai-consent-checkbox-row">
            <input
              type="checkbox"
              checked={rememberPreference}
              onChange={(e) => setRememberPreference(e.target.checked)}
            />
            <span>Remember my consent for future AI document operations on this browser.</span>
          </label>
        </div>

        <div className="ai-consent-footer">
          {showCancel && (
            <button
              type="button"
              className="ai-btn-secondary"
              onClick={handleCancel}
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            className="ai-btn-primary"
            onClick={handleConfirm}
          >
            I Understand & Agree
          </button>
        </div>
      </div>
    </div>
  );
}

