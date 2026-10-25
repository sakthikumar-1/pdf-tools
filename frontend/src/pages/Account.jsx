import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUser, 
  faShieldHalved, 
  faGear, 
  faClockRotateLeft, 
  faArrowRight, 
  faMoon, 
  faSun, 
  faCheck,
  faTriangleExclamation,
  faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import './Account.css';

export default function Account() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [saveMetadata, setSaveMetadata] = useState(true);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  };

  return (
    <div className="account-page-container container">
      {/* Top Breadcrumb */}
      <nav className="tool-breadcrumb" aria-label="Breadcrumb">
        <Link to="/" className="breadcrumb-link">
          Home
        </Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Account &amp; Preferences</span>
      </nav>

      <div className="account-hero">
        <div className="account-avatar-badge">
          <FontAwesomeIcon icon={faUser} />
        </div>
        <h1 className="account-title">Account &amp; Workspace Settings</h1>
        <p className="account-subtitle">
          Manage your session preferences, privacy configurations, and client processing parameters.
        </p>
      </div>

      <div className="account-grid">
        {/* Profile / Session Card */}
        <div className="account-card">
          <div className="account-card-header">
            <FontAwesomeIcon icon={faUser} className="card-header-icon" />
            <h3>Session Status</h3>
          </div>
          <div className="account-card-body">
            <div className="session-status-row">
              <span className="status-indicator-dot guest"></span>
              <div>
                <strong>Anonymous Guest Access</strong>
                <p>You have full access to all 18 standard client &amp; server PDF utilities.</p>
              </div>
            </div>
            <div className="session-action-box">
              <p>Sign in with your Google account to record metadata-only conversion logs.</p>
              <Link to="/login" className="btn btn-primary btn-sm">
                <span>Sign in with Google</span>
                <FontAwesomeIcon icon={faArrowRight} />
              </Link>
            </div>
          </div>
        </div>

        {/* Security & Privacy Card */}
        <div className="account-card">
          <div className="account-card-header">
            <FontAwesomeIcon icon={faShieldHalved} className="card-header-icon" />
            <h3>Privacy &amp; Data Security</h3>
          </div>
          <div className="account-card-body">
            <ul className="security-features-list">
              <li>
                <FontAwesomeIcon icon={faCheck} className="check-icon" />
                <span>Zero Document Retention: Documents processed strictly in RAM</span>
              </li>
              <li>
                <FontAwesomeIcon icon={faCheck} className="check-icon" />
                <span>Client Sandbox: 10 tools execute directly in your browser</span>
              </li>
              <li>
                <FontAwesomeIcon icon={faCheck} className="check-icon" />
                <span>Google Gemini AI: Encrypted payload transport via TLS 1.3</span>
              </li>
            </ul>

            <div className="privacy-toggle-row">
              <div>
                <strong>Conversion History Logging</strong>
                <p>Record file name and timestamps in your local browser storage</p>
              </div>
              <button 
                type="button" 
                className={`switch-toggle-btn ${saveMetadata ? 'active' : ''}`}
                onClick={() => setSaveMetadata(!saveMetadata)}
                aria-label="Toggle history metadata logging"
              >
                <span className="switch-thumb"></span>
              </button>
            </div>
          </div>
        </div>

        {/* Workspace Display Preferences */}
        <div className="account-card">
          <div className="account-card-header">
            <FontAwesomeIcon icon={faGear} className="card-header-icon" />
            <h3>Appearance &amp; Theme</h3>
          </div>
          <div className="account-card-body">
            <div className="theme-preference-row">
              <div>
                <strong>Current Visual Theme</strong>
                <p>{theme === 'dark' ? 'Midnight Black with Champagne Gold' : 'Warm Ivory with Champagne Gold'}</p>
              </div>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={toggleTheme}
              >
                <FontAwesomeIcon icon={theme === 'dark' ? faSun : faMoon} />
                <span>Switch to {theme === 'dark' ? 'Light' : 'Dark'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Processing History Shortcut */}
        <div className="account-card">
          <div className="account-card-header">
            <FontAwesomeIcon icon={faClockRotateLeft} className="card-header-icon" />
            <h3>Processing Records</h3>
          </div>
          <div className="account-card-body">
            <p className="card-body-text">
              Review your recent document processing operations, execution engines, and output metadata.
            </p>
            <Link to="/history" className="btn btn-secondary btn-sm view-history-btn">
              <span>View Processing History</span>
              <FontAwesomeIcon icon={faArrowRight} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
