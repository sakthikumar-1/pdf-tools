import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSun,
  faMoon,
  faUser,
  faRightFromBracket,
  faClockRotateLeft,
  faGear,
  faCircleCheck,
  faWifi,
  faMagnifyingGlass,
  faArrowRight
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { TOOLS_DATA, filterTools } from '../utils/toolsData';
import SidebarToggleIcon from './SidebarToggleIcon';
import SimatrixLogo from './SimatrixLogo';
import './Header.css';

export default function Header({ onToggleSidebar, onOpenAuth, onOpenSearch, isCollapsed }) {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [avatarError, setAvatarError] = useState(false);
  const [headerSearchQuery, setHeaderSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const searchWrapperRef = useRef(null);

  // Monitor online / offline state
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchResults = React.useMemo(() => {
    if (!headerSearchQuery.trim()) return [];
    return filterTools(headerSearchQuery.trim(), 'all').slice(0, 5);
  }, [headerSearchQuery]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    const q = headerSearchQuery.trim().toLowerCase();
    if (!q) return;

    const match = TOOLS_DATA.find((t) =>
      t.title.toLowerCase() === q ||
      t.id.toLowerCase() === q ||
      t.title.toLowerCase().includes(q) ||
      t.keywords?.some((k) => k.toLowerCase() === q || q.includes(k.toLowerCase()))
    );

    if (match) {
      navigate(match.path);
      setHeaderSearchQuery('');
      setSearchFocused(false);
    } else if (searchResults.length > 0) {
      navigate(searchResults[0].path);
      setHeaderSearchQuery('');
      setSearchFocused(false);
    }
  };

  const handleSelectTool = (path) => {
    navigate(path);
    setHeaderSearchQuery('');
    setSearchFocused(false);
  };

  const userInitial = user?.full_name ? user.full_name.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'S');
  const userDisplayName = user?.full_name || (user?.email ? user.email.split('@')[0] : 'Simatrix User');

  return (
    <header className="top-nav-bar" role="banner">
      {/* 1. Header Left: Toggle & Logo */}
      <div className="top-nav-left">
        <button
          type="button"
          className="header-toggle-btn"
          onClick={onToggleSidebar}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <SidebarToggleIcon isCollapsed={isCollapsed} />
        </button>

        <SimatrixLogo asLink={true} />
      </div>

      {/* 2. Header Center: Wide PDF Tool Search Field */}
      <div className="top-nav-center" ref={searchWrapperRef}>
        <form className="header-search-form" onSubmit={handleSearchSubmit}>
          <FontAwesomeIcon icon={faMagnifyingGlass} className="header-search-icon" />
          <input
            type="text"
            className="header-search-input"
            placeholder="Search PDF tools (e.g. merge, compress, to word...)"
            value={headerSearchQuery}
            onChange={(e) => setHeaderSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            aria-label="Search PDF tools"
          />
          <kbd className="header-search-kbd">Ctrl K</kbd>
        </form>

        {/* Instant Search Suggestions Dropdown */}
        {searchFocused && headerSearchQuery.trim() && (
          <div className="header-search-dropdown" role="listbox">
            {searchResults.map((tool) => (
              <button
                key={tool.id}
                type="button"
                className="header-search-item"
                onMouseDown={() => handleSelectTool(tool.path)}
              >
                <div className="search-item-info">
                  <span className="search-item-title">{tool.title}</span>
                  <span className="search-item-desc">{tool.description}</span>
                </div>
                <FontAwesomeIcon icon={faArrowRight} className="search-item-arrow" />
              </button>
            ))}
            {searchResults.length === 0 && (
              <div className="header-search-empty">
                No tools found for &ldquo;{headerSearchQuery}&rdquo;
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Header Right: Theme Toggle & Sign In */}
      <div className="top-nav-right">
        {!isOnline && (
          <span className="network-offline-badge" title="Working offline. Client PDF tools remain active.">
            <FontAwesomeIcon icon={faWifi} />
            <span>Offline</span>
          </span>
        )}

        {/* Theme Switcher Button */}
        <button
          type="button"
          className="header-icon-action theme-toggle-btn"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          <FontAwesomeIcon icon={theme === 'dark' ? faSun : faMoon} />
        </button>

        {/* Subtle Divider */}
        <div className="header-divider" aria-hidden="true" />

        {/* User Account / Profile Menu */}
        <div className="user-menu-container" ref={dropdownRef}>
          {isAuthenticated ? (
            <button
              type="button"
              className="user-profile-btn"
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              aria-expanded={userDropdownOpen}
              aria-haspopup="true"
            >
              <div className="user-avatar-circle">
                {user?.avatar_url && !avatarError ? (
                  <img
                    src={user.avatar_url}
                    alt=""
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  userInitial
                )}
              </div>
              <span className="user-name-text">{userDisplayName}</span>
            </button>
          ) : (
            <button
              type="button"
              className="header-signin-btn"
              onClick={onOpenAuth}
            >
              <FontAwesomeIcon icon={faUser} className="signin-icon" />
              <span>Sign In</span>
            </button>
          )}

          {/* User Dropdown Panel */}
          {userDropdownOpen && (
            <div className="user-dropdown-panel" role="menu">
              <div className="user-dropdown-header">
                <div className="user-avatar-circle large">
                  {user?.avatar_url && !avatarError ? (
                    <img
                      src={user.avatar_url}
                      alt=""
                      referrerPolicy="no-referrer"
                      onError={() => setAvatarError(true)}
                    />
                  ) : (
                    userInitial
                  )}
                </div>
                <div className="user-dropdown-info">
                  <div className="user-dropdown-name">{userDisplayName}</div>
                  <div className="user-dropdown-email">{user?.email || 'user@example.com'}</div>
                  <span className="user-verified-badge">
                    <FontAwesomeIcon icon={faCircleCheck} /> {user?.is_verified ? 'Google Verified' : 'Active Workspace'}
                  </span>
                </div>
              </div>

              <div className="user-dropdown-divider" />

              <ul className="user-dropdown-list">
                <li>
                  <Link
                    to="/recent-files"
                    className="user-dropdown-item"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <FontAwesomeIcon icon={faClockRotateLeft} />
                    <span>Recent Files</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/settings"
                    className="user-dropdown-item"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <FontAwesomeIcon icon={faGear} />
                    <span>Account Settings</span>
                  </Link>
                </li>
              </ul>

              <div className="user-dropdown-divider" />

              <div className="user-dropdown-footer">
                <button
                  type="button"
                  className="user-dropdown-logout-btn"
                  onClick={() => {
                    setUserDropdownOpen(false);
                    logout();
                  }}
                >
                  <FontAwesomeIcon icon={faRightFromBracket} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
