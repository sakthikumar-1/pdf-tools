import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMagnifyingGlass,
  faChevronDown,
  faSun,
  faMoon,
  faBars,
  faXmark,
  faWandMagicSparkles,
  faFilePdf,
  faUser,
  faCircleQuestion,
  faLayerGroup
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { TOOLS_DATA, TOOL_CATEGORIES } from '../utils/toolsData';
import QuickSearchModal from './QuickSearchModal';
import './Header.css';

export default function Header({ onOpenAuth }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const dropdownRef = useRef(null);

  // Keyboard shortcut Ctrl+K or Cmd+K
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchModalOpen(true);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close menus on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setDropdownOpen(false);
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
            {/* Quick Search Button */}
            <button
              type="button"
              className="action-search-btn"
              onClick={() => setSearchModalOpen(true)}
              aria-label="Search PDF tools (Ctrl+K)"
            >
              <FontAwesomeIcon icon={faMagnifyingGlass} />
              <span className="search-hint-text">Search tools...</span>
              <kbd className="search-shortcut">⌘K</kbd>
            </button>

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

            {/* Sign in button */}
            <button
              type="button"
              className="btn btn-sm btn-secondary sign-in-btn"
              onClick={onOpenAuth}
            >
              <FontAwesomeIcon icon={faUser} />
              <span>Sign in</span>
            </button>

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
        <div className="mobile-drawer-backdrop" onClick={() => setMobileMenuOpen(false)}>
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
              <button
                type="button"
                className="mobile-search-btn"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setSearchModalOpen(true);
                }}
              >
                <FontAwesomeIcon icon={faMagnifyingGlass} />
                <span>Search 19 tools...</span>
              </button>

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
                  <span>Help & FAQ</span>
                </a>
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
            </div>
          </div>
        </div>
      )}

      {/* Quick Search Modal */}
      <QuickSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />
    </>
  );
}
