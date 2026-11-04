import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronDown,
  faArrowRight,
  faClockRotateLeft,
  faTableCellsLarge
} from '@fortawesome/free-solid-svg-icons';
import { TOOL_CATEGORIES, TOOLS_DATA } from '../utils/toolsData';
import './TopNav.css';

// Top-level menu definition. Labels are shortened for the navbar; each entry maps to a TOOL_CATEGORIES id.
const NAV_MENUS = [
  { id: 'organize-pdf', label: 'Organize PDF' },
  { id: 'convert-pdf', label: 'Convert PDF' },
  { id: 'compress-pdf', label: 'Compress PDF' },
  { id: 'security-protect', label: 'Edit & Sign' },
  { id: 'ai-tools', label: 'AI PDF Tools', columns: 2, align: 'end' },
  { id: 'all', label: 'All Tools', mega: true }
];

const ALL_TOOLS_HASH_LINK = { pathname: '/', hash: '#all-tools' };
const HOVER_OPEN_DELAY = 60;
const HOVER_CLOSE_DELAY = 140;

function isToolActive(tool, pathname) {
  return pathname === tool.path || pathname === tool.legacyPath || pathname.endsWith(`/${tool.id}`);
}

function getCategory(id) {
  return TOOL_CATEGORIES.find(c => c.id === id);
}

function getCategoryTools(id) {
  return TOOLS_DATA.filter(t => t.category === id);
}

function isMenuActive(menu, pathname, hash) {
  if (menu.id === 'all') return pathname === '/' && hash === '#all-tools';
  const cat = getCategory(menu.id);
  if (cat && pathname === cat.path) return true;
  return getCategoryTools(menu.id).some(t => isToolActive(t, pathname));
}

function ToolLink({ tool, pathname, onNavigate, compact = false }) {
  const active = isToolActive(tool, pathname);
  return (
    <Link
      to={tool.path}
      className={`topnav-tool ${active ? 'is-active' : ''} ${compact ? 'is-compact' : ''}`}
      onClick={onNavigate}
      role="menuitem"
      aria-current={active ? 'page' : undefined}
    >
      <span className="topnav-tool-icon" aria-hidden="true">
        <FontAwesomeIcon icon={tool.icon} />
      </span>
      <span className="topnav-tool-text">
        <span className="topnav-tool-title">
          {tool.title}
          {tool.comingSoon && <span className="topnav-soon-badge">Soon</span>}
        </span>
        {!compact && <span className="topnav-tool-desc">{tool.description}</span>}
      </span>
    </Link>
  );
}

/**
 * Desktop horizontal navigation with hover/click dropdown menus for each tool category.
 */
