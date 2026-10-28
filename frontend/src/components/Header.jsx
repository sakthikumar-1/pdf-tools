import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBars,
  faSun,
  faMoon,
  faChevronRight,
  faUser,
  faRightFromBracket,
  faClockRotateLeft,
  faGear,
  faArrowRightToBracket,
  faCircleCheck,
  faWifi,
  faMagnifyingGlass
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { TOOLS_DATA } from '../utils/toolsData';
import SidebarToggleIcon from './SidebarToggleIcon';
import './Header.css';

export default function Header({ onToggleSidebar, onOpenAuth, onOpenSearch, isCollapsed }) {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [avatarError, setAvatarError] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  // Monitor network online/offline state
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
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setUserDropdownOpen(false);
  }, [location.pathname]);

  // Compute dynamic breadcrumbs
  const breadcrumbs = useMemo(() => {
    const path = location.pathname;
    if (path === '/' || path === '') {
      return [{ label: 'Home', path: null }];
    }

    if (path === '/account') {
      return [
        { label: 'Home', path: '/' },
        { label: 'Account Settings', path: null }
      ];
    }

    if (path === '/history') {
      return [
        { label: 'Home', path: '/' },
        { label: 'Recent Files', path: null }
      ];
    }

    if (path === '/login') {
      return [
        { label: 'Home', path: '/' },
        { label: 'Sign In', path: null }
      ];
    }

    const tool = TOOLS_DATA.find(t => t.path === path);
    if (tool) {
      return [
        { label: 'Home', path: '/' },
        { label: tool.categoryLabel, path: '/#tools-catalog' },
        { label: tool.title, path: null }
      ];
    }

    return [
      { label: 'Home', path: '/' },
      { label: 'Page', path: null }
    ];
  }, [location.pathname]);

  const userInitial = user?.full_name ? user.full_name.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'S');
  const userDisplayName = user?.full_name || (user?.email ? user.email.split('@')[0] : 'Simatrix User');

  return (
    <header className="top-nav-bar" role="banner">
      <div className="top-nav-left">
        {/* Desktop Sidebar Toggle Button */}
        <button
          type="button"
          className="top-nav-toggle-btn desktop-toggle-btn"
          onClick={onToggleSidebar}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <SidebarToggleIcon isCollapsed={isCollapsed} />
        </button>

        {/* Dynamic Breadcrumbs */}
        <nav className="top-nav-breadcrumbs" aria-label="Breadcrumbs">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && (
                <FontAwesomeIcon icon={faChevronRight} className="breadcrumb-separator-icon" />
              )}
              {crumb.path ? (
                <Link to={crumb.path} className="breadcrumb-link-item">
                  {crumb.label}
                </Link>
              ) : (
                <span className="breadcrumb-current-item">
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>

      <div className="top-nav-right">
        {!isOnline && (
          <span className="network-offline-badge" title="Working offline. Local client PDF tools remain fully available.">
            <FontAwesomeIcon icon={faWifi} />
            <span>Offline</span>
          </span>
        )}

        {/* Quick Search Button (Image 2 style) */}
        <button
          type="button"
          className="header-icon-btn search-nav-btn"
          onClick={onOpenSearch}
          aria-label="Search tools (Ctrl+K)"
          title="Search tools (Ctrl+K)"
        >
          <FontAwesomeIcon icon={faMagnifyingGlass} />
        </button>

        {/* Mobile Sidebar Toggle Button (Image 2 style: on right of topbar on mobile) */}
        <button
          type="button"
          className="header-icon-btn mobile-toggle-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
          title="Toggle menu"
        >
          <SidebarToggleIcon isCollapsed={isCollapsed} />
        </button>

        {/* Light / Dark Theme Toggle Button */}
        <button
          type="button"
          className="theme-switch-btn"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          <FontAwesomeIcon icon={theme === 'dark' ? faSun : faMoon} />
        </button>

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
              <div className="user-avatar-circle" style={{ overflow: 'hidden' }}>
                {user?.avatar_url && !avatarError ? (
                  <img
                    src={user.avatar_url}
                    alt=""
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarError(true)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
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
              className="sign-in-nav-btn"
              onClick={onOpenAuth}
            >
              <FontAwesomeIcon icon={faUser} className="sign-in-icon" />
              <span>Sign In</span>
            </button>
          )}

          {/* User Dropdown Panel */}
          {userDropdownOpen && (
            <div className="user-dropdown-panel" role="menu">
              <div className="user-dropdown-header">
                <div className="user-avatar-circle large" style={{ overflow: 'hidden' }}>
                  {user?.avatar_url && !avatarError ? (
                    <img
                      src={user.avatar_url}
                      alt=""
                      referrerPolicy="no-referrer"
                      onError={() => setAvatarError(true)}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    userInitial
                  )}
                </div>
                <div className="user-dropdown-info">
                  <div className="user-dropdown-name">{userDisplayName}</div>
                  <div className="user-dropdown-email">{user?.email || 'user@example.com'}</div>
                  <span className="user-verified-badge">
                    <FontAwesomeIcon icon={faCircleCheck} /> {user?.is_verified ? 'Verified with Google' : 'Active Workspace'}
                  </span>
                </div>
              </div>

              <div className="user-dropdown-divider" />

              <ul className="user-dropdown-list">
                <li>
                  <Link 
                    to="/account" 
                    className="user-dropdown-link"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <FontAwesomeIcon icon={faGear} />
                    <span>Account Settings</span>
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/history" 
                    className="user-dropdown-link"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <FontAwesomeIcon icon={faClockRotateLeft} />
                    <span>Processing History</span>
                  </Link>
                </li>
              </ul>

              <div className="user-dropdown-divider" />

              <button
                type="button"
                className="user-dropdown-signout"
                onClick={() => {
                  setUserDropdownOpen(false);
                  logout();
                }}
              >
                <FontAwesomeIcon icon={faRightFromBracket} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
