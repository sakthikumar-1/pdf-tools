import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShieldHalved,
  faCircleCheck,
  faXmark,
  faClock,
  faServer
} from '@fortawesome/free-solid-svg-icons';
import './AIConsentDialog.css';

export const AI_CONSENT_STORAGE_KEY = 'simatrix_ai_consent_accepted';
export const AI_CONSENT_VERSION_KEY = 'simatrix_ai_consent_policy_version';
export const CURRENT_CONSENT_POLICY_VERSION = '2026.1';

export function hasUserGivenAIConsent() {
  if (typeof window === 'undefined') return false;
  const isAccepted = localStorage.getItem(AI_CONSENT_STORAGE_KEY) === 'true';
  const storedVersion = localStorage.getItem(AI_CONSENT_VERSION_KEY);
  return isAccepted && storedVersion === CURRENT_CONSENT_POLICY_VERSION;
}

export function setUserAIConsent(val = true) {
  if (typeof window === 'undefined') return;
  if (val) {
    localStorage.setItem(AI_CONSENT_STORAGE_KEY, 'true');
    localStorage.setItem(AI_CONSENT_VERSION_KEY, CURRENT_CONSENT_POLICY_VERSION);
  } else {
    localStorage.removeItem(AI_CONSENT_STORAGE_KEY);
    localStorage.removeItem(AI_CONSENT_VERSION_KEY);
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
            <h3 id="ai-consent-title" className="ai-consent-title">Simatrix AI Processing Notice</h3>
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
            Simatrix AI uses secure enterprise processing infrastructure to analyze documents, extract structured summaries, and power grounded document search.
          </p>

          <div className="ai-consent-points">
            <div className="ai-consent-point">
              <div className="ai-point-icon">
                <FontAwesomeIcon icon={faServer} />
              </div>
              <div className="ai-point-text">
                <strong>Secure Processing:</strong> Extracted document text is transmitted securely over TLS exclusively to execute your requested AI operation.
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
                <strong>No Public Model Training:</strong> Your documents are processed under strict enterprise agreements and are not used to train public foundation models.{' '}
                <Link to="/privacy" target="_blank" rel="noopener noreferrer">
                  Learn more
                </Link>
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
