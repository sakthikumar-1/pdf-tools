import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMagnifyingGlass,
  faXmark,
  faArrowRight,
  faWandMagicSparkles,
  faFilterCircleXmark,
  faShieldHalved,
  faTrashCan,
  faBolt,
  faMobileScreen,
  faGift,
  faChevronDown,
  faCloudArrowUp,
  faHandPointer,
  faDownload,
  faFilePdf,
  faCircleCheck,
  faQuoteLeft
} from '@fortawesome/free-solid-svg-icons';
import { TOOLS_DATA, TOOL_CATEGORIES, filterTools } from '../utils/toolsData';
import './Home.css';

const QUICK_TOOL_IDS = ['merge-pdf', 'compress-pdf', 'pdf-to-word', 'edit-pdf', 'sign-pdf', 'ai-summarizer'];
const POPULAR_TOOL_IDS = ['pdf-to-word', 'pdf-to-jpg', 'merge-pdf', 'compress-pdf'];

// Accent class per category, used to tint tool icon tiles
const CATEGORY_ACCENTS = {
  'organize-pdf': 'accent-organize',
  'convert-pdf': 'accent-convert',
  'compress-pdf': 'accent-compress',
  'security-protect': 'accent-secure',
  'ai-tools': 'accent-ai'
};

const AI_TOOL_COUNT = TOOLS_DATA.filter((t) => t.category === 'ai-tools').length;
const CORE_TOOL_COUNT = TOOLS_DATA.length - AI_TOOL_COUNT;

const TRUST_ITEMS = [
  { icon: faTrashCan, label: 'Files auto-deleted after processing' },
  { icon: faShieldHalved, label: 'Secure, private processing' },
  { icon: faGift, label: 'Free, no watermarks' },
  { icon: faMobileScreen, label: 'Works on any device' }
];

const STEPS = [
  { icon: faHandPointer, title: 'Choose a tool', desc: 'Pick from organize, convert, compress, edit, or AI tools.' },
  { icon: faCloudArrowUp, title: 'Upload your PDF', desc: 'Drag and drop a file up to 50MB. Many tools run right in your browser.' },
  { icon: faDownload, title: 'Download the result', desc: 'Get your processed file in seconds. Uploads are cleaned up automatically.' }
];

const FEATURES = [
  {
    icon: faShieldHalved,
    title: 'Privacy first',
    desc: 'Many tools process files locally in your browser. Server uploads are deleted automatically after processing.'
  },
  {
    icon: faBolt,
    title: 'Fast by design',
    desc: 'Lightweight, optimized engines handle conversions and edits in seconds, not minutes.'
  },
  {
    icon: faGift,
    title: 'Free to use',
    desc: 'Core PDF tools are free with no watermarks and no account required.'
  },
  {
    icon: faWandMagicSparkles,
    title: 'AI when you need it',
    desc: 'Summarize, translate, compare, and chat with documents using built-in AI tools.'
  }
];

const FAQ_ITEMS = [
  {
    question: 'Are these PDF tools free?',
    answer: `Yes. All ${CORE_TOOL_COUNT} core PDF tools are free with no hidden fees, subscriptions, or watermarks. AI tools include free credits with a Google sign-in.`
  },
  {
    question: 'How are uploaded documents handled?',
    answer: 'Files are processed client-side in your browser where possible. Files sent to our servers are deleted automatically shortly after processing.'
  },
  {
    question: 'What is the maximum supported file size?',
    answer: 'You can upload documents up to 50MB per file.'
  },
  {
    question: 'Do I need to create an account?',
    answer: 'No account is needed for the core PDF tools. AI tools require a quick, free Google sign-in so we can manage usage credits.'
  },
  {
    question: 'Can I use it on mobile?',
    answer: 'Yes. The interface is fully responsive and works on smartphones, tablets, and laptops.'
  },
  {
    question: 'How does AI summarization work?',
    answer: 'The AI reads your document text and produces concise summaries, key points, and answers with page citations so you can verify every claim.'
  }
];

function getAccentClass(tool) {
  return CATEGORY_ACCENTS[tool.category] || 'accent-organize';
}

