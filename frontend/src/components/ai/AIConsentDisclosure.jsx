import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShieldHalved } from '@fortawesome/free-solid-svg-icons';
import './AIConsentDisclosure.css';

export default function AIConsentDisclosure({ compact = false }) {
  return (
    <div className={`ai-consent-disclosure ${compact ? 'compact' : ''}`} role="note" aria-label="Simatrix AI Processing Disclosure">
      <div className="ai-consent-disclosure-icon" aria-hidden="true">
        <FontAwesomeIcon icon={faShieldHalved} />
      </div>
      <div className="ai-consent-disclosure-content">
        <span className="ai-consent-disclosure-title">Simatrix AI Processing</span>
        <p className="ai-consent-disclosure-text">
          Your document content is processed to complete your requested AI operation. By continuing, you agree to our AI processing and privacy terms.{' '}
          <Link to="/privacy" className="ai-consent-disclosure-link">
            Learn more
          </Link>
        </p>
      </div>
    </div>
  );
}

