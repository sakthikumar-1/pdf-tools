import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faWandMagicSparkles,
  faFileLines,
  faCopy,
  faCheck,
  faDownload,
  faRotateRight,
  faCircleExclamation,
  faTriangleExclamation,
  faClock,
  faBookOpen,
  faLayerGroup,
  faShieldHalved,
  faMicrochip,
  faArrowLeft,
  faTrashCan,
  faListOl,
  faListCheck,
  faAlignLeft,
  faCircleCheck,
  faBolt,
  faChevronRight
} from '@fortawesome/free-solid-svg-icons';
import UploadBox from '../components/UploadBox';
import { useFileUpload } from '../hooks/useFileUpload';
import { getPdfPageCount } from '../utils/pdfProcessor';
import { formatBytes, downloadFile } from '../utils/fileUtils';
import { summarizePdf } from '../services/api';
import { fetchServerCapabilities } from '../utils/capabilityChecker';
import './AISummarizer.css';

const SUMMARY_MODES = [
  {
    id: 'quick',
    title: 'Quick Summary',
    badge: 'Fast',
    icon: faBolt,
    description: 'Executive briefing capturing the primary thesis, core findings, and conclusion in 2-3 concise paragraphs.',
    targetTokens: '~150 words'
  },
  {
    id: 'detailed',
    title: 'Detailed Summary',
    badge: 'Comprehensive',
    icon: faAlignLeft,
    description: 'In-depth analysis retaining vital background, methodology, arguments, caveats, and data points.',
    targetTokens: '~450 words'
  },
  {
    id: 'key_points',
    title: 'Key Points',
    badge: 'Bullets',
    icon: faListCheck,
    description: 'High-impact bulleted list highlighting critical facts, metrics, decisions, and actionable takeaways.',
    targetTokens: '6-10 points'
  },
  {
    id: 'section_by_section',
    title: 'Section-by-Section',
    badge: 'Structured',
    icon: faListOl,
    description: 'Sequential walkthrough mapping out each section, chapter, or topic with structured headings.',
    targetTokens: 'Per section'
  }
];