function HomeToolCard({ tool }) {
  const accent = getAccentClass(tool);
  const isPopular = POPULAR_TOOL_IDS.includes(tool.id);
  const inner = (
    <>
      <div className="hp-card-top">
        <span className={`hp-card-icon ${accent}`} aria-hidden="true">
          <FontAwesomeIcon icon={tool.icon} />
        </span>
        {tool.comingSoon ? (
          <span className="hp-card-tag is-muted">Coming soon</span>
        ) : isPopular ? (
          <span className="hp-card-tag">Popular</span>
        ) : tool.category === 'ai-tools' ? (
          <span className="hp-card-tag is-ai">AI</span>
        ) : null}
      </div>
      <h3 className="hp-card-title">{tool.title}</h3>
      <p className="hp-card-desc">{tool.description}</p>
      {!tool.comingSoon && (
        <span className="hp-card-cta" aria-hidden="true">
          Open tool <FontAwesomeIcon icon={faArrowRight} />
        </span>
      )}
    </>
  );

  if (tool.comingSoon) {
    return <div className="hp-tool-card is-disabled" aria-disabled="true">{inner}</div>;
  }

  return (
    <Link to={tool.path} className="hp-tool-card">
      {inner}
    </Link>
  );
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState(0);
  const searchInputRef = useRef(null);
  const navigate = useNavigate();

  // Filtered tools based on search and selected category
  const filteredTools = useMemo(() => {
    return filterTools(searchQuery, activeCategory);
  }, [searchQuery, activeCategory]);

  const quickTools = useMemo(() => {
    return QUICK_TOOL_IDS.map((id) => TOOLS_DATA.find((t) => t.id === id)).filter(Boolean);
  }, []);

  const aiTools = useMemo(() => TOOLS_DATA.filter((t) => t.category === 'ai-tools'), []);

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

  const showSuggestions = searchQuery.trim() && isSearchFocused;

  return (
    <div className="hp-page">
      {/* 1. HERO */}
      <section className="hp-hero" aria-labelledby="hp-hero-title">
        <div className="hp-hero-bg" aria-hidden="true" />
        <div className="hp-container hp-hero-inner">
          <span className="hp-eyebrow">
            <span className="hp-eyebrow-dot" aria-hidden="true" />
            {TOOLS_DATA.length} free PDF tools &middot; No sign-up for core tools
          </span>

          <h1 id="hp-hero-title" className="hp-hero-title">
            Every PDF tool you need.
            <span className="hp-hero-title-accent">One simple workspace.</span>
          </h1>

          <p className="hp-hero-sub">
            Merge, split, compress, convert, edit, sign, and summarize PDFs online.
            Fast, private, and free.
          </p>

          {/* Search */}
          <form className={`hp-search ${showSuggestions ? 'is-open' : ''}`} onSubmit={handleSearchSubmit} role="search">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="hp-search-icon" aria-hidden="true" />
            <input
              ref={searchInputRef}
              type="text"
              className="hp-search-input"
              placeholder="Search tools, e.g. merge, compress, PDF to Word"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              aria-label="Search PDF tools"
              autoComplete="off"
            />
            {searchQuery ? (
              <button type="button" className="hp-search-clear" onClick={handleClearSearch} aria-label="Clear search">
                <FontAwesomeIcon icon={faXmark} />
              </button>
            ) : (
              <kbd className="hp-search-kbd" aria-hidden="true">Ctrl K</kbd>
            )}
            <button type="submit" className="hp-search-submit">
              Search
            </button>

            {showSuggestions && (
              <div className="hp-suggestions" role="listbox">
                {filteredTools.slice(0, 5).map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    role="option"
                    aria-selected="false"
                    className="hp-suggestion"
                    onMouseDown={() => navigate(tool.path)}
                  >
                    <span className={`hp-suggestion-icon ${getAccentClass(tool)}`} aria-hidden="true">
                      <FontAwesomeIcon icon={tool.icon} />
                    </span>
                    <span className="hp-suggestion-text">
                      <span className="hp-suggestion-title">{tool.title}</span>
                      <span className="hp-suggestion-desc">{tool.description}</span>
                    </span>
                    <FontAwesomeIcon icon={faArrowRight} className="hp-suggestion-arrow" aria-hidden="true" />
                  </button>
                ))}
                {filteredTools.length === 0 && (
                  <div className="hp-suggestion-empty">
                    No tools found matching &ldquo;{searchQuery}&rdquo;.
                  </div>
                )}
              </div>
            )}
          </form>

          {/* Quick access chips */}
          <div className="hp-quick" aria-label="Popular tools">
            <span className="hp-quick-label">Popular:</span>
            {quickTools.map((tool) => (
              <Link key={tool.id} to={tool.path} className="hp-quick-chip">
                <FontAwesomeIcon icon={tool.icon} className={`hp-quick-icon ${getAccentClass(tool)}`} aria-hidden="true" />
                <span>{tool.title.replace('AI PDF ', '')}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Trust strip */}
        <div className="hp-container">
          <ul className="hp-trust">
            {TRUST_ITEMS.map((item) => (
              <li key={item.label} className="hp-trust-item">
                <FontAwesomeIcon icon={item.icon} aria-hidden="true" />
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 2. ALL TOOLS */}
      <section className="hp-section hp-tools" id="all-tools" aria-labelledby="hp-tools-title">
        <div className="hp-container">
          <div className="hp-section-head">
            <div>
              <span className="hp-section-kicker">The toolkit</span>
              <h2 id="hp-tools-title" className="hp-section-title">All PDF tools</h2>
              <p className="hp-section-sub">Everything you need to work with PDF documents, organized by task.</p>
            </div>
          </div>

          <div className="hp-tabs" role="tablist" aria-label="Filter tools by category">
            {TOOL_CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`hp-tab ${isActive ? 'is-active' : ''}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  <FontAwesomeIcon icon={cat.icon} className="hp-tab-icon" aria-hidden="true" />
                  <span>{cat.label}</span>
                  <span className="hp-tab-count">{getCategoryCount(cat.id)}</span>
                </button>
              );
            })}
          </div>

          {searchQuery.trim() && (
            <p className="hp-filter-note">
              Showing {filteredTools.length} result{filteredTools.length === 1 ? '' : 's'} for &ldquo;{searchQuery.trim()}&rdquo;
              <button type="button" className="hp-link-btn" onClick={handleClearSearch}>Clear</button>
            </p>
          )}

          {filteredTools.length > 0 ? (
            <div className="hp-tool-grid">
              {filteredTools.map((tool) => (
                <HomeToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          ) : (
            <div className="hp-empty">
              <FontAwesomeIcon icon={faFilterCircleXmark} className="hp-empty-icon" aria-hidden="true" />
              <h3 className="hp-empty-title">No tools found</h3>
              <p className="hp-empty-text">
                No tools match &ldquo;<strong>{searchQuery}</strong>&rdquo;.
              </p>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleClearSearch}>
                Clear search
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 3. AI FEATURE BAND */}
      <section className="hp-section hp-ai-section" aria-labelledby="hp-ai-title">
        <div className="hp-container">
          <div className="hp-ai-band">
            <div className="hp-ai-copy">
              <span className="hp-ai-kicker">
                <FontAwesomeIcon icon={faWandMagicSparkles} aria-hidden="true" /> AI PDF tools
              </span>
              <h2 id="hp-ai-title" className="hp-ai-title">Turn long PDFs into clear answers.</h2>
              <p className="hp-ai-sub">
                Summarize reports, chat with your documents, translate, extract data, and compare versions.
                Every answer links back to the page it came from.
              </p>
              <ul className="hp-ai-list">
                {aiTools.slice(0, 6).map((tool) => (
                  <li key={tool.id}>
                    <Link to={tool.path} className="hp-ai-link">
                      <FontAwesomeIcon icon={tool.icon} aria-hidden="true" />
                      <span>{tool.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="hp-ai-actions">
                <Link to="/ai-summarizer" className="hp-btn hp-btn-light">
                  Summarize a PDF <FontAwesomeIcon icon={faArrowRight} />
                </Link>
                <Link to="/tools/ai" className="hp-btn hp-btn-ghost-light">
                  View all {AI_TOOL_COUNT} AI tools
                </Link>
              </div>
            </div>

            {/* Illustrative product preview */}
            <div className="hp-ai-preview" aria-hidden="true">
              <div className="hp-preview-card">
                <div className="hp-preview-head">
                  <span className="hp-preview-file">
                    <FontAwesomeIcon icon={faFilePdf} /> Annual_Report.pdf
                  </span>
                  <span className="hp-preview-meta">42 pages</span>
                </div>
                <div className="hp-preview-body">
                  <span className="hp-preview-label">Summary</span>
                  <ul className="hp-preview-points">
                    <li><FontAwesomeIcon icon={faCircleCheck} /> Revenue grew 18% year over year</li>
                    <li><FontAwesomeIcon icon={faCircleCheck} /> Operating costs reduced by 6%</li>
                    <li><FontAwesomeIcon icon={faCircleCheck} /> Two new markets launched in Q3</li>
                  </ul>
                </div>
                <div className="hp-preview-chat">
                  <div className="hp-bubble is-user">What are the main risks?</div>
                  <div className="hp-bubble is-ai">
                    <FontAwesomeIcon icon={faQuoteLeft} className="hp-bubble-quote" />
                    Supply chain costs and currency exposure are flagged as key risks.
                    <span className="hp-cite">p. 12</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS */}
      <section className="hp-section" aria-labelledby="hp-steps-title">
        <div className="hp-container">
          <div className="hp-section-head is-center">
            <span className="hp-section-kicker">How it works</span>
            <h2 id="hp-steps-title" className="hp-section-title">Done in three simple steps</h2>
          </div>
          <ol className="hp-steps">
            {STEPS.map((step, i) => (
              <li key={step.title} className="hp-step">
                <span className="hp-step-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="hp-step-icon" aria-hidden="true">
                  <FontAwesomeIcon icon={step.icon} />
                </span>
                <h3 className="hp-step-title">{step.title}</h3>
                <p className="hp-step-desc">{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 5. WHY US */}
      <section className="hp-section hp-features-section" aria-labelledby="hp-features-title">
        <div className="hp-container">
          <div className="hp-section-head is-center">
            <span className="hp-section-kicker">Why choose us</span>
            <h2 id="hp-features-title" className="hp-section-title">Built for speed, simplicity, and privacy</h2>
          </div>
          <div className="hp-features">
            {FEATURES.map((f) => (
              <div key={f.title} className="hp-feature">
                <span className="hp-feature-icon" aria-hidden="true">
                  <FontAwesomeIcon icon={f.icon} />
                </span>
                <h3 className="hp-feature-title">{f.title}</h3>
                <p className="hp-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. FAQ */}
      <section className="hp-section" aria-labelledby="hp-faq-title">
        <div className="hp-container hp-faq-layout">
          <div className="hp-faq-intro">
            <span className="hp-section-kicker">FAQ</span>
            <h2 id="hp-faq-title" className="hp-section-title">Frequently asked questions</h2>
            <p className="hp-section-sub">Quick answers about files, privacy, and accounts.</p>
          </div>
          <div className="hp-faq-list">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div key={item.question} className={`hp-faq-item ${isOpen ? 'is-open' : ''}`}>
                  <button
                    type="button"
                    className="hp-faq-q"
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    aria-expanded={isOpen}
                    aria-controls={`hp-faq-a-${index}`}
                  >
                    <span>{item.question}</span>
                    <FontAwesomeIcon icon={faChevronDown} className="hp-faq-chevron" aria-hidden="true" />
                  </button>
                  <div id={`hp-faq-a-${index}`} className="hp-faq-a" role="region">
                    <div className="hp-faq-a-inner">
                      <p>{item.answer}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. CLOSING CTA */}
      <section className="hp-section hp-cta-section" aria-label="Get started">
        <div className="hp-container">
          <div className="hp-cta">
            <div>
              <h2 className="hp-cta-title">Ready to work with your PDFs?</h2>
              <p className="hp-cta-sub">Pick a tool and get started in seconds. No installation needed.</p>
            </div>
            <div className="hp-cta-actions">
              <a href="#all-tools" className="hp-btn hp-btn-primary">
                Explore all tools <FontAwesomeIcon icon={faArrowRight} />
              </a>
              <Link to="/tools/merge-pdf" className="hp-btn hp-btn-secondary">Merge PDF</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
