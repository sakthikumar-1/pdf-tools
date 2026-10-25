import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronDown,
  faSun,
  faMoon,
  faBars,
  faXmark,
  faWandMagicSparkles,
  faFilePdf,
  faUser,
  faCircleQuestion,
  faLayerGroup,
  faRightFromBracket,
  faClockRotateLeft,
  faGear
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { TOOLS_DATA, TOOL_CATEGORIES } from '../utils/toolsData';
import './Header.css';

export default function Header({ onOpenAuth }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const userMenuRef = useRef(null);

  // Close menus on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setDropdownOpen(false);
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          {/* Brand Logo */}
          <Link to="/" className="brand-link" title="Simatrix PDF Tools">
            <span className="brand-icon-box">
              <FontAwesomeIcon icon={faFilePdf} className="brand-fa-icon" />
            </span>
            <span className="brand-text">
              Simatrix <span className="brand-sub">PDF</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="header-nav" aria-label="Main Navigation">
            {/* Tools Dropdown */}
            <div className="nav-dropdown-anchor" ref={dropdownRef}>
              <button
                type="button"
                className={`nav-btn ${dropdownOpen ? 'active' : ''}`}
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
              >
                <span>Tools</span>
                <FontAwesomeIcon icon={faChevronDown} className={`chevron-fa ${dropdownOpen ? 'rotated' : ''}`} />
              </button>

              {dropdownOpen && (
                <div className="dropdown-panel">
                  <div className="dropdown-grid">
                    {TOOL_CATEGORIES.filter(c => c.id !== 'all').map((cat) => {
                      const catTools = TOOLS_DATA.filter(t => t.category === cat.id);
                      if (catTools.length === 0) return null;
                      return (
                        <div key={cat.id} className="dropdown-col">
                          <span className="dropdown-col-title">
                            {cat.icon && <FontAwesomeIcon icon={cat.icon} className="cat-mini-icon" />}
                            {cat.label}
                          </span>
                          <ul className="dropdown-list">
                            {catTools.map((tool) => (
                              <li key={tool.id}>
                                <Link
                                  to={tool.path}
                                  className={`dropdown-item ${location.pathname === tool.path ? 'current' : ''}`}
                                >
                                  <FontAwesomeIcon icon={tool.icon} className="item-fa-icon" />
                                  <span className="item-title">{tool.title}</span>
                                  {tool.badge && <span className="item-badge">{tool.badge}</span>}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* AI Tools Link */}
            <Link
              to="/ai-summarizer"
              className={`nav-link-btn ${location.pathname === '/ai-summarizer' ? 'active' : ''}`}
            >
              <FontAwesomeIcon icon={faWandMagicSparkles} className="nav-gold-icon" />
              <span>AI Tools</span>
            </Link>

            {/* Help Link */}
            <a href="/#faq-section" className="nav-link-btn">
              <FontAwesomeIcon icon={faCircleQuestion} />
              <span>Help</span>
            </a>
          </nav>

          {/* Header Actions */}
          <div className="header-actions">
            {/* Theme Toggle */}
            <button
              type="button"
              className="action-icon-btn"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              <FontAwesomeIcon icon={theme === 'dark' ? faSun : faMoon} />
            </button>

            {/* Auth / Account Controls */}
            {isAuthenticated ? (
              <div className="nav-dropdown-anchor" ref={userMenuRef}>
                <button
                  type="button"
                  className="user-profile-btn"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  aria-expanded={userMenuOpen}
                >
                  <span className="user-avatar-initial">
                    {user?.full_name ? user.full_name.charAt(0).toUpperCase() : (user?.email?.charAt(0).toUpperCase() || 'U')}
                  </span>
                  <span className="user-email-display">{user?.email || 'Account'}</span>
                  <FontAwesomeIcon icon={faChevronDown} className={`chevron-fa ${userMenuOpen ? 'rotated' : ''}`} />
                </button>

                {userMenuOpen && (
                  <div className="user-dropdown-menu">
                    <div className="user-dropdown-header">
                      <strong>{user?.full_name || 'Signed In User'}</strong>
                      <span>{user?.email}</span>
                    </div>
                    <ul className="user-dropdown-links">
                      <li>
                        <Link to="/account" className="user-dropdown-item">
                          <FontAwesomeIcon icon={faGear} />
                          <span>Account Settings</span>
                        </Link>
                      </li>
                      <li>
                        <Link to="/history" className="user-dropdown-item">
                          <FontAwesomeIcon icon={faClockRotateLeft} />
                          <span>Processing History</span>
                        </Link>
                      </li>
                      <li className="menu-divider"></li>
                      <li>
                        <button
                          type="button"
                          className="user-dropdown-item logout-item"
                          onClick={() => {
                            logout();
                            setUserMenuOpen(false);
                          }}
                        >
                          <FontAwesomeIcon icon={faRightFromBracket} />
                          <span>Sign Out</span>
                        </button>
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-sm btn-secondary sign-in-btn"
                onClick={onOpenAuth}
              >
                <FontAwesomeIcon icon={faUser} />
                <span>Sign in</span>
              </button>
            )}

            {/* Mobile Menu Trigger */}
            <button
              type="button"
              className="mobile-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle mobile menu"
            >
              <FontAwesomeIcon icon={mobileMenuOpen ? faXmark : faBars} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-drawer-header">
              <span className="brand-text">Simatrix <span className="brand-sub">PDF</span></span>
              <button
                type="button"
                className="action-icon-btn"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <div className="mobile-drawer-body">
              <div className="mobile-nav-group">
                <Link to="/" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
                  <FontAwesomeIcon icon={faLayerGroup} />
                  <span>All Tools</span>
                </Link>
                <Link to="/ai-summarizer" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
                  <FontAwesomeIcon icon={faWandMagicSparkles} className="nav-gold-icon" />
                  <span>AI Summarizer</span>
                </Link>
                <a href="/#faq-section" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
                  <FontAwesomeIcon icon={faCircleQuestion} />
                  <span>Help &amp; FAQ</span>
                </a>
                {isAuthenticated && (
                  <>
                    <Link to="/account" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
                      <FontAwesomeIcon icon={faGear} />
                      <span>Account Settings</span>
                    </Link>
                    <Link to="/history" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
                      <FontAwesomeIcon icon={faClockRotateLeft} />
                      <span>Processing History</span>
                    </Link>
                  </>
                )}
              </div>

              <div className="mobile-tools-accordion">
                <span className="mobile-group-title">Browse PDF Utilities</span>
                <div className="mobile-tools-grid">
                  {TOOLS_DATA.map((tool) => (
                    <Link
                      key={tool.id}
                      to={tool.path}
                      className="mobile-tool-item"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <FontAwesomeIcon icon={tool.icon} className="mobile-tool-fa" />
                      <span>{tool.title}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <div className="mobile-drawer-footer">
              {isAuthenticated ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: '100%' }}
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                >
                  <FontAwesomeIcon icon={faRightFromBracket} />
                  <span>Sign Out ({user?.email})</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (onOpenAuth) onOpenAuth();
                  }}
                >
                  <FontAwesomeIcon icon={faUser} />
                  <span>Sign in with Google</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
