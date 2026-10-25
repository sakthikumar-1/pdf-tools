import React, { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMagnifyingGlass,
  faXmark,
  faWandMagicSparkles,
  faArrowRight,
  faFilePdf,
  faLayerGroup,
  faShieldHalved,
  faBolt,
  faFilterCircleXmark
} from '@fortawesome/free-solid-svg-icons';
import ToolCard from '../components/ToolCard';
import { TOOLS_DATA, TOOL_CATEGORIES, filterTools } from '../utils/toolsData';
import './Home.css';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const searchInputRef = useRef(null);

  // Filtered tools based on search and selected category
  const filteredTools = useMemo(() => {
    return filterTools(searchQuery, activeCategory);
  }, [searchQuery, activeCategory]);

  const handleClearSearch = () => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  const scrollToTools = () => {
    const el = document.getElementById('tools-catalog');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="home-page">
      {/* 1. HERO SECTION */}
      <section className="hero-section">
        <div className="container hero-layout">
          <div className="hero-content">
            <span className="hero-kicker">
              <FontAwesomeIcon icon={faShieldHalved} className="kicker-icon" />
              <span>100% Free &amp; Private Document Processing</span>
            </span>

            <h1 className="hero-title">
              Powerful PDF Tools <br />
              <span className="hero-title-accent">for Everyone</span>
            </h1>

            <p className="hero-description">
              Fast, privacy-first PDF utility suite. Convert, merge, compress, protect, and analyze your documents instantly with client-side privacy and dedicated high-speed engines.
            </p>

            {/* Prominent Search Bar */}
            <div className="hero-search-container" id="home-search">
              <div className="hero-search-bar">
                <FontAwesomeIcon icon={faMagnifyingGlass} className="search-icon" />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="search-input"
                  placeholder="Search 19 PDF tools (e.g. Word, Compress, Merge, JPG, Protect)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search PDF tools"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="search-clear"
                    onClick={handleClearSearch}
                    aria-label="Clear search query"
                  >
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                )}
              </div>

              {/* Quick Keywords */}
              <div className="search-tags">
                <span className="tags-label">Quick filter:</span>
                {['Word', 'JPG', 'Merge', 'Compress', 'Excel', 'Protect', 'Summarizer'].map((kw) => (
                  <button
                    key={kw}
                    type="button"
                    className={`tag-chip ${searchQuery.toLowerCase() === kw.toLowerCase() ? 'active' : ''}`}
                    onClick={() => setSearchQuery(kw)}
                  >
                    {kw}
                  </button>
                ))}
              </div>
            </div>

            {/* Primary & Secondary CTAs */}
            <div className="hero-actions">
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={scrollToTools}
              >
                <span>Explore Tools</span>
                <FontAwesomeIcon icon={faArrowRight} />
              </button>

              <Link to="/ai-summarizer" className="btn btn-secondary btn-lg">
                <FontAwesomeIcon icon={faWandMagicSparkles} style={{ color: 'var(--color-gold)' }} />
                <span>Try AI Summarizer</span>
              </Link>
            </div>
          </div>

          {/* Restrained Visual Illustration */}
          <div className="hero-graphic" aria-hidden="true">
            <div className="graphic-card">
              <div className="graphic-card-header">
                <div className="graphic-doc-badge">
                  <FontAwesomeIcon icon={faFilePdf} />
                  <span>PDF Suite</span>
                </div>
                <div className="graphic-dots">
                  <span></span><span></span><span></span>
                </div>
              </div>
              <div className="graphic-card-body">
                <div className="graphic-metric-row">
                  <span className="metric-label">19 Document Utilities</span>
                  <span className="metric-value">Active</span>
                </div>
                <div className="graphic-bar-track">
                  <div className="graphic-bar-fill" style={{ width: '100%' }}></div>
                </div>
                <div className="graphic-features-list">
                  <div className="graphic-feature-pill">
                    <FontAwesomeIcon icon={faBolt} /> Zero Sign-Up Required
                  </div>
                  <div className="graphic-feature-pill">
                    <FontAwesomeIcon icon={faShieldHalved} /> Client-Side Privacy
                  </div>
                  <div className="graphic-feature-pill">
                    <FontAwesomeIcon icon={faWandMagicSparkles} /> Gemini AI Summaries
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PDF TOOLS CATALOG SECTION */}
      <section className="catalog-section" id="tools-catalog">
        <div className="container">
          <div className="catalog-header">
            <div className="catalog-heading-box">
              <h2 className="catalog-title">
                {searchQuery ? `Search Results (${filteredTools.length})` : 'All PDF Utilities'}
              </h2>
              <p className="catalog-subtitle">
                {searchQuery
                  ? `Showing PDF tools matching "${searchQuery}"`
                  : 'Select any tool to process your document immediately'}
              </p>
            </div>

            {/* Compact Category Tabs Filter */}
            <div className="category-tabs" role="tablist">
              {TOOL_CATEGORIES.map((cat) => {
                const count = cat.id === 'all'
                  ? TOOLS_DATA.length
                  : TOOLS_DATA.filter((t) => t.category === cat.id).length;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    role="tab"
                    aria-selected={activeCategory === cat.id}
                    className={`category-tab-btn ${activeCategory === cat.id ? 'active' : ''}`}
                    onClick={() => setActiveCategory(cat.id)}
                  >
                    {cat.icon && <FontAwesomeIcon icon={cat.icon} className="tab-fa-icon" />}
                    <span>{cat.label}</span>
                    <span className="tab-count">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tools Grid or Empty State */}
          {filteredTools.length > 0 ? (
            <div className="tools-grid">
              {filteredTools.map((tool) => (
                <ToolCard
                  key={tool.id}
                  title={tool.title}
                  description={tool.description}
                  icon={tool.icon}
                  path={tool.path}
                  badge={tool.badge}
                  badgeType={tool.badgeType}
                />
              ))}
            </div>
          ) : (
            <div className="empty-results-box">
              <div className="empty-icon-wrapper">
                <FontAwesomeIcon icon={faFilterCircleXmark} />
              </div>
              <h3 className="empty-title">No PDF utilities found</h3>
              <p className="empty-desc">
                No tools match &ldquo;<strong>{searchQuery}</strong>&rdquo; in the selected category.
              </p>
              <div className="empty-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleClearSearch}
                >
                  Clear search and show all tools
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 3. AI SUMMARIZER PROMOTION SECTION */}
      <section className="ai-promo-section">
        <div className="container">
          <div className="ai-promo-card">
            <div className="ai-promo-content">
              <span className="ai-promo-kicker">
                <FontAwesomeIcon icon={faWandMagicSparkles} />
                <span>Next-Generation Document Intelligence</span>
              </span>
              <h2 className="ai-promo-title">
                Summarize 100+ Page Reports in Seconds
              </h2>
              <p className="ai-promo-description">
                Harness Google Gemini intelligence to extract executive overviews, key takeaways, and section-by-section summaries from lengthy PDFs with complete accuracy.
              </p>
              <div className="ai-promo-actions">
                <Link to="/ai-summarizer" className="btn btn-primary btn-lg">
                  <FontAwesomeIcon icon={faWandMagicSparkles} />
                  <span>Summarize a PDF Now</span>
                </Link>
              </div>
            </div>

            <div className="ai-promo-badge-box">
              <div className="ai-stat-chip">
                <span className="stat-number">4 Modes</span>
                <span className="stat-sub">Quick • Detailed • Key Points • Sections</span>
              </div>
              <div className="ai-stat-chip">
                <span className="stat-number">Map-Reduce</span>
                <span className="stat-sub">Multi-chunk synthesis for long PDFs</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SECURITY & PRIVACY SECTION (Anchor for Footer link) */}
      <section className="security-section" id="security-section">
        <div className="container">
          <div className="security-banner-card">
            <div className="security-badge-icon">
              <FontAwesomeIcon icon={faShieldHalved} />
            </div>
            <div className="security-banner-text">
              <h3 className="security-banner-title">Zero File Storage &amp; 15-Minute Auto-Erasure</h3>
              <p className="security-banner-desc">
                Your privacy is guaranteed. In-browser utilities (Merge, Compress, Split, Rotate, Remove Pages, and Images to PDF) execute locally on your machine. Server conversions (Word, PowerPoint, and Page Numbering) run in isolated temporary containers that are permanently purged after 15 minutes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FAQ SECTION (Anchor for Header & Footer Help links) */}
      <section className="faq-section" id="faq-section">
        <div className="container">
          <div className="faq-header">
            <h2 className="faq-title">Frequently Asked Questions</h2>
            <p className="faq-subtitle">Everything you need to know about Simatrix PDF Tools</p>
          </div>

          <div className="faq-grid">
            <div className="faq-card">
              <h3 className="faq-question">Are the PDF utilities completely free?</h3>
              <p className="faq-answer">
                Yes. All 18 conversion and manipulation utilities, as well as the AI Summarizer, are free to use without requiring a subscription or sign-up.
              </p>
            </div>
            <div className="faq-card">
              <h3 className="faq-question">Is my document data private?</h3>
              <p className="faq-answer">
                Absolutely. We do not harvest, index, sell, or retain your files. Files processed on the server are purged automatically after 15 minutes.
              </p>
            </div>
            <div className="faq-card">
              <h3 className="faq-question">What is the maximum file size?</h3>
              <p className="faq-answer">
                You can upload documents up to 50MB for standard PDF conversions and up to 25MB (up to 100 pages) for the AI PDF Summarizer.
              </p>
            </div>
            <div className="faq-card">
              <h3 className="faq-question">How does the AI PDF Summarizer work?</h3>
              <p className="faq-answer">
                The summarizer extracts the clean digital text layer of your PDF, validates page structures, and synthesizes summaries via Google Gemini models using single-pass or Map-Reduce chunking.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