export function TopNavMenu() {
  const location = useLocation();
  const [openId, setOpenId] = useState(null);
  const navRef = useRef(null);
  const hoverTimer = useRef(null);

  const clearHoverTimer = () => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  };

  const close = useCallback(() => {
    clearHoverTimer();
    setOpenId(null);
  }, []);

  // Close menus on navigation
  useEffect(() => {
    close();
  }, [location.pathname, location.hash, close]);

  // Close on outside click and Escape
  useEffect(() => {
    if (!openId) return undefined;
    const handlePointer = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) close();
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        const trigger = navRef.current?.querySelector(`[data-menu-trigger="${openId}"]`);
        close();
        trigger?.focus();
      }
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [openId, close]);

  useEffect(() => clearHoverTimer, []);

  const scheduleOpen = (id) => {
    clearHoverTimer();
    hoverTimer.current = setTimeout(() => setOpenId(id), openId ? 0 : HOVER_OPEN_DELAY);
  };

  const scheduleClose = () => {
    clearHoverTimer();
    hoverTimer.current = setTimeout(() => setOpenId(null), HOVER_CLOSE_DELAY);
  };

  const handleTriggerKeyDown = (e, id) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpenId(id);
      requestAnimationFrame(() => {
        navRef.current?.querySelector(`#topnav-panel-${id} [role="menuitem"]`)?.focus();
      });
    }
  };

  return (
    <nav className="topnav" aria-label="PDF tools" ref={navRef}>
      <ul className="topnav-list">
        {NAV_MENUS.map(menu => {
          const isOpen = openId === menu.id;
          const active = isMenuActive(menu, location.pathname, location.hash);
          const cat = getCategory(menu.id);
          const tools = menu.mega ? [] : getCategoryTools(menu.id);

          return (
            <li
              key={menu.id}
              className={`topnav-item ${menu.mega ? 'is-mega' : ''}`}
              onMouseEnter={() => scheduleOpen(menu.id)}
              onMouseLeave={scheduleClose}
            >
              <button
                type="button"
                className={`topnav-trigger ${active ? 'is-active' : ''} ${isOpen ? 'is-open' : ''}`}
                data-menu-trigger={menu.id}
                aria-expanded={isOpen}
                aria-haspopup="true"
                aria-controls={`topnav-panel-${menu.id}`}
                onClick={() => {
                  clearHoverTimer();
                  setOpenId(isOpen ? null : menu.id);
                }}
                onKeyDown={(e) => handleTriggerKeyDown(e, menu.id)}
              >
                <span>{menu.label}</span>
                <FontAwesomeIcon icon={faChevronDown} className="topnav-chevron" aria-hidden="true" />
              </button>

              <div
                id={`topnav-panel-${menu.id}`}
                className={`topnav-panel ${isOpen ? 'is-open' : ''} ${menu.mega ? 'topnav-panel-mega' : ''} ${menu.align === 'end' ? 'align-end' : ''}`}
                role="menu"
                aria-label={menu.label}
                inert={!isOpen ? '' : undefined}
              >
                {menu.mega ? (
                  <>
                    <div className="topnav-mega-grid">
                      {NAV_MENUS.filter(m => !m.mega).map(m => {
                        const mCat = getCategory(m.id);
                        return (
                          <div key={m.id} className="topnav-mega-col">
                            <Link to={mCat.path} className="topnav-mega-heading" onClick={close} role="menuitem">
                              {m.label}
                            </Link>
                            {getCategoryTools(m.id).map(tool => (
                              <ToolLink key={tool.id} tool={tool} pathname={location.pathname} onNavigate={close} compact />
                            ))}
                          </div>
                        );
                      })}
                    </div>
                    <div className="topnav-panel-footer">
                      <Link to="/recent-files" className="topnav-footer-link is-muted" onClick={close} role="menuitem">
                        <FontAwesomeIcon icon={faClockRotateLeft} aria-hidden="true" />
                        <span>Recent files</span>
                      </Link>
                      <Link to={ALL_TOOLS_HASH_LINK} className="topnav-footer-link" onClick={close} role="menuitem">
                        <FontAwesomeIcon icon={faTableCellsLarge} aria-hidden="true" />
                        <span>Browse all {TOOLS_DATA.length} tools</span>
                        <FontAwesomeIcon icon={faArrowRight} className="topnav-footer-arrow" aria-hidden="true" />
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={`topnav-tool-grid ${menu.columns === 2 ? 'cols-2' : ''}`}>
                      {tools.map(tool => (
                        <ToolLink key={tool.id} tool={tool} pathname={location.pathname} onNavigate={close} />
                      ))}
                    </div>
                    {cat && (
                      <div className="topnav-panel-footer">
                        <Link to={cat.path} className="topnav-footer-link" onClick={close} role="menuitem">
                          <span>View all {cat.label}</span>
                          <FontAwesomeIcon icon={faArrowRight} className="topnav-footer-arrow" aria-hidden="true" />
                        </Link>
                      </div>
                    )}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Mobile/tablet slide-down navigation with accordion categories.
 */
export function MobileNavPanel({ isOpen, onClose }) {
  const location = useLocation();
  const [expandedId, setExpandedId] = useState(null);

  // Expand the category containing the current page when the panel opens
  useEffect(() => {
    if (!isOpen) return;
    const current = NAV_MENUS.find(m => !m.mega && isMenuActive(m, location.pathname, location.hash));
    setExpandedId(current ? current.id : null);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    onClose();
  }, [location.pathname, location.hash]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    const handleResize = () => {
      if (window.innerWidth > 1100) onClose();
    };
    document.addEventListener('keydown', handleKey);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, onClose]);

  return (
    <>
      <div
        className={`mobile-nav-backdrop ${isOpen ? 'is-open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <nav
        id="mobile-nav-panel"
        className={`mobile-nav-panel ${isOpen ? 'is-open' : ''}`}
        aria-label="PDF tools"
        inert={!isOpen ? '' : undefined}
      >
        <div className="mobile-nav-scroll">
          {NAV_MENUS.filter(m => !m.mega).map(menu => {
            const cat = getCategory(menu.id);
            const expanded = expandedId === menu.id;
            const active = isMenuActive(menu, location.pathname, location.hash);
            return (
              <div key={menu.id} className={`mobile-nav-group ${expanded ? 'is-expanded' : ''}`}>
                <button
                  type="button"
                  className={`mobile-nav-group-btn ${active ? 'is-active' : ''}`}
                  aria-expanded={expanded}
                  onClick={() => setExpandedId(expanded ? null : menu.id)}
                >
                  <span className="mobile-nav-group-icon" aria-hidden="true">
                    <FontAwesomeIcon icon={cat.icon} />
                  </span>
                  <span className="mobile-nav-group-label">{menu.label}</span>
                  <FontAwesomeIcon icon={faChevronDown} className="topnav-chevron" aria-hidden="true" />
                </button>
                <div className="mobile-nav-group-body">
                  <div className="mobile-nav-group-inner">
                    {getCategoryTools(menu.id).map(tool => (
                      <ToolLink key={tool.id} tool={tool} pathname={location.pathname} onNavigate={onClose} compact />
                    ))}
                    <Link to={cat.path} className="mobile-nav-viewall" onClick={onClose}>
                      View all {cat.label}
                      <FontAwesomeIcon icon={faArrowRight} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="mobile-nav-divider" />

          <Link to={ALL_TOOLS_HASH_LINK} className="mobile-nav-link" onClick={onClose}>
            <FontAwesomeIcon icon={faTableCellsLarge} aria-hidden="true" />
            <span>All Tools</span>
          </Link>
          <Link
            to="/recent-files"
            className={`mobile-nav-link ${location.pathname === '/recent-files' ? 'is-active' : ''}`}
            onClick={onClose}
          >
            <FontAwesomeIcon icon={faClockRotateLeft} aria-hidden="true" />
            <span>Recent Files</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
