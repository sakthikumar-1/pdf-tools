import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHouse,
  faClockRotateLeft,
  faStar,
  faFileCirclePlus,
  faLayerGroup,
  faCompress,
  faShieldHalved,
  faWandMagicSparkles,
  faGear,
  faCircleQuestion,
  faChevronRight,
  faChevronDown,
  faMagnifyingGlass,
  faXmark
} from '@fortawesome/free-solid-svg-icons';
import { TOOL_CATEGORIES, TOOLS_DATA } from '../utils/toolsData';
import './Sidebar.css';

export default function Sidebar({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  onOpenSearch
}) {
  const location = useLocation();

  // Track which category accordion is open in sidebar
  const [openCategories, setOpenCategories] = useState({
    'convert-pdf': false,
    'organize-pdf': false,
    'compress-pdf': false,
    'security-protect': false,
    'ai-tools': false
  });

  // Automatically open category containing current tool route
  useEffect(() => {
    const activeTool = TOOLS_DATA.find(t => t.path === location.pathname);
    if (activeTool && activeTool.category) {
      setOpenCategories(prev => ({
        ...prev,
        [activeTool.category]: true
      }));
    }
  }, [location.pathname]);

  // Lock body scroll on mobile when drawer is active
  useEffect(() => {
    if (isMobileOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isMobileOpen]);

  const toggleCategory = (catId, e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  const handleNavClick = () => {
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside 
        className={`app-sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}
        aria-label="Application Sidebar"
      >
        {/* Brand Header */}
        <div className="sidebar-header">
          <NavLink to="/" className="sidebar-brand" onClick={handleNavClick}>
            <div className="brand-logo-icon">
              <img src="/logo.png" alt="Simatrix Logo" className="brand-logo-img" />
            </div>
            {!isCollapsed && (
              <div className="brand-info">
                <span className="brand-title">Simatrix</span>
                <span className="brand-tag">PDF Tools</span>
              </div>
            )}
          </NavLink>

          {isMobileOpen && (
            <button 
              type="button" 
              className="sidebar-close-btn"
              onClick={onCloseMobile}
              aria-label="Close sidebar"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          )}
        </div>

        {/* Quick Search Input */}
        <div className="sidebar-search-box">
          <button
            type="button"
            className="sidebar-search-btn"
            onClick={onOpenSearch}
            title="Search tools (Ctrl + K)"
          >
            <FontAwesomeIcon icon={faMagnifyingGlass} className="search-btn-icon" />
            {!isCollapsed && (
              <>
                <span className="search-btn-placeholder">Search tools...</span>
                <kbd className="search-btn-kbd">Ctrl K</kbd>
              </>
            )}
          </button>
        </div>

        {/* Scrollable Navigation Area */}
        <div className="sidebar-scrollable">
          {/* Main Navigation */}
          <ul className="sidebar-menu-list">
            <li>
              <NavLink 
                to="/" 
                end
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={handleNavClick}
                title="Home Dashboard"
              >
                <FontAwesomeIcon icon={faHouse} className="link-fa-icon" />
                {!isCollapsed && <span className="link-text">Home</span>}
              </NavLink>
            </li>
            <li>
              <NavLink 
                to="/history" 
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={handleNavClick}
                title="Recent Files"
              >
                <FontAwesomeIcon icon={faClockRotateLeft} className="link-fa-icon" />
                {!isCollapsed && <span className="link-text">Recent Files</span>}
              </NavLink>
            </li>
          </ul>

          {/* Section: TOOLS */}
          <div className="sidebar-section-divider">
            {!isCollapsed && <span className="section-label">Tools</span>}
          </div>

          <div className="sidebar-categories">
            {TOOL_CATEGORIES.filter(c => c.id !== 'all' && c.id !== 'ai-tools').map(cat => {
              const toolsInCat = TOOLS_DATA.filter(t => t.category === cat.id);
              const isOpen = openCategories[cat.id];
              const isAnyChildActive = toolsInCat.some(t => t.path === location.pathname);

              return (
                <div key={cat.id} className={`sidebar-cat-group ${isOpen ? 'open' : ''}`}>
                  <button
                    type="button"
                    className={`sidebar-cat-btn ${isAnyChildActive ? 'child-active' : ''}`}
                    onClick={(e) => toggleCategory(cat.id, e)}
                    title={cat.label}
                    aria-expanded={isOpen}
                  >
                    <div className="cat-btn-left">
                      <FontAwesomeIcon icon={cat.icon} className="link-fa-icon" />
                      {!isCollapsed && <span className="cat-label">{cat.label}</span>}
                    </div>
                    {!isCollapsed && (
                      <FontAwesomeIcon 
                        icon={isOpen ? faChevronDown : faChevronRight} 
                        className="cat-chevron" 
                      />
                    )}
                  </button>

                  {/* Submenu for Category */}
                  {isOpen && !isCollapsed && (
                    <ul className="sidebar-submenu">
                      {toolsInCat.map(tool => (
                        <li key={tool.id}>
                          <NavLink
                            to={tool.path}
                            className={({ isActive }) => `sidebar-sublink ${isActive ? 'active' : ''}`}
                            onClick={handleNavClick}
                          >
                            <span className="sublink-text">{tool.title}</span>
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>

          {/* Section: AI */}
          <div className="sidebar-section-divider">
            {!isCollapsed && <span className="section-label">AI</span>}
          </div>

          <ul className="sidebar-menu-list">
            <li>
              <NavLink
                to="/ai-summarizer"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={handleNavClick}
                title="AI PDF Summarizer"
              >
                <FontAwesomeIcon icon={faWandMagicSparkles} className="link-fa-icon" />
                {!isCollapsed && <span className="link-text">AI Summarizer</span>}
              </NavLink>
            </li>
          </ul>
        </div>

        {/* Bottom Settings & Support */}
        <div className="sidebar-footer">
          <ul className="sidebar-menu-list">
            <li>
              <NavLink 
                to="/account" 
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={handleNavClick}
                title="Settings"
              >
                <FontAwesomeIcon icon={faGear} className="link-fa-icon" />
                {!isCollapsed && <span className="link-text">Settings</span>}
              </NavLink>
            </li>
          </ul>
        </div>
      </aside>
    </>
  );
}
