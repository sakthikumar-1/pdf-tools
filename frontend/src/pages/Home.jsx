import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMagnifyingGlass,
  faXmark,
  faArrowRight,
  faFilterCircleXmark
} from '@fortawesome/free-solid-svg-icons';
import ToolCard from '../components/ToolCard';
import { TOOLS_DATA, TOOL_CATEGORIES, filterTools } from '../utils/toolsData';
import './Home.css';


export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef(null);
  const navigate = useNavigate();


  // Filtered tools based on search and selected category
  const filteredTools = useMemo(() => {
    return filterTools(searchQuery, activeCategory);
  }, [searchQuery, activeCategory]);

  const handleClearSearch = () => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (!query) return;

    // Direct match by title or id
    const match = TOOLS_DATA.find(t => 
      t.title.toLowerCase() === query ||
      t.id.toLowerCase() === query ||
      t.title.toLowerCase().includes(query) ||
      t.keywords?.some(k => k.toLowerCase() === query || query.includes(k.toLowerCase()))
    );

    if (match) {
      navigate(match.path);
      return;
    }

    if (filteredTools.length > 0) {
      navigate(filteredTools[0].path);
    }
  };

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        if (searchInputRef.current && document.activeElement !== searchInputRef.current) {
          e.preventDefault();
          searchInputRef.current.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="home-dashboard">
      {/* 1. COMPACT HERO WITH SINGLE SEARCH FIELD */}
      <section className="dashboard-hero">
        <div className="section-container">
          <div className="hero-compact-header">
            <h1 className="hero-main-title">
              Powerful PDF Tools <span className="hero-gold-accent">for Everyone</span>
            </h1>
            <p className="hero-main-subtitle">
              Edit, merge, split, compress, and convert PDFs with simple, reliable tools.
            </p>
          </div>

          {/* Single Tool Search Field */}
          <div className="hero-search-wrapper">
            <form className="hero-search-box" onSubmit={handleSearchSubmit}>
              <FontAwesomeIcon icon={faMagnifyingGlass} className="hero-search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                className="hero-search-field"
                placeholder="Search PDF tools (e.g. merge, compress, word, jpg)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                aria-label="Search PDF tools"
              />

              {searchQuery ? (
                <button
                  type="button"
                  className="hero-search-clear"
                  onClick={handleClearSearch}
                  aria-label="Clear search"
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              ) : (
                <kbd className="hero-kbd-badge">Ctrl K</kbd>
              )}
            </form>

            {/* Instant Suggestions Dropdown */}
            {searchQuery.trim() && isSearchFocused && (
              <div className="hero-suggestions-dropdown" role="listbox">
                {filteredTools.slice(0, 5).map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    className="hero-suggestion-item"
                    onMouseDown={() => navigate(tool.path)}
                  >
                    <div className="suggestion-details">
                      <span className="suggestion-title">{tool.title}</span>
                      <span className="suggestion-desc">{tool.description}</span>
                    </div>
                    <FontAwesomeIcon icon={faArrowRight} className="suggestion-arrow" />
                  </button>
                ))}
                {filteredTools.length === 0 && (
                  <div className="hero-suggestion-empty">
                    No tools found matching "{searchQuery}".
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>


      {/* 3. COMPLETE TOOL CATALOG GROUPED INTO CATEGORIES */}
      <section className="all-tools-section" id="all-tools-catalog">
        <div className="section-container">
          <div className="catalog-header-row">
            <h2 className="section-title">
              {searchQuery ? `Search Results (${filteredTools.length})` : 'All PDF Tools'}
            </h2>

            {/* Category Filter Pills */}
            <div className="category-pills-row" role="tablist">
              {TOOL_CATEGORIES.map((cat) => {
                return (
                  <button
                    key={cat.id}
                    type="button"
                    role="tab"
                    aria-selected={activeCategory === cat.id}
                    className={`category-pill-btn ${activeCategory === cat.id ? 'active' : ''}`}
                    onClick={() => setActiveCategory(cat.id)}
                  >
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tools Grid or Empty State */}
          {filteredTools.length > 0 ? (
            <div className="all-tools-grid">
              {filteredTools.map((tool) => (
                <ToolCard
                  key={tool.id}
                  title={tool.title}
                  description={tool.description}
                  icon={tool.icon}
                  iconColor={tool.iconColor}
                  path={tool.path}
                  badge={tool.badge}
                  badgeType={tool.badgeType}
                />
              ))}
            </div>
          ) : (
            <div className="empty-catalog-card">
              <FontAwesomeIcon icon={faFilterCircleXmark} className="empty-catalog-icon" />
              <h3 className="empty-catalog-title">No tools found</h3>
              <p className="empty-catalog-desc">
                No tools match &ldquo;<strong>{searchQuery}</strong>&rdquo;.
              </p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleClearSearch}
              >
                Clear search and view all tools
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
