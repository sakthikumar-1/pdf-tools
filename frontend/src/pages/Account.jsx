import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUser, 
  faShieldHalved, 
  faGear, 
  faClockRotateLeft, 
  faChevronRight, 
  faMoon, 
  faSun, 
  faDesktop,
  faCircleCheck,
  faRightFromBracket,
  faArrowRightToBracket,
  faLanguage,
  faBell,
  faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './Account.css';

export default function Account() {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('account'); // 'account' or 'preferences'
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const navigate = useNavigate();

  const userInitial = user?.full_name ? user.full_name.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'S');
  const userDisplayName = user?.full_name || (user?.email ? user.email.split('@')[0] : 'Simatrix User');
  const userDisplayEmail = user?.email || (isAuthenticated ? 'user@example.com' : 'guest@simatrix.local');

  return (
    <div className="account-page-wrapper">
      <div className="account-container">
        {/* Top Back Link */}
        <Link to="/" className="tool-back-link" style={{ marginBottom: '0.85rem' }}>
          <FontAwesomeIcon icon={faArrowLeft} /> Back to Dashboard
        </Link>

        {/* Navigation Tabs */}
        <div className="account-tabs-nav">
          <button
            type="button"
            className={`account-tab-btn ${activeTab === 'account' ? 'active' : ''}`}
            onClick={() => setActiveTab('account')}
          >
            <FontAwesomeIcon icon={faUser} />
            <span>Account Settings</span>
          </button>
          <button
            type="button"
            className={`account-tab-btn ${activeTab === 'preferences' ? 'active' : ''}`}
            onClick={() => setActiveTab('preferences')}
          >
            <FontAwesomeIcon icon={faGear} />
            <span>Preferences</span>
          </button>
          <Link to="/history" className="account-tab-link">
            <FontAwesomeIcon icon={faClockRotateLeft} />
            <span>Recent Files</span>
          </Link>
        </div>

        {/* TAB 1: ACCOUNT SETTINGS */}
        {activeTab === 'account' && (
          <div className="account-tab-content">
            <div className="account-section-header">
              <h1 className="account-main-title">Account Settings</h1>
              <p className="account-main-desc">Manage your profile and preferences.</p>
            </div>

            {/* Profile Card matching Reference */}
            <div className="account-profile-card">
              <div className="profile-identity-row">
                <div className="profile-avatar-large">
                  {userInitial}
                </div>
                <div className="profile-text-group">
                  <h2 className="profile-name">{userDisplayName}</h2>
                  <p className="profile-email">{userDisplayEmail}</p>
                  <div className="profile-verified-badge">
                    <FontAwesomeIcon icon={faCircleCheck} className="verified-check-icon" />
                    <span>{isAuthenticated ? 'Verified with Google' : 'Anonymous Guest Session'}</span>
                  </div>
                </div>
              </div>

              {/* Action List Menu */}
              <div className="profile-menu-list">
                <div className="profile-menu-item">
                  <div className="menu-item-left">
                    <FontAwesomeIcon icon={faUser} className="menu-fa-icon" />
                    <div>
                      <span className="menu-title">Account Information</span>
                      <span className="menu-sub">Role: {user?.role || (isAuthenticated ? 'Verified User' : 'Guest')}</span>
                    </div>
                  </div>
                  <FontAwesomeIcon icon={faChevronRight} className="menu-arrow" />
                </div>

                <div 
                  className="profile-menu-item clickable"
                  onClick={() => navigate('/history')}
                >
                  <div className="menu-item-left">
                    <FontAwesomeIcon icon={faClockRotateLeft} className="menu-fa-icon" />
                    <div>
                      <span className="menu-title">Processing History</span>
                      <span className="menu-sub">Review recently processed document metadata</span>
                    </div>
                  </div>
                  <FontAwesomeIcon icon={faChevronRight} className="menu-arrow" />
                </div>

                <div 
                  className="profile-menu-item clickable"
                  onClick={() => setActiveTab('preferences')}
                >
                  <div className="menu-item-left">
                    <FontAwesomeIcon icon={faGear} className="menu-fa-icon" />
                    <div>
                      <span className="menu-title">Preferences</span>
                      <span className="menu-sub">Theme, language, and system settings</span>
                    </div>
                  </div>
                  <FontAwesomeIcon icon={faChevronRight} className="menu-arrow" />
                </div>

                {isAuthenticated ? (
                  <button
                    type="button"
                    className="profile-signout-btn"
                    onClick={logout}
                  >
                    <FontAwesomeIcon icon={faRightFromBracket} />
                    <span>Sign Out</span>
                  </button>
                ) : (
                  <Link to="/login" className="profile-signin-btn">
                    <FontAwesomeIcon icon={faArrowRightToBracket} />
                    <span>Sign in with Google</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PREFERENCES */}
        {activeTab === 'preferences' && (
          <div className="account-tab-content">
            <div className="account-section-header">
              <h1 className="account-main-title">Preferences</h1>
              <p className="account-main-desc">Customize your experience.</p>
            </div>

            <div className="preferences-card">
              {/* Theme Preference */}
              <div className="pref-row">
                <div className="pref-info">
                  <label className="pref-label">Theme</label>
                  <p className="pref-desc">Select how Simatrix looks on your device.</p>
                </div>

                <div className="theme-toggle-group">
                  <button
                    type="button"
                    className={`theme-segment-btn ${theme === 'light' ? 'active' : ''}`}
                    onClick={() => { if (theme !== 'light') toggleTheme(); }}
                  >
                    <FontAwesomeIcon icon={faSun} />
                    <span>Light</span>
                  </button>
                  <button
                    type="button"
                    className={`theme-segment-btn ${theme === 'dark' ? 'active' : ''}`}
                    onClick={() => { if (theme !== 'dark') toggleTheme(); }}
                  >
                    <FontAwesomeIcon icon={faMoon} />
                    <span>Dark</span>
                  </button>
                </div>
              </div>

              <div className="pref-divider" />

              {/* Language Selection */}
              <div className="pref-row">
                <div className="pref-info">
                  <label className="pref-label">Language</label>
                  <p className="pref-desc">Interface language for tools and menus.</p>
                </div>

                <div className="pref-control-box">
                  <select
                    className="pref-select"
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                  >
                    <option value="en">English (US)</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                  </select>
                </div>
              </div>

              <div className="pref-divider" />

              {/* Notification Preference */}
              <div className="pref-row">
                <div className="pref-info">
                  <label className="pref-label">Enable notifications</label>
                  <p className="pref-desc">Get notified when processing is complete.</p>
                </div>

                <div className="pref-control-box">
                  <button
                    type="button"
                    className={`toggle-switch ${notificationsEnabled ? 'active' : ''}`}
                    onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                    aria-label="Toggle notifications"
                  >
                    <span className="toggle-thumb" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
