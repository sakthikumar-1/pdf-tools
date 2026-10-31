import React, { useState, useMemo } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHouse,
  faChevronRight,
  faMagnifyingGlass,
  faXmark,
  faArrowRight
} from '@fortawesome/free-solid-svg-icons';
import ToolCard from '../components/ToolCard';
import ComingSoonTool from './ComingSoonTool';
import NotFound from './NotFound';
import { getCategoryBySlug, getToolsByCategory, getToolById } from '../utils/toolsData';
import './CategoryPage.css';

export default function CategoryPage({ explicitSlug }) {
  const params = useParams();
  const slug = explicitSlug || params.categorySlug || 'organize';
  const category = getCategoryBySlug(slug);

  if (!category) {
    const matchedTool = getToolById(slug);
    if (matchedTool) {
      if (matchedTool.path && !matchedTool.comingSoon) {
        return <Navigate to={matchedTool.path} replace />;
      }
      return <ComingSoonTool toolId={matchedTool.id} />;
    }
    return <NotFound />;
  }

  const [searchQuery, setSearchQuery] = useState('');

  // Tools in this specific category
  const categoryTools = useMemo(() => {
    return getToolsByCategory(category.id || category.slug);
  }, [category]);

  // Filtered tools within the category
  const filteredTools = useMemo(() => {
    if (!searchQuery.trim()) return categoryTools;
    const q = searchQuery.toLowerCase().trim();
    return categoryTools.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      (t.keywords && t.keywords.some(k => k.toLowerCase().includes(q)))
    );
  }, [categoryTools, searchQuery]);

  return (
    <div className="category-page-container">
      {/* 1. Breadcrumbs */}
      <nav className="category-breadcrumbs" aria-label="Breadcrumb navigation">
        <Link to="/" className="breadcrumb-nav-link">
          <FontAwesomeIcon icon={faHouse} className="crumb-home-icon" />
          <span>Home</span>
        </Link>
        <FontAwesomeIcon icon={faChevronRight} className="crumb-sep" />
        <span className="crumb-parent">PDF Tools</span>
        <FontAwesomeIcon icon={faChevronRight} className="crumb-sep" />
        <span className="crumb-current">{category.label}</span>
      </nav>

      {/* 2. Category Header Hero Banner */}
      <header className="category-hero-header">
        <div className="category-hero-left">
          {category.icon && (
            <div className="category-hero-icon" aria-hidden="true">
              <FontAwesomeIcon icon={category.icon} />
            </div>
          )}
          <div className="category-hero-text">
            <div className="category-badge-line">
              <span className="category-count-badge">
                {categoryTools.length} {categoryTools.length === 1 ? 'Utility' : 'Utilities'}
              </span>
            </div>
            <h1 className="category-hero-title">{category.label}</h1>
            <p className="category-hero-desc">{category.description}</p>
          </div>
        </div>

        {/* In-category Search Input */}
        <div className="category-search-wrapper">
          <FontAwesomeIcon icon={faMagnifyingGlass} className="category-search-icon" />
          <input
            type="text"
            className="category-search-input"
            placeholder={`Search in ${category.label}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label={`Search within ${category.label}`}
          />
          {searchQuery && (
            <button
              type="button"
              className="category-search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="Clear category search"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          )}
        </div>
      </header>

      {/* 3. Grid of Tools */}
      <section className="category-tools-section" aria-label={`${category.label} Tools`}>
        {filteredTools.length > 0 ? (
          <div className="category-tools-grid">
            {filteredTools.map((tool) => (
              <ToolCard
                key={tool.id}
                title={tool.title}
                description={tool.description}
                icon={tool.icon}
                path={tool.path}
                variant="popular"
                comingSoon={tool.comingSoon}
                badge={tool.badge}
              />
            ))}
          </div>
        ) : (
          <div className="category-empty-state">
            <h3 className="empty-title">No tools found</h3>
            <p className="empty-desc">
              No utilities match &ldquo;<strong>{searchQuery}</strong>&rdquo; in {category.label}.
            </p>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setSearchQuery('')}
            >
              Reset filter
            </button>
          </div>
        )}
      </section>

      {/* 4. Category Helpful Callout */}
      <footer className="category-footer-info">
        <div className="category-info-card">
          <strong className="info-title">Need to switch category?</strong>
          <p className="info-desc">
            Explore our complete collection of 19 tools on the <Link to="/#all-tools">Home Page</Link> or use the left sidebar.
          </p>
        </div>
      </footer>
    </div>
  );
}

