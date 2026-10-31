import React, { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faClock,
  faWandMagicSparkles,
  faComments,
  faLanguage,
  faArrowRight,
  faBolt,
  faHouse,
  faChevronRight
} from '@fortawesome/free-solid-svg-icons';
import { getToolById, TOOLS_DATA } from '../utils/toolsData';
import './ComingSoonTool.css';

export default function ComingSoonTool({ toolId: explicitToolId }) {
  const params = useParams();
  const targetId = explicitToolId || params.toolId || params.categorySlug || 'ai-key-points';
  const tool = getToolById(targetId) || {
    id: targetId,
    title: targetId.replace(/^(ai-|tools-)/, '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    description: 'This AI document utility is currently under active engineering and will be available in the upcoming release.',
    icon: faWandMagicSparkles
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [targetId]);

  const isKeyPoints = tool.id === 'ai-key-points' || tool.id === 'key-points';

  return (
    <div className="coming-soon-container">
      {/* Breadcrumb Navigation */}
      <nav className="coming-soon-breadcrumbs" aria-label="Breadcrumbs">
        <Link to="/" className="cs-crumb-link">
          <FontAwesomeIcon icon={faHouse} className="cs-crumb-icon" />
          <span>Home</span>
        </Link>
        <FontAwesomeIcon icon={faChevronRight} className="cs-crumb-sep" />
        <Link to="/tools/ai" className="cs-crumb-link">
          <span>AI PDF Tools</span>
        </Link>
        <FontAwesomeIcon icon={faChevronRight} className="cs-crumb-sep" />
        <span className="cs-crumb-current">{tool.title}</span>
      </nav>

      {/* Back Link */}
      <div className="tool-top-nav-row">
        <Link to="/tools/ai" className="tool-back-link">
          <FontAwesomeIcon icon={faArrowLeft} /> Back to AI Tools
        </Link>
      </div>

      {/* Hero Banner */}
      <div className="cs-hero-card">
        <div className="cs-hero-left">
          <div className="cs-icon-box">
            {tool.icon && <FontAwesomeIcon icon={tool.icon} />}
          </div>
          <div className="cs-hero-info">
            <div className="cs-badge-row">
              <span className="cs-status-badge">
                <FontAwesomeIcon icon={faClock} /> Coming Soon
              </span>
              <span className="cs-phase-badge">Phase 6 Active Roadmap</span>
            </div>
            <h1 className="cs-hero-title">{tool.title}</h1>
            <p className="cs-hero-desc">{tool.description}</p>
          </div>
        </div>
      </div>

      {/* Context Card / Alternative Solution */}
      {isKeyPoints ? (
        <div className="cs-alternative-card highlight">
          <div className="cs-alt-left">
            <div className="cs-alt-icon-box">
              <FontAwesomeIcon icon={faBolt} />
            </div>
            <div className="cs-alt-text">
              <h3 className="cs-alt-title">Need Key Points Extracted Right Now?</h3>
              <p className="cs-alt-desc">
                Our <strong>AI PDF Summarizer</strong> includes a dedicated <strong>Key Points Mode</strong> that extracts high-impact bulleted takeaways, critical decisions, and metrics using DeepSeek and Google Gemini.
              </p>
            </div>
          </div>
          <Link to="/ai-summarizer" className="cs-btn-action primary">
            <span>Open AI Summarizer</span>
            <FontAwesomeIcon icon={faArrowRight} />
          </Link>
        </div>
      ) : (
        <div className="cs-alternative-card">
          <div className="cs-alt-left">
            <div className="cs-alt-icon-box">
              <FontAwesomeIcon icon={faWandMagicSparkles} />
            </div>
            <div className="cs-alt-text">
              <h3 className="cs-alt-title">Feature In Development</h3>
              <p className="cs-alt-desc">
                This feature is part of the Simatrix AI expansion plan and is being calibrated with our multi-provider router. In the meantime, explore our 3 active production AI tools below.
              </p>
            </div>
          </div>
          <Link to="/tools/ai" className="cs-btn-action">
            <span>Explore All AI Tools</span>
            <FontAwesomeIcon icon={faArrowRight} />
          </Link>
        </div>
      )}

      {/* Available Working AI Tools Section */}
      <section className="cs-available-section">
        <div className="cs-section-header">
          <h2 className="cs-section-title">Available AI Tools</h2>
          <p className="cs-section-subtitle">
            These 3 AI document tools are fully operational and ready to use:
          </p>
        </div>

        <div className="cs-tools-grid">
          {/* 1. AI Summarizer */}
          <Link to="/ai-summarizer" className="cs-tool-card">
            <div className="cs-tool-icon">
              <FontAwesomeIcon icon={faWandMagicSparkles} />
            </div>
            <div className="cs-tool-info">
              <span className="cs-tool-badge active">Active Tool</span>
              <h3 className="cs-tool-title">AI PDF Summarizer</h3>
              <p className="cs-tool-desc">
                Generate executive briefings, detailed analysis, key points, and section-by-section summaries.
              </p>
            </div>
            <span className="cs-tool-arrow">
              <FontAwesomeIcon icon={faArrowRight} />
            </span>
          </Link>

          {/* 2. Ask PDF */}
          <Link to="/ai-chat-pdf" className="cs-tool-card">
            <div className="cs-tool-icon">
              <FontAwesomeIcon icon={faComments} />
            </div>
            <div className="cs-tool-info">
              <span className="cs-tool-badge active">Active Tool</span>
              <h3 className="cs-tool-title">Ask PDF (AI Chat)</h3>
              <p className="cs-tool-desc">
                Converse with your document and get grounded answers with verifiable page-by-page citations.
              </p>
            </div>
            <span className="cs-tool-arrow">
              <FontAwesomeIcon icon={faArrowRight} />
            </span>
          </Link>

          {/* 3. PDF Translator */}
          <Link to="/ai-translate" className="cs-tool-card">
            <div className="cs-tool-icon">
              <FontAwesomeIcon icon={faLanguage} />
            </div>
            <div className="cs-tool-info">
              <span className="cs-tool-badge active">Active Tool</span>
              <h3 className="cs-tool-title">PDF Translator</h3>
              <p className="cs-tool-desc">
                Translate PDF documents into Tamil, Hindi, Spanish, French, German, and more with Word export.
              </p>
            </div>
            <span className="cs-tool-arrow">
              <FontAwesomeIcon icon={faArrowRight} />
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}

