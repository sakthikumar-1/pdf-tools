import React, { useState, useEffect } from 'react';
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
  faArrowLeft,
  faFilePdf,
  faArrowRight
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getHistoryItems } from '../utils/historyManager';
import './Account.css';

export default function Account() {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('account'); // 'account' or 'preferences'
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [avatarError, setAvatarError] = useState(false);
  const [recentFiles, setRecentFiles] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const items = getHistoryItems(user?.email);
    setRecentFiles(items);

    const handleUpdate = () => {
      setRecentFiles(getHistoryItems(user?.email));
    };
    window.addEventListener('simatrix_history_updated', handleUpdate);
    return () => window.removeEventListener('simatrix_history_updated', handleUpdate);
  }, [user?.email]);

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
          <Link to="/recent-files" className="account-tab-link">
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
                <div className="profile-avatar-large" style={{ overflow: 'hidden' }}>
                  {user?.avatar_url && !avatarError ? (
                    <img
                      src={user.avatar_url}
                      alt=""
                      referrerPolicy="no-referrer"
                      onError={() => setAvatarError(true)}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <span>{userInitial}</span>
                  )}
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

            {/* RECENT PROCESSED FILES SUMMARY */}
            <div className="account-recent-card" style={{
              marginTop: '1.5rem',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem 1.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <FontAwesomeIcon icon={faClockRotateLeft} style={{ color: 'var(--color-primary)' }} />
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-heading)' }}>
                    Recent File Activity
                  </h3>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '9999px',
                    background: 'var(--color-primary-light)',
                    color: 'var(--color-primary)'
                  }}>
                    {recentFiles.length} {recentFiles.length === 1 ? 'file' : 'files'}
                  </span>
                </div>
                <Link to="/history" style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--color-primary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  textDecoration: 'none'
                }}>
                  <span>View All History</span>
                  <FontAwesomeIcon icon={faArrowRight} style={{ fontSize: '0.75rem' }} />
                </Link>
              </div>

              {recentFiles.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '1.5rem 1rem',
                  color: 'var(--color-text-secondary)',
                  fontSize: '0.88rem'
                }}>
                  <p style={{ margin: '0 0 0.5rem 0' }}>No files processed in this session yet.</p>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    Files you reorder, crop, convert, or compress will be tracked here.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {recentFiles.slice(0, 4).map((f, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--color-bg)',
                      border: '1px solid var(--color-border)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                        <FontAwesomeIcon icon={faFilePdf} style={{ color: '#E53935', fontSize: '1.1rem', flexShrink: 0 }} />
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{
                            fontSize: '0.88rem',
                            fontWeight: 600,
                            color: 'var(--color-heading)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '280px'
                          }}>
                            {f.fileName}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            {f.toolName} • {new Date(f.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '9999px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        color: '#10B981',
                        border: '1px solid rgba(16, 185, 129, 0.25)'
                      }}>
                        Completed
                      </span>
                    </div>
                  ))}
                </div>
              )}
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
