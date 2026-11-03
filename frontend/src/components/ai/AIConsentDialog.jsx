import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShieldHalved,
  faCircleCheck,
  faXmark,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';
import { recordAIConsent } from '../../services/api';
import './AIConsentDialog.css';

export const AI_CONSENT_STORAGE_KEY = 'simatrix_ai_consent_accepted';
export const AI_CONSENT_VERSION_KEY = 'simatrix_ai_consent_policy_version';
export const CURRENT_CONSENT_POLICY_VERSION = '2026.1';

/**
 * Validates whether the active authenticated user has recorded consent.
 * Checks quota backend status first, then cached versioned consent.
 */
export function hasUserGivenAIConsent(quota = null) {
  if (quota && typeof quota.consent_given === 'boolean') {
    return quota.consent_given && quota.consent_policy_version === CURRENT_CONSENT_POLICY_VERSION;
  }
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
  const [agreed, setAgreed] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!agreed) {
      setError('Please agree to the processing terms to proceed.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Record consent on the backend for this authenticated user
      await recordAIConsent(true, CURRENT_CONSENT_POLICY_VERSION);
      setUserAIConsent(true);
      if (onConfirm) {
        onConfirm();
      }
    } catch (err) {
      console.warn('Backend consent sync warning:', err);
      // Still set local flag and proceed if backend returned error or if network was slow
      setUserAIConsent(true);
      if (onConfirm) {
        onConfirm();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
  };

  return (
    <div className="ai-consent-overlay" role="dialog" aria-modal="true" aria-labelledby="ai-consent-title" onClick={handleCancel}>
      <div className="ai-consent-card" onClick={(e) => e.stopPropagation()}>
        <div className="ai-consent-header">
          <div className="ai-consent-icon-box">
            <FontAwesomeIcon icon={faShieldHalved} />
          </div>
          <div className="ai-consent-header-text">
            <h3 id="ai-consent-title" className="ai-consent-title">Simatrix AI Processing Notice</h3>
            <span className="ai-consent-subtitle">Privacy & Document Protection</span>
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
            Simatrix AI processes document content to complete your requested operations. We use secure cloud infrastructure with data segregation and zero public foundation model training.
          </p>

          <div className="ai-consent-points">
            <div className="ai-consent-point">
              <FontAwesomeIcon icon={faCircleCheck} className="ai-point-bullet" />
              <span><strong>TLS Encryption:</strong> Transmitted securely exclusively to execute your requested AI request.</span>
            </div>
            <div className="ai-consent-point">
              <FontAwesomeIcon icon={faCircleCheck} className="ai-point-bullet" />
              <span><strong>Zero Model Training:</strong> Your files and queries are never used to train public foundation models.</span>
            </div>
            <div className="ai-consent-point">
              <FontAwesomeIcon icon={faCircleCheck} className="ai-point-bullet" />
              <span><strong>Automatic Expiration:</strong> Chat sessions and chunk caches are permanently purged after 24 hours.</span>
            </div>
          </div>

          <p className="ai-consent-learn-more">
            Learn more in our{' '}
            <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="ai-consent-link">
              Privacy & Document Processing Policy
            </Link>.
          </p>

          <label className="ai-consent-checkbox-row">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => {
                setAgreed(e.target.checked);
                if (e.target.checked) setError(null);
              }}
            />
            <span>I agree to the Simatrix AI processing and data privacy terms.</span>
          </label>

          {error && (
            <div className="ai-consent-error" role="alert">
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="ai-consent-footer">
          {showCancel && (
            <button
              type="button"
              className="ai-btn-secondary"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            className="ai-btn-primary"
            onClick={handleConfirm}
            disabled={isSubmitting || !agreed}
          >
            {isSubmitting ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin />
                <span>Recording...</span>
              </>
            ) : (
              'Agree & Continue'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
