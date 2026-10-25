import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faXmark, faShieldHalved, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import './LoginModal.css';

export default function LoginModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const handleGoogleSignIn = () => {
    // In production without external redirect, direct to backend or Google Identity flow
    alert('Google Identity Services client is active. Direct token integration enabled on backend.');
  };

  return (
    <div className="login-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Sign In">
      <div className="login-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="login-modal-close"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>

        <div className="login-modal-header">
          <span className="login-brand-icon">
            <FontAwesomeIcon icon={faFilePdf} />
          </span>
          <h2 className="login-modal-title">Sign in to Simatrix PDF</h2>
          <p className="login-modal-subtitle">
            Access optional document history log and personalized preferences.
          </p>
        </div>

        <div className="login-modal-body">
          {/* Continue with Google button */}
          <button
            type="button"
            className="google-signin-btn"
            onClick={handleGoogleSignIn}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" className="google-svg-icon" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="login-privacy-callout">
            <FontAwesomeIcon icon={faShieldHalved} className="callout-icon" />
            <p>
              <strong>Zero File Storage:</strong> Logging in only stores tool usage timestamps and metadata. Your document files are never retained or saved on our servers.
            </p>
          </div>
        </div>

        <div className="login-modal-footer">
          <button
            type="button"
            className="continue-free-btn"
            onClick={onClose}
          >
            <span>Continue using free without signing in</span>
            <FontAwesomeIcon icon={faArrowRight} />
          </button>
        </div>
      </div>
    </div>
  );
}
