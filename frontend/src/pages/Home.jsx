import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMagnifyingGlass,
  faXmark,
  faArrowRight,
  faWandMagicSparkles,
  faFilterCircleXmark,
  faFileLines,
  faShieldHalved,
  faTrashCan,
  faLock,
  faChevronDown
} from '@fortawesome/free-solid-svg-icons';
import ToolCard from '../components/ToolCard';
import { TOOLS_DATA, TOOL_CATEGORIES, filterTools } from '../utils/toolsData';
import './Home.css';

const POPULAR_TOOL_IDS = ['pdf-to-word', 'pdf-to-jpg', 'merge-pdf', 'compress-pdf'];

const FAQ_ITEMS = [
  {
    question: 'Are Simatrix PDF tools free?',
    answer: 'Yes, all 19 tools are 100% free with no hidden fees, subscriptions, or watermarks.'
  },
  {
    question: 'How are uploaded documents handled?',
    answer: 'Files are processed client-side via WebAssembly where possible, or automatically deleted from temporary memory immediately after conversion.'
  },
  {
    question: 'What is the maximum supported file size?',
    answer: 'You can upload documents up to 50MB per file for instant, high-speed processing.'
  },
  {
    question: 'Can I convert scanned PDFs?',
    answer: 'Yes, our conversion engines preserve text and embedded images accurately across all document formats.'
  },
  {
    question: 'Do I need to create an account?',
    answer: 'No sign-up is required to use any of our 19 PDF utilities. You can use all tools instantly.'
  },
  {
    question: 'Can I use Simatrix PDF on mobile?',
    answer: 'Yes, the interface is fully responsive and works smoothly on smartphones, tablets, and laptops.'
  },
  {
    question: 'How does AI summarization work?',
    answer: 'Our AI analyzes document content to extract key highlights, important dates, and concise executive summaries.'
  }
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const searchInputRef = useRef(null);
  const navigate = useNavigate();

  // Filtered tools based on search and selected category
  const filteredTools = useMemo(() => {
    return filterTools(searchQuery, activeCategory);
  }, [searchQuery, activeCategory]);

  // Popular tools list (4 cards)
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

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (!query) return;

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

  const toggleFaq = (index) => {
    setOpenFaqIndex((prev) => (prev === index ? null : index));
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
    <div className="home-dashboard-page">
      <div className="home-main-grid">
        {/* ====================================================================
            LEFT / MAIN COLUMN (Hero, Popular Tools, All Utilities, How It Works)
            ==================================================================== */}
        <div className="home-main-column">
          {/* 1. HERO SECTION WITH STATS HIGHLIGHTS */}
          <section className="home-hero-card" aria-label="Hero Section">
            <div className="hero-content-split">
              <div className="hero-text-block">
                <span className="hero-kicker-label">FREE ONLINE PDF TOOLS</span>
                <h1 className="hero-headline">
                  Every PDF Task.<br />
                  <span className="hero-headline-red">One Simple Workspace.</span>
                </h1>
                <p className="hero-subtext">
                  Convert, merge, compress, edit, and summarize PDFs with free online tools designed for speed, simplicity, and privacy.
                </p>

                {/* Hero Search Box */}
                <form className="hero-search-form" onSubmit={handleSearchSubmit}>
                  <FontAwesomeIcon icon={faMagnifyingGlass} className="hero-search-icon" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="hero-search-input"
                    placeholder="Search PDF tools (e.g. merge, compress, to word...)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                    aria-label="Search PDF tools"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="hero-search-clear"
                      onClick={handleClearSearch}
                      aria-label="Clear search"
                    >
                      <FontAwesomeIcon icon={faXmark} />
                    </button>
                  )}
                  <button type="submit" className="hero-search-submit-btn" aria-label="Search">
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                  </button>

                  {/* Instant Search Suggestions Dropdown */}
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
                </form>

                {/* Hero Action Buttons */}
                <div className="hero-buttons-row">
                  <a href="#all-tools" className="btn btn-primary hero-btn-primary">
                    <span>Explore Tools</span>
                    <FontAwesomeIcon icon={faArrowRight} />
                  </a>
                  <Link to="/ai-summarizer" className="btn btn-secondary hero-btn-secondary">
                    <span>Try AI Summarizer</span>
                  </Link>
                </div>
              </div>

              {/* Hero Features Highlight (Right side of Hero Card) */}
              <div className="hero-stats-panel" aria-label="Key Platform Features">
                <div className="hero-stat-item">
                  <div className="hero-stat-icon-box">
                    <FontAwesomeIcon icon={faFileLines} />
                  </div>
                  <div className="hero-stat-info">
                    <span className="hero-stat-title">19 PDF Utilities</span>
                    <span className="hero-stat-desc">Multiple PDF tools in one place.</span>
                  </div>
                </div>

                <div className="hero-stat-item">
                  <div className="hero-stat-icon-box">
                    <FontAwesomeIcon icon={faWandMagicSparkles} />
                  </div>
                  <div className="hero-stat-info">
                    <span className="hero-stat-title">AI-Powered Document Tools</span>
                    <span className="hero-stat-desc">Summarize, extract key points and more.</span>
                  </div>
                </div>

                <div className="hero-stat-item">
                  <div className="hero-stat-icon-box">
                    <FontAwesomeIcon icon={faShieldHalved} />
                  </div>
                  <div className="hero-stat-info">
                    <span className="hero-stat-title">Privacy-Focused Processing</span>
                    <span className="hero-stat-desc">Your files are processed securely.</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 2. POPULAR TOOLS (Four Cards) */}
          <section className="home-popular-section" aria-label="Popular Tools">
            <div className="section-title-row">
              <div>
                <h2 className="section-title-heading">Popular Tools</h2>
                <p className="section-subtitle-text">Most used PDF tools to get your work done faster.</p>
              </div>
              <a href="#all-tools" className="section-view-all-link">
                <span>View All Tools</span>
                <FontAwesomeIcon icon={faArrowRight} />
              </a>
            </div>

            <div className="popular-tools-grid">
              {popularTools.map((tool) => (
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
          </section>

          {/* 3. ALL PDF UTILITIES WITH CATEGORY FILTERS */}
          <section className="home-all-tools-section" id="all-tools" aria-label="All PDF Utilities">
            <div className="section-title-row">
              <div>
                <h2 className="section-title-heading">All PDF Utilities</h2>
                <p className="section-subtitle-text">Everything you need to work with PDF documents.</p>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="category-filter-pills" role="tablist" aria-label="Category Filters">
              {TOOL_CATEGORIES.map((cat) => {
                const count = getCategoryCount(cat.id);
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`cat-pill-button ${isActive ? 'is-active' : ''}`}
                    onClick={() => setActiveCategory(cat.id)}
                  >
                    <span>{cat.label}</span>
                    <span className="cat-pill-count">{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Clean Grid of Tools (4 columns) */}
            {filteredTools.length > 0 ? (
              <div className="all-tools-grid">
                {filteredTools.map((tool) => (
                  <ToolCard
                    key={tool.id}
                    title={tool.title}
                    description={tool.description}
                    icon={tool.icon}
                    path={tool.path}
                    variant="compact"
                    comingSoon={tool.comingSoon}
                    badge={tool.badge}
                  />
                ))}
              </div>
            ) : (
              <div className="catalog-empty-state">
                <FontAwesomeIcon icon={faFilterCircleXmark} className="empty-state-icon" />
                <h3 className="empty-state-title">No tools found</h3>
                <p className="empty-state-text">
                  No tools match &ldquo;<strong>{searchQuery}</strong>&rdquo;.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleClearSearch}
                >
                  Clear search
                </button>
              </div>
            )}
          </section>

          {/* 4. HOW SIMATRIX PDF WORKS */}
          <section className="how-it-works-section" aria-label="How Simatrix PDF Works">
            <h2 className="how-it-works-title">How Simatrix PDF Works</h2>
            <div className="how-it-works-steps">
              <div className="work-step-item">
                <span className="work-step-num">1</span>
                <div className="work-step-content">
                  <span className="work-step-heading">Choose a Utility</span>
                  <span className="work-step-desc">Pick the tool you need from our collection.</span>
                </div>
              </div>

              <div className="work-step-divider" aria-hidden="true">
                <FontAwesomeIcon icon={faArrowRight} />
              </div>

              <div className="work-step-item">
                <span className="work-step-num">2</span>
                <div className="work-step-content">
                  <span className="work-step-heading">Upload Documents</span>
                  <span className="work-step-desc">Upload your PDF file securely.</span>
                </div>
              </div>

              <div className="work-step-divider" aria-hidden="true">
                <FontAwesomeIcon icon={faArrowRight} />
              </div>

              <div className="work-step-item">
                <span className="work-step-num">3</span>
                <div className="work-step-content">
                  <span className="work-step-heading">Download & Done</span>
                  <span className="work-step-desc">Get your processed file and you&apos;re all set.</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ====================================================================
            RIGHT COLUMN (AI Summarizer Promo, Privacy Card, FAQs Accordion)
            ==================================================================== */}
        <aside className="home-side-column" aria-label="Promotions and FAQs">
          {/* Card 1: AI Summarizer Promo Panel */}
          <div className="side-card ai-side-promo-card">
            <h3 className="side-card-title">Turn Long PDFs into Clear, Useful Insights.</h3>
            <p className="side-card-desc">
              Summarize documents, extract key points, find important dates, and ask questions about your PDF using AI.
            </p>
            <Link to="/ai-summarizer" className="btn btn-primary side-card-btn">
              <span>Summarize a PDF</span>
              <FontAwesomeIcon icon={faArrowRight} />
            </Link>
          </div>

          {/* Card 2: Your Documents. Your Privacy. */}
          <div className="side-card privacy-side-card">
            <h3 className="side-card-title">Your Documents. Your Privacy.</h3>
            <div className="privacy-feature-list">
              <div className="privacy-feature-item">
                <div className="privacy-icon-box">
                  <FontAwesomeIcon icon={faShieldHalved} />
                </div>
                <div className="privacy-feature-info">
                  <span className="privacy-feature-title">Secure Processing</span>
                  <span className="privacy-feature-desc">Your files are processed safely.</span>
                </div>
              </div>

              <div className="privacy-feature-item">
                <div className="privacy-icon-box">
                  <FontAwesomeIcon icon={faTrashCan} />
                </div>
                <div className="privacy-feature-info">
                  <span className="privacy-feature-title">Automatic File Deletion</span>
                  <span className="privacy-feature-desc">Files are removed after processing.</span>
                </div>
              </div>

              <div className="privacy-feature-item">
                <div className="privacy-icon-box">
                  <FontAwesomeIcon icon={faLock} />
                </div>
                <div className="privacy-feature-info">
                  <span className="privacy-feature-title">Confidential</span>
                  <span className="privacy-feature-desc">Your documents remain private.</span>
                </div>
              </div>
            </div>
            <a href="#privacy" className="privacy-learn-more-link">
              <span>Learn more</span>
              <FontAwesomeIcon icon={faArrowRight} />
            </a>
          </div>

          {/* Card 3: Frequently Asked Questions */}
          <div className="side-card faq-side-card">
            <h3 className="side-card-title">Frequently Asked Questions</h3>
            <div className="faq-accordion-list">
              {FAQ_ITEMS.map((item, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div key={index} className={`faq-accordion-item ${isOpen ? 'is-open' : ''}`}>
                    <button
                      type="button"
                      className="faq-question-btn"
                      onClick={() => toggleFaq(index)}
                      aria-expanded={isOpen}
                    >
                      <span className="faq-question-text">{item.question}</span>
                      <FontAwesomeIcon
                        icon={faChevronDown}
                        className={`faq-chevron ${isOpen ? 'rotated' : ''}`}
                      />
                    </button>
                    {isOpen && (
                      <div className="faq-answer-panel">
                        <p>{item.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