export default function AISummarizer() {
  const [selectedMode, setSelectedMode] = useState('quick');
  const [docPageCount, setDocPageCount] = useState(null);
  const [capabilities, setCapabilities] = useState(null);
  const [copied, setCopied] = useState(false);
  const [summaryResult, setSummaryResult] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [activeError, setActiveError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef(null);

  const {
    file,
    isDragging,
    error: uploadError,
    status: uploadStatus,
    setStatus: setUploadStatus,
    setError: setUploadError,
    selectFile,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    reset: resetUpload
  } = useFileUpload();

  // Scroll to top and fetch capabilities on mount
  useEffect(() => {
    window.scrollTo(0, 0);
    fetchServerCapabilities().then((data) => {
      setCapabilities(data);
    });
  }, []);

  // When a file is selected, inspect page count
  useEffect(() => {
    if (file) {
      setActiveError(null);
      setSummaryResult(null);
      setDocPageCount(null);
      getPdfPageCount(file).then((count) => {
        if (count !== null) setDocPageCount(count);
      });
    }
  }, [file]);

  // Handle elapsed timer during processing
  useEffect(() => {
    if (isProcessing) {
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isProcessing]);

  // Handle summary generation
  const handleGenerateSummary = async (modeOverride = null) => {
    if (!file || isProcessing) return;

    const mode = modeOverride || selectedMode;
    setIsProcessing(true);
    setActiveError(null);
    setStatusMessage('Uploading document to AI analyzer...');

    try {
      const result = await summarizePdf(file, mode, (percent, msg) => {
        if (msg) setStatusMessage(msg);
      });

      setSummaryResult(result);
      setIsProcessing(false);
      setStatusMessage('');
    } catch (err) {
      setIsProcessing(false);
      setStatusMessage('');
      const message = err.message || 'An unexpected error occurred while analyzing the document.';
      setActiveError({
        message,
        isScanned: message.toLowerCase().includes('scanned') || message.toLowerCase().includes('ocr'),
        isConfig: message.toLowerCase().includes('not configured') || message.toLowerCase().includes('api key'),
        isPassword: message.toLowerCase().includes('password') || message.toLowerCase().includes('encrypted'),
        isRateLimit: message.toLowerCase().includes('rate limit') || message.toLowerCase().includes('too many')
      });
    }
  };

  // Copy summary text to clipboard
  const handleCopy = () => {
    if (!summaryResult?.summary) return;
    navigator.clipboard.writeText(summaryResult.summary).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Download summary as a clean .txt file
  const handleDownloadTxt = () => {
    if (!summaryResult?.summary || !file) return;

    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const modeLabel = SUMMARY_MODES.find((m) => m.id === summaryResult.mode)?.title || 'AI Summary';
    const dateStr = new Date().toISOString().split('T')[0];

    const content = [
      `================================================================================`,
      `SIMATRIX PDF TOOLS — AI DOCUMENT SUMMARY`,
      `================================================================================`,
      `Source File:     ${file.name}`,
      `File Size:       ${formatBytes(file.size)}`,
      `Pages Analyzed:  ${summaryResult.pageCount || docPageCount || 'N/A'}`,
      `Summary Mode:    ${modeLabel}`,
      `AI Engine:       ${summaryResult.provider} (${summaryResult.model})`,
      `Word Count:      ${summaryResult.wordCount} words`,
      `Estimated Read:  ${summaryResult.estimatedReadingTimeMinutes} min`,
      `Generated Date:  ${dateStr}`,
      `================================================================================`,
      ``,
      summaryResult.summary,
      ``,
      `--------------------------------------------------------------------------------`,
      `Processed privately by Simatrix Academy PDF Tools (https://academy.simatrix.com)`,
      `--------------------------------------------------------------------------------`
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    downloadFile(blob, `${baseName}_${summaryResult.mode}_summary.txt`);
  };

  // Reset to initial upload state
  const handleReset = () => {
    resetUpload();
    setSummaryResult(null);
    setActiveError(null);
    setDocPageCount(null);
    setIsProcessing(false);
  };

  // Render markdown text into semantic HTML blocks
  const renderFormattedSummary = (text) => {
    if (!text) return null;

    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return <div key={idx} className="summary-spacer" />;
      }

      // Main section headings (## Heading or # Heading)
      if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
        const headingText = trimmed.replace(/^#+\s*/, '');
        return (
          <h3 key={idx} className="summary-h3">
            {headingText}
          </h3>
        );
      }

      // Subheadings (### Subheading)
      if (trimmed.startsWith('### ')) {
        const headingText = trimmed.replace(/^###\s*/, '');
        return (
          <h4 key={idx} className="summary-h4">
            {headingText}
          </h4>
        );
      }

      // Bullet points (* or -)
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
        const bulletText = trimmed.replace(/^[\*\-•]\s*/, '');
        return (
          <li key={idx} className="summary-bullet">
            {formatInlineBold(bulletText)}
          </li>
        );
      }

      // Numbered lists (1. 2. etc.)
      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        return (
          <li key={idx} className="summary-numbered" value={numMatch[1]}>
            {formatInlineBold(numMatch[2])}
          </li>
        );
      }

      // Normal paragraph
      return (
        <p key={idx} className="summary-paragraph">
          {formatInlineBold(trimmed)}
        </p>
      );
    });
  };

  // Format **bold** text inline
  const formatInlineBold = (str) => {
    if (!str.includes('**')) return str;
    const parts = str.split('**');
    return parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part));
  };

  const aiEngineName = capabilities?.ai?.provider || 'Hosted AI Engine';
  const aiModelName = capabilities?.ai?.model || 'gpt-4o-mini / gemini-2.5-flash';

  return (
    <div className="ai-summarizer-container">
      {/* Top Breadcrumb & Hero */}
      <div className="ai-summarizer-header">
        <Link to="/" className="back-link">
          <ArrowLeft size={16} /> Back to All PDF Tools
        </Link>
        <div className="ai-badge-header">
          <span className="ai-pill">
            <Sparkles size={14} className="sparkle-icon" /> AI Document Intelligence
          </span>
          <span className="ai-engine-status">
            <Cpu size={13} /> {aiEngineName}
          </span>
        </div>
        <h1 className="ai-title">AI PDF Summarizer</h1>
        <p className="ai-description">
          Distill complex research papers, business reports, contracts, and books into concise executive briefings,
          bulleted key takeaways, and section breakdowns with high accuracy.
        </p>
      </div>

      <div className="ai-summarizer-content">
        {/* VIEW 1: UPLOAD AREA (when no file selected) */}
        {!file && (
          <div className="ai-upload-section">
            <UploadBox
              onFileSelect={(f) => selectFile(f)}
              isDragging={isDragging}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, false)}
              error={uploadError}
              title="Select PDF Document to Summarize"
              subtitle="or drag and drop your PDF here"
              acceptedTypes=".pdf"
              maxSizeText="25 MB"
            />

            {/* Feature Highlights Grid */}
            <div className="ai-features-grid">
              <div className="ai-feature-card">
                <div className="feature-icon-wrap">
                  <Zap size={20} />
                </div>
                <h4>4 Distinct Modes</h4>
                <p>Choose between executive briefings, exhaustive analyses, bulleted takeaways, or section walk-throughs.</p>
              </div>

              <div className="ai-feature-card">
                <div className="feature-icon-wrap">
                  <Layers size={20} />
                </div>
                <h4>Map-Reduce Chunking</h4>
                <p>Large multi-page documents are analyzed in intelligent semantic chunks with zero context window truncation.</p>
              </div>

              <div className="ai-feature-card">
                <div className="feature-icon-wrap">
                  <ShieldCheck size={20} />
                </div>
                <h4>Privacy & Ephemeral</h4>
                <p>Files are purged immediately from temporary storage upon completion. No documents are stored or used for AI training.</p>
              </div>
            </div>

            {/* Privacy Transparency Callout */}
            <div className="ai-privacy-note">
              <ShieldCheck size={16} className="privacy-icon" />
              <span>
                <strong>Data Privacy Notice:</strong> Document text is securely sent to the configured hosted AI engine for
                instant analysis. No document contents are permanently stored on our servers.
              </span>
            </div>
          </div>
        )}

        {/* VIEW 2: FILE SELECTED & CONFIGURATION (or RESULT) */}
        {file && (
          <div className="ai-workspace">
            {/* Active File Bar */}
            <div className="active-file-card">
              <div className="file-meta-group">
                <div className="file-icon-box">
                  <FileText size={24} />
                </div>
                <div className="file-details">
                  <span className="file-name" title={file.name}>
                    {file.name}
                  </span>
                  <div className="file-specs">
                    <span className="spec-item">{formatBytes(file.size)}</span>
                    <span className="spec-dot">•</span>
                    <span className="spec-item">
                      {docPageCount !== null ? `${docPageCount} ${docPageCount === 1 ? 'page' : 'pages'}` : 'Counting pages...'}
                    </span>
                    {summaryResult && (
                      <>
                        <span className="spec-dot">•</span>
                        <span className="spec-badge-success">
                          <Check size={12} /> Summarized
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn-change-file"
                onClick={handleReset}
                disabled={isProcessing}
                title="Upload a different document"
              >
                <FontAwesomeIcon icon={faTrashCan} />
                <span>Change File</span>
              </button>
            </div>

            {/* ERROR ALERT DISPLAY */}
            {activeError && (
              <div className="ai-error-banner" role="alert">
                <div className="error-icon-box">
                  <AlertCircle size={22} />
                </div>
                <div className="error-body">
                  <h4>Unable to Summarize Document</h4>
                  <p>{activeError.message}</p>
                  {activeError.isScanned && (
                    <div className="error-hint">
                      <strong>Scanned Document Notice:</strong> This PDF contains scanned bitmap images with no extractable
                      digital text. OCR (Optical Character Recognition) is currently unconfigured. Please upload a standard
                      text-based PDF.
                    </div>
                  )}
                  {activeError.isConfig && (
                    <div className="error-hint">
                      <strong>Configuration Required:</strong> The server administrator must configure a valid
                      <code>GEMINI_API_KEY</code> or <code>OPENAI_API_KEY</code> environment variable in the backend.
                    </div>
                  )}
                  {activeError.isPassword && (
                    <div className="error-hint">
                      <strong>Encrypted PDF:</strong> Please remove password protection or decrypt the document before uploading.
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="btn-error-retry"
                  onClick={() => handleGenerateSummary()}
                  disabled={isProcessing}
                >
                  <FontAwesomeIcon icon={faRotateRight} /> Retry
                </button>
              </div>
            )}

            {/* PROCESSING OVERLAY / STATUS CARD */}
            {isProcessing && (
              <div className="ai-processing-card">
                <div className="processing-spinner-box">
                  <div className="ai-pulse-ring" />
                  <Sparkles size={28} className="ai-pulse-icon" />
                </div>
                <h3>Analyzing Document with AI</h3>
                <p className="processing-status-text">
                  {statusMessage || 'Processing text chunks and synthesizing insights...'}
                </p>
                <div className="processing-timer">
                  <FontAwesomeIcon icon={faClock} /> Time elapsed: {elapsedSeconds}s
                </div>
                <p className="processing-subtext">
                  Long multi-page documents may take up to 20-30 seconds to extract and chunk cleanly.
                </p>
              </div>
            )}

            {/* RESULTS VIEW */}
            {!isProcessing && summaryResult && (
              <div className="ai-result-panel">
                {/* Result Header & Metrics Bar */}
                <div className="result-header-bar">
                  <div className="result-mode-tag">
                    <Sparkles size={16} />
                    <span>{SUMMARY_MODES.find((m) => m.id === summaryResult.mode)?.title || 'Summary'}</span>
                  </div>

                  <div className="result-metrics">
                    <span className="metric-badge" title="Summary word count">
                      <BookOpen size={13} /> {summaryResult.wordCount} words
                    </span>
                    <span className="metric-badge" title="Estimated reading time">
                      <Clock size={13} /> {summaryResult.estimatedReadingTimeMinutes} min read
                    </span>
                    <span className="metric-badge" title="Pages processed">
                      <Layers size={13} /> {summaryResult.pageCount} pages
                    </span>
                    {summaryResult.isChunked && (
                      <span className="metric-badge chunked" title="Map-reduce multi-chunk synthesis">
                        Map-Reduce
                      </span>
                    )}
                    <span className="metric-badge provider" title="AI Provider and Model">
                      {summaryResult.provider}
                    </span>
                  </div>

                  {/* Top Action Buttons */}
                  <div className="result-actions">
                    <button
                      type="button"
                      className={`btn-action-copy ${copied ? 'copied' : ''}`}
                      onClick={handleCopy}
                      title="Copy full summary to clipboard"
                    >
                      {copied ? (
                        <>
                          <Check size={16} /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={16} /> Copy
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      className="btn-action-download"
                      onClick={handleDownloadTxt}
                      title="Download summary as a .txt file"
                    >
                      <Download size={16} /> Download .TXT
                    </button>
                  </div>
                </div>

                {/* Scant Text / Partial Extraction Warning if present */}
                {summaryResult.warning && (
                  <div className="summary-warning-alert">
                    <AlertTriangle size={18} />
                    <span>{summaryResult.warning}</span>
                  </div>
                )}

                {/* Formatted Summary Content Card */}
                <div className="summary-body-card">
                  <div className="summary-markdown-content">
                    {renderFormattedSummary(summaryResult.summary)}
                  </div>
                </div>

                {/* Mode Switcher / Re-run Bar */}
                <div className="rerun-bar">
                  <span className="rerun-label">Summarize in another format:</span>
                  <div className="rerun-modes-pills">
                    {SUMMARY_MODES.map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        className={`rerun-pill ${summaryResult.mode === mode.id ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedMode(mode.id);
                          handleGenerateSummary(mode.id);
                        }}
                        disabled={isProcessing || summaryResult.mode === mode.id}
                      >
                        <mode.icon size={14} />
                        <span>{mode.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* MODE SELECTION & ACTION PANEL (Visible when not processing and not viewing result, or to re-run) */}
            {!isProcessing && !summaryResult && (
              <div className="ai-controls-card">
                <div className="controls-header">
                  <h3>Select Summarization Mode</h3>
                  <p>Choose how you would like the AI model to analyze and structure the output.</p>
                </div>

                <div className="modes-selection-grid">
                  {SUMMARY_MODES.map((mode) => {
                    const isSelected = selectedMode === mode.id;
                    const ModeIcon = mode.icon;
                    return (
                      <div
                        key={mode.id}
                        className={`mode-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedMode(mode.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedMode(mode.id);
                          }
                        }}
                      >
                        <div className="mode-card-top">
                          <div className={`mode-icon-circle ${isSelected ? 'active' : ''}`}>
                            <ModeIcon size={20} />
                          </div>
                          <span className="mode-badge">{mode.badge}</span>
                        </div>
                        <h4 className="mode-title">{mode.title}</h4>
                        <p className="mode-desc">{mode.description}</p>
                        <div className="mode-footer">
                          <span className="mode-tokens">Target: {mode.targetTokens}</span>
                          <div className={`radio-dot ${isSelected ? 'checked' : ''}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Primary Action Button */}
                <div className="action-cta-area">
                  <button
                    type="button"
                    className="btn-generate-ai"
                    onClick={() => handleGenerateSummary()}
                    disabled={isProcessing}
                  >
                    <FontAwesomeIcon icon={faWandMagicSparkles} />
                    <span>Generate AI Summary</span>
                    <ChevronRight size={18} />
                  </button>
                  <p className="cta-disclaimer">
                    Takes approximately 5-15 seconds depending on document length and token volume.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
