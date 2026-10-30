import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHouse,
  faClockRotateLeft,
  faLayerGroup,
  faArrowRightArrowLeft,
  faCompress,
  faShieldHalved,
  faWandMagicSparkles,
  faGear,
  faChevronRight,
  faChevronDown,
  faXmark
} from '@fortawesome/free-solid-svg-icons';
import { TOOL_CATEGORIES, TOOLS_DATA } from '../utils/toolsData';
import './Sidebar.css';

// Category monochrome icons mapping
const CATEGORY_ICONS = {
  'organize-pdf': faLayerGroup,
  'convert-pdf': faArrowRightArrowLeft,
  'compress-pdf': faCompress,
  'security-protect': faShieldHalved,
  'ai-tools': faWandMagicSparkles,
};

export default function Sidebar({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile
}) {
  const location = useLocation();
  const navigate = useNavigate();

  // Track which categories are expanded in sidebar
  const [expandedCategories, setExpandedCategories] = useState({
    'organize-pdf': false,
    'convert-pdf': false,
    'compress-pdf': false,
    'security-protect': false,
    'ai-tools': false
  });

  // Auto-expand category if active route is inside it
  useEffect(() => {
    const currentPath = location.pathname;
    
    // Check if on category page
    const matchedCategory = TOOL_CATEGORIES.find(c => c.path === currentPath);
    if (matchedCategory && matchedCategory.id !== 'all') {
      setExpandedCategories(prev => ({
        ...prev,
        [matchedCategory.id]: true
      }));
      return;
    }

    // Check if on a tool page
    const activeTool = TOOLS_DATA.find(t => 
      t.path === currentPath || 
      t.legacyPath === currentPath ||
      currentPath.endsWith(`/${t.id}`)
    );
    if (activeTool && activeTool.category) {
      setExpandedCategories(prev => ({
        ...prev,
        [activeTool.category]: true
      }));
    }
  }, [location.pathname]);

  // Lock body scroll on mobile
  useEffect(() => {
    if (isMobileOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isMobileOpen]);

  const toggleExpand = (catId, e) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  const handleNavClick = () => {
    if (onCloseMobile) onCloseMobile();
  };

  const sidebarCategories = TOOL_CATEGORIES.filter(c => c.id !== 'all');

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
        {isMobileOpen && (
          <div className="sidebar-mobile-header">
            <span className="sidebar-mobile-title">Navigation</span>
            <button
              type="button"
              className="sidebar-close-btn"
              onClick={onCloseMobile}
              aria-label="Close navigation"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        )}

        {/* Scrollable Navigation Area */}
        <div className="sidebar-scrollable">
          {/* Main Top Navigation */}
          <ul className="sidebar-nav-list">
            <li>
              <NavLink
                to="/"
                end
                className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                onClick={handleNavClick}
                title="Home"
                data-tooltip={isCollapsed ? "Home" : undefined}
              >
                <FontAwesomeIcon icon={faHouse} className="sidebar-icon" />
                {!isCollapsed && <span className="sidebar-label">Home</span>}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/recent-files"
                className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                onClick={handleNavClick}
                title="Recent Files"
                data-tooltip={isCollapsed ? "Recent Files" : undefined}
              >
                <FontAwesomeIcon icon={faClockRotateLeft} className="sidebar-icon" />
                {!isCollapsed && <span className="sidebar-label">Recent Files</span>}
              </NavLink>
            </li>
          </ul>

          {/* Section: PDF Tools */}
          <div className="sidebar-section-header">
            {!isCollapsed && <span className="section-title-text">PDF Tools</span>}
          </div>

          {/* Categories Navigation with Accordion Submenus */}
          <div className="sidebar-categories-group">
            {sidebarCategories.map(cat => {
              const toolsInCat = TOOLS_DATA.filter(t => t.category === cat.id);
              const isExpanded = expandedCategories[cat.id];
              const isCategoryActive = location.pathname === cat.path;
              const isAnyChildActive = toolsInCat.some(t => 
                t.path === location.pathname || 
                t.legacyPath === location.pathname ||
                location.pathname.endsWith(`/${t.id}`)
              );
              const catIcon = CATEGORY_ICONS[cat.id] || cat.icon;

              return (
                <div key={cat.id} className={`sidebar-cat-wrapper ${isExpanded ? 'is-open' : ''}`}>
                  <div className={`sidebar-cat-row ${isCategoryActive ? 'active' : ''} ${isAnyChildActive ? 'child-active' : ''}`}>
                    <NavLink
                      to={cat.path}
                      className="cat-main-link"
                      onClick={handleNavClick}
                      title={cat.label}
                      data-tooltip={isCollapsed ? cat.label : undefined}
                    >
                      <FontAwesomeIcon icon={catIcon} className="sidebar-icon" />
                      {!isCollapsed && <span className="sidebar-label">{cat.label}</span>}
                    </NavLink>

                    {!isCollapsed && toolsInCat.length > 0 && (
                      <button
                        type="button"
                        className="cat-expand-btn"
                        onClick={(e) => toggleExpand(cat.id, e)}
                        aria-label={isExpanded ? `Collapse ${cat.label}` : `Expand ${cat.label}`}
                        title={isExpanded ? "Collapse" : "Expand tools"}
                      >
                        <FontAwesomeIcon
                          icon={isExpanded ? faChevronDown : faChevronRight}
                          className="cat-arrow-icon"
                        />
                      </button>
                    )}
                  </div>

                  {/* Submenu for Individual Tools */}
                  {isExpanded && !isCollapsed && toolsInCat.length > 0 && (
                    <ul className="sidebar-submenu-list">
                      {toolsInCat.map(tool => {
                        const isToolActive = 
                          location.pathname === tool.path || 
                          location.pathname === tool.legacyPath ||
                          location.pathname.endsWith(`/${tool.id}`);

                        return (
                          <li key={tool.id}>
                            <NavLink
                              to={tool.path}
                              className={`sidebar-subitem ${isToolActive ? 'active' : ''}`}
                              onClick={handleNavClick}
                            >
                              <span className="subitem-bullet">•</span>
                              <span className="subitem-label">{tool.title}</span>
                            </NavLink>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>

          {/* Standalone AI Feature */}
          <div className="sidebar-section-divider" />
          <ul className="sidebar-nav-list">
            <li>
              <NavLink
                to="/ai-summarizer"
                className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                onClick={handleNavClick}
                title="AI Summarizer"
                data-tooltip={isCollapsed ? "AI Summarizer" : undefined}
              >
                <FontAwesomeIcon icon={faWandMagicSparkles} className="sidebar-icon" />
                {!isCollapsed && <span className="sidebar-label">AI Summarizer</span>}
              </NavLink>
            </li>
          </ul>
        </div>

        {/* Bottom Settings Link */}
        <div className="sidebar-bottom-bar">
          <ul className="sidebar-nav-list">
            <li>
              <NavLink
                to="/settings"
                className={({ isActive }) => `sidebar-nav-item ${isActive || location.pathname === '/account' ? 'active' : ''}`}
                onClick={handleNavClick}
                title="Settings"
                data-tooltip={isCollapsed ? "Settings" : undefined}
              >
                <FontAwesomeIcon icon={faGear} className="sidebar-icon" />
                {!isCollapsed && <span className="sidebar-label">Settings</span>}
              </NavLink>
            </li>
          </ul>
        </div>
      </aside>
    </>
  );
}
