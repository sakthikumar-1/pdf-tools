import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMagnifyingGlass,
  faXmark,
  faArrowRight,
  faFilterCircleXmark,
  faShieldHalved,
  faWandMagicSparkles,
  faCircleCheck,
  faLock,
  faBolt,
  faChevronDown,
  faChevronUp,
  faCloudArrowUp,
  faDownload,
  faFileLines
} from '@fortawesome/free-solid-svg-icons';
import ToolCard from '../components/ToolCard';
import { TOOLS_DATA, TOOL_CATEGORIES, filterTools } from '../utils/toolsData';
import './Home.css';

const QUICK_TAGS = ['Word', 'JPG', 'Merge', 'Compress', 'Excel', 'Protect', 'Split', 'Summarizer'];
const POPULAR_TOOL_IDS = ['pdf-to-word', 'pdf-to-jpg', 'merge-pdf', 'compress-pdf'];

const FAQ_ITEMS = [
  {
    q: 'Are Simatrix PDF tools completely free to use?',
    a: 'Yes. All 19 document utilities are 100% free with no hidden paywalls, subscriptions, or credit card requirements. There are no daily usage limits.'
  },
  {
    q: 'How is my privacy and document security handled?',
    a: 'We prioritize document confidentiality. Client-first tools (including Merge, Split, Reorder, Remove Pages, and client conversions) process files locally in your browser. For server-assisted tools, your files are processed in isolated memory and automatically erased within 15 minutes.'
  },
  {
    q: 'What is the maximum file size supported?',
    a: 'You can upload documents up to 50 MB per file, which comfortably accommodates long reports, multi-chapter books, and high-resolution scanned presentations.'
  },
  {
    q: 'How does the AI PDF Summarizer work?',
    a: 'The AI summarizer extracts text from your PDF and utilizes Google Gemini to deliver structured executive summaries, key bullet points, and actionable takeaways in seconds without requiring registration.'
  }
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [openFaq, setOpenFaq] = useState(0); // First FAQ open by default
  const searchInputRef = useRef(null);
  const navigate = useNavigate();

  // Filtered tools based on search and selected category
  const filteredTools = useMemo(() => {
    return filterTools(searchQuery, activeCategory);
  }, [searchQuery, activeCategory]);

  // Popular tools list
  const popularTools = useMemo(() => {
    return TOOLS_DATA.filter((t) => POPULAR_TOOL_IDS.includes(t.id));
  }, []);

  // Category counts
  const getCategoryCount = (categoryId) => {
    if (categoryId === 'all') return TOOLS_DATA.length;
    return TOOLS_DATA.filter((t) => t.category === categoryId).length;
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  const handleTagClick = (tag) => {
    setSearchQuery(tag);
    setActiveCategory('all');
    const catalogEl = document.getElementById('tools-catalog');
    if (catalogEl) {
      catalogEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (!query) return;

    // Direct match by title or id
    const match = TOOLS_DATA.find((t) =>
      t.title.toLowerCase() === query ||
      t.id.toLowerCase() === query ||
      t.title.toLowerCase().includes(query) ||
      t.keywords?.some((k) => k.toLowerCase() === query || query.includes(k.toLowerCase()))
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
      {/* 1. HERO SECTION */}
      <section className="dashboard-hero" aria-label="Hero Section">
        <div className="section-container hero-container">
          <div className="hero-content-col">
            <div className="hero-badge-pill">
              <FontAwesomeIcon icon={faShieldHalved} className="hero-badge-icon" />
              <span>100% Free & Private Document Processing</span>
            </div>

            <h1 className="hero-main-title">
              Powerful PDF Tools <span className="hero-red-accent">for Everyone</span>
            </h1>

            <p className="hero-main-subtitle">
              Fast, privacy-first PDF utility suite. Convert, merge, split, compress, protect, and analyze your documents instantly with client-side privacy and dedicated high-speed engines.
            </p>

            {/* Tool Search Bar */}
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
                      No tools found matching &ldquo;{searchQuery}&rdquo;.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Filter Tags */}
            <div className="hero-quick-tags" aria-label="Popular search shortcuts">
              <span className="tags-label">Popular:</span>
              <div className="tags-list">
                {QUICK_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="hero-tag-btn"
                    onClick={() => handleTagClick(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="hero-action-buttons">
              <a href="#tools-catalog" className="btn btn-hero-primary">
                <span>Explore Tools</span>
                <FontAwesomeIcon icon={faArrowRight} />
              </a>
              <Link to="/ai-summarizer" className="btn btn-hero-secondary">
                <FontAwesomeIcon icon={faWandMagicSparkles} className="hero-ai-icon" />
                <span>Try AI Summarizer</span>
              </Link>
            </div>

            {/* Feature Perks Bar */}
            <div className="hero-perks-row">
              <div className="hero-perk-item">
                <FontAwesomeIcon icon={faCircleCheck} className="perk-check-icon" />
                <span>Zero Sign-Up Required</span>
              </div>
              <div className="hero-perk-item">
                <FontAwesomeIcon icon={faCircleCheck} className="perk-check-icon" />
                <span>Automatic 15-Min File Erasure</span>
              </div>
              <div className="hero-perk-item">
                <FontAwesomeIcon icon={faCircleCheck} className="perk-check-icon" />
                <span>Lossless Quality</span>
              </div>
            </div>
          </div>

          {/* Right Status Card (Desktop) */}
          <div className="hero-status-col">
            <div className="hero-status-card">
              <div className="status-card-header">
                <span className="status-kicker">PDF SUITE</span>
                <h3 className="status-title">19 Document Utilities</h3>
                <span className="status-indicator">
                  <span className="status-dot"></span> Active & Ready
                </span>
              </div>
              <div className="status-card-body">
                <div className="status-item">
                  <div className="status-item-icon">
                    <FontAwesomeIcon icon={faBolt} />
                  </div>
                  <div className="status-item-text">
                    <strong>Zero Sign-Up Required</strong>
                    <p>Instant anonymous access to all features</p>
                  </div>
                </div>
                <div className="status-item">
                  <div className="status-item-icon">
                    <FontAwesomeIcon icon={faShieldHalved} />
                  </div>
                  <div className="status-item-text">
                    <strong>Client-Side Privacy</strong>
                    <p>In-browser WebAssembly & zero tracking</p>
                  </div>
                </div>
                <div className="status-item">
                  <div className="status-item-icon">
                    <FontAwesomeIcon icon={faWandMagicSparkles} />
                  </div>
                  <div className="status-item-text">
                    <strong>Gemini AI Summaries</strong>
                    <p>Executive briefs from 100+ page PDFs</p>
                  </div>
                </div>
              </div>
              <div className="status-card-footer">
                <a href="#tools-catalog" className="status-browse-link">
                  Browse complete directory <FontAwesomeIcon icon={faArrowRight} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. POPULAR TOOLS SHORTCUTS */}
      {!searchQuery && (
        <section className="popular-tools-section" id="popular-tools" aria-label="Popular Tools">
          <div className="section-container">
            <div className="section-header-compact">
              <div className="header-titles">
                <h2 className="section-title">Popular Tools</h2>
                <p className="section-subtitle">
                  Fast shortcuts to our most frequently used utilities
                </p>
              </div>
              <a href="#tools-catalog" className="header-see-all-link">
                View all 19 tools <FontAwesomeIcon icon={faArrowRight} />
              </a>
            </div>

            <div className="popular-tools-grid">
              {popularTools.map((tool) => (
                <ToolCard
                  key={tool.id}
                  title={tool.title}
                  description={tool.description}
                  icon={tool.icon}
                  iconColor={tool.iconColor}
                  path={tool.path}
                  badge="POPULAR"
                  badgeType="primary"
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 3. COMPLETE ALL PDF UTILITIES CATALOG */}
      <section className="all-tools-section" id="tools-catalog" aria-label="All PDF Utilities">
        <div className="section-container">
          <div className="catalog-header-row">
            <div className="catalog-title-col">
              <h2 className="section-title">
                {searchQuery ? `Search Results (${filteredTools.length})` : 'All PDF Utilities'}
              </h2>
              <p className="section-subtitle">
                {searchQuery
                  ? `Showing matches for "${searchQuery}"`
                  : 'Explore the complete collection of 19 tools for editing, converting, and securing documents'}
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="category-pills-row" role="tablist" aria-label="Filter by category">
              {TOOL_CATEGORIES.map((cat) => {
                const count = getCategoryCount(cat.id);
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
                    <span className="category-count-badge">{count}</span>
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

      {/* 4. HOW IT WORKS SECTION */}
      <section className="how-it-works-section" id="how-it-works" aria-label="How it works">
        <div className="section-container">
          <div className="section-header-centered">
            <h2 className="section-title">How Simatrix PDF Works</h2>
            <p className="section-subtitle">
              Three simple steps to process your PDF files quickly and securely
            </p>
          </div>

          <div className="how-it-works-grid">
            <div className="how-step-card">
              <div className="how-step-badge">01</div>
              <div className="how-step-icon">
                <FontAwesomeIcon icon={faFileLines} />
              </div>
              <h3 className="how-step-title">Choose a Utility</h3>
              <p className="how-step-desc">
                Pick from 19 specialized tools for organizing, converting, compressing, or securing your PDFs.
              </p>
            </div>

            <div className="how-step-card">
              <div className="how-step-badge">02</div>
              <div className="how-step-icon">
                <FontAwesomeIcon icon={faCloudArrowUp} />
              </div>
              <h3 className="how-step-title">Upload Documents</h3>
              <p className="how-step-desc">
                Drag & drop your files. Many tools process entirely inside your browser for instant speed and complete privacy.
              </p>
            </div>

            <div className="how-step-card">
              <div className="how-step-badge">03</div>
              <div className="how-step-icon">
                <FontAwesomeIcon icon={faDownload} />
              </div>
              <h3 className="how-step-title">Download & Done</h3>
              <p className="how-step-desc">
                Get your processed files immediately. Server-processed files are permanently erased within 15 minutes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. AI SPOTLIGHT PROMOTION BANNER */}
      <section className="ai-spotlight-section" aria-label="AI Document Intelligence">
        <div className="section-container">
          <div className="ai-spotlight-card">
            <div className="ai-spotlight-content">
              <span className="ai-spotlight-kicker">
                <FontAwesomeIcon icon={faWandMagicSparkles} /> AI DOCUMENT INTELLIGENCE
              </span>
              <h3 className="ai-spotlight-title">Summarize 100+ Page Reports in Seconds</h3>
              <p className="ai-spotlight-desc">
                Harness Google Gemini AI to analyze complex PDF contracts, financial statements, research papers, and books. Generate executive summaries, key takeaways, and action items instantly.
              </p>
              <Link to="/ai-summarizer" className="btn btn-hero-primary ai-cta-btn">
                <span>Summarize a PDF Now</span>
                <FontAwesomeIcon icon={faArrowRight} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. BANK-GRADE PRIVACY & SECURITY SECTION */}
      <section className="privacy-guarantee-section" aria-label="Privacy and Security">
        <div className="section-container">
          <div className="privacy-card">
            <div className="privacy-header">
              <div className="privacy-badge">
                <FontAwesomeIcon icon={faShieldHalved} />
                <span>BANK-GRADE PRIVACY</span>
              </div>
              <h3 className="privacy-title">Zero File Storage & 15-Minute Auto-Erasure</h3>
              <p className="privacy-subtitle">
                Your documents belong solely to you. We engineered our platform with a privacy-by-design architecture.
              </p>
            </div>

            <div className="privacy-features-grid">
              <div className="privacy-feature-item">
                <div className="privacy-feat-icon">
                  <FontAwesomeIcon icon={faLock} />
                </div>
                <div className="privacy-feat-body">
                  <h4>Client-Side Execution</h4>
                  <p>Many tools run directly in your browser using WebAssembly. Files never touch a remote server.</p>
                </div>
              </div>

              <div className="privacy-feature-item">
                <div className="privacy-feat-icon">
                  <FontAwesomeIcon icon={faBolt} />
                </div>
                <div className="privacy-feat-body">
                  <h4>15-Minute Auto-Purge</h4>
                  <p>Files uploaded for heavy server conversions are permanently erased from memory after 15 minutes.</p>
                </div>
              </div>

              <div className="privacy-feature-item">
                <div className="privacy-feat-icon">
                  <FontAwesomeIcon icon={faCircleCheck} />
                </div>
                <div className="privacy-feat-body">
                  <h4>100% Confidential</h4>
                  <p>No tracking, no data harvesting, no ads, and no selling of document contents.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FAQ ACCORDION SECTION */}
      <section className="faq-section" id="faqs" aria-label="Frequently Asked Questions">
        <div className="section-container">
          <div className="section-header-centered">
            <h2 className="section-title">Frequently Asked Questions</h2>
            <p className="section-subtitle">
              Everything you need to know about Simatrix PDF Tools
            </p>
          </div>

          <div className="faq-accordion-container">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={index} className={`faq-accordion-item ${isOpen ? 'open' : ''}`}>
                  <button
                    type="button"
                    className="faq-question-btn"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    aria-expanded={isOpen}
                  >
                    <span className="faq-question-text">{item.q}</span>
                    <FontAwesomeIcon
                      icon={isOpen ? faChevronUp : faChevronDown}
                      className="faq-chevron-icon"
                    />
                  </button>
                  {isOpen && (
                    <div className="faq-answer-panel">
                      <p>{item.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
