import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShieldHalved, faCircleExclamation } from '@fortawesome/free-solid-svg-icons';
import './AIConsentDisclosure.css';

export default function AIConsentDisclosure({
  compact = false,
  consented = false,
  onConsentChange,
  error = false,
  disabled = false
}) {
  const handleChange = (e) => {
    if (disabled) return;
    if (onConsentChange) {
      onConsentChange(e.target.checked);
    }
  };

  return (
    <div
      className={`ai-consent-disclosure ${compact ? 'compact' : ''} ${error ? 'has-error' : ''}`}
      role="region"
      aria-label="Simatrix AI Processing Agreement"
    >
      <div className="ai-consent-disclosure-icon" aria-hidden="true">
        <FontAwesomeIcon icon={faShieldHalved} />
      </div>
      <div className="ai-consent-disclosure-content">
        <span className="ai-consent-disclosure-title">Simatrix AI Processing</span>
        <p className="ai-consent-disclosure-text">
          Your document content is processed to complete your requested AI operation.{' '}
          <Link to="/privacy" className="ai-consent-disclosure-link">
            Learn more
          </Link>
        </p>

        <label className={`ai-consent-checkbox-row ${error ? 'checkbox-error' : ''} ${disabled ? 'disabled' : ''}`}>
          <input
            type="checkbox"
            className="ai-consent-checkbox"
            checked={Boolean(consented)}
            onChange={handleChange}
            disabled={disabled}
            aria-required="true"
            aria-invalid={Boolean(error)}
          />
          <span className="ai-consent-checkbox-text">
            I agree to the Simatrix AI processing and privacy terms
          </span>
        </label>

        {error && (
          <div className="ai-consent-error-message" role="alert">
            <FontAwesomeIcon icon={faCircleExclamation} />
            <span>Please accept the AI processing terms to proceed.</span>
          </div>
        )}
      </div>
    </div>
  );
}
