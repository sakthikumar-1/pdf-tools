import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faWandMagicSparkles,
  faArrowLeft,
  faBolt,
  faAlignLeft,
  faListCheck,
  faListOl
} from '@fortawesome/free-solid-svg-icons';
import {
  AIQuotaBanner,
  AIConsentDialog,
  hasUserGivenAIConsent,
  setUserAIConsent,
  AIFileUploader,
  AIProcessingIndicator,
  AIErrorState,
  AILimitReachedModal,
  AIResultToolbar,
  renderTextWithCitations
} from '../components/ai';
import { getPdfPageCount } from '../utils/pdfPageCounter';
import { summarizePdf, fetchAIQuota } from '../services/api';
import './AISummarizer.css';

const SUMMARY_MODES = [
  {
    id: 'quick',
    title: 'Quick Summary',
    badge: 'Fast',
    icon: faBolt,
    description: 'Executive briefing capturing primary thesis, core findings, and conclusions in 2-3 concise paragraphs.',
    targetTokens: '~150 words'
  },
  {
    id: 'detailed',
    title: 'Detailed Summary',
    badge: 'Comprehensive',
    icon: faAlignLeft,
    description: 'In-depth analysis retaining background context, methodology, data points, arguments, and caveats.',
    targetTokens: '~450 words'
  },
  {
    id: 'key_points',
    title: 'Key Points',
    badge: 'Bullets',
    icon: faListCheck,
    description: 'High-impact bulleted list highlighting critical facts, decisions, metrics, and actionable takeaways.',
    targetTokens: '6-10 points'
  },
  {
    id: 'section_by_section',
    title: 'Section-by-Section',
    badge: 'Structured',
    icon: faListOl,
    description: 'Sequential walkthrough mapping out each chapter, heading, or thematic section with citations.',
    targetTokens: 'Per section'
  }
];

export default function AISummarizer() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [docPageCount, setDocPageCount] = useState(null);
  const [selectedMode, setSelectedMode] = useState('quick');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [summaryResult, setSummaryResult] = useState(null);
  const [activeError, setActiveError] = useState(null);
  const [quota, setQuota] = useState(null);
  const [quotaLoading, setQuotaLoading] = useState(false);
  const [consentDialogOpen, setConsentDialogOpen] = useState(false);
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const pendingOperationRef = useRef(null);

  // Load quota on mount
  useEffect(() => {
    window.scrollTo(0, 0);
    loadQuota();
  }, []);

  // Update page count when file changes
  useEffect(() => {
    if (selectedFile) {
      setDocPageCount(null);
      getPdfPageCount(selectedFile).then((count) => {
        if (count !== null) setDocPageCount(count);
      });
    }
  }, [selectedFile]);

  const loadQuota = async () => {
    setQuotaLoading(true);
    try {
      const q = await fetchAIQuota();
      if (q) setQuota(q);
    } catch (err) {
      console.warn('Could not fetch AI quota:', err);
    } finally {
      setQuotaLoading(false);
    }
  };

  const handleSelectFile = (file) => {
    setSelectedFile(file);
    setSummaryResult(null);
    setActiveError(null);
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setSummaryResult(null);
    setActiveError(null);
    setDocPageCount(null);
    setIsProcessing(false);
  };

  const executeSummarize = async (modeToRun = null) => {
    const mode = modeToRun || selectedMode;
    if (!selectedFile || isProcessing) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setActiveError({
        message: 'Network Offline: Simatrix AI document analysis requires an active internet connection. Please reconnect, or use offline-capable PDF tools (Merge, Split, Rotate).',
        code: 'NETWORK_OFFLINE'
      });
      return;
    }

    if (quota && quota.remaining <= 0 && !summaryResult?.isDemo) {
      setLimitModalOpen(true);
      return;
    }

    // Check external consent
    if (!hasUserGivenAIConsent()) {
      pendingOperationRef.current = () => executeSummarize(mode);
      setConsentDialogOpen(true);
      return;
    }

    setIsProcessing(true);
    setActiveError(null);
    setStatusMessage('Uploading document to AI analyzer...');

    try {
      const result = await summarizePdf(
        selectedFile,
        mode,
        (percent, msg) => {
          if (msg) setStatusMessage(msg);
        },
        { consent: true }
      );

      setSummaryResult(result);
      if (result.quota) {
        setQuota(result.quota);
      } else {
        loadQuota();
      }
    } catch (err) {
      console.error('AI Summarizer error:', err);
      const code = err.code || '';
      if (code === 'AI_LIMIT_REACHED') {
        setLimitModalOpen(true);
      }
      setActiveError(err);
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  const handleConsentConfirm = () => {
    setUserAIConsent(true);
    setConsentDialogOpen(false);
    if (pendingOperationRef.current) {
      const op = pendingOperationRef.current;
      pendingOperationRef.current = null;
      op();
    }
  };

  const renderSummaryBlocks = (text) => {
    if (!text) return null;
    const lines = text.split('\n');

    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return <div key={idx} className="summary-spacer" />;
      }

      if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
        const headingText = trimmed.replace(/^#+\s*/, '');
        return (
          <h3 key={idx} className="summary-h3">
            {headingText}
          </h3>
        );
      }

      if (trimmed.startsWith('### ')) {
        const headingText = trimmed.replace(/^###\s*/, '');
        return (
          <h4 key={idx} className="summary-h4">
            {headingText}
          </h4>
        );
      }

      if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
        const bulletText = trimmed.replace(/^[\*\-•]\s*/, '');
        return (
          <li key={idx} className="summary-bullet">
            {renderTextWithCitations(bulletText)}
          </li>
        );
      }

      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        return (
          <li key={idx} className="summary-numbered" value={numMatch[1]}>
            {renderTextWithCitations(numMatch[2])}
          </li>
        );
      }

      return (
        <p key={idx} className="summary-paragraph">
          {renderTextWithCitations(trimmed)}
        </p>
      );
    });
  };

  return (
    <div className="ai-summarizer-container">
      {/* Back Link */}
      <div className="tool-top-nav-row">
        <Link to="/" className="tool-back-link">
          <FontAwesomeIcon icon={faArrowLeft} /> Back to Tools
        </Link>
      </div>

      {/* Hero Header */}
      <div className="ai-tool-hero">
        <div className="ai-tool-icon">
          <FontAwesomeIcon icon={faWandMagicSparkles} />
        </div>
        <div className="ai-tool-info">
          <h1 className="ai-tool-title">AI PDF Summarizer</h1>
          <p className="ai-tool-desc">
            Executive briefings, detailed analyses, and structured key points powered by DeepSeek & Google Gemini.
          </p>
        </div>
      </div>

      {/* AI Quota Banner */}
      <AIQuotaBanner
        quota={quota}
        onRefresh={loadQuota}
        isLoading={quotaLoading}
        onUpgradeClick={() => setLimitModalOpen(true)}
      />

      <div className="ai-summarizer-content">
        {/* Step 1: File Uploader */}
        <AIFileUploader
          file={selectedFile}
          onSelectFile={handleSelectFile}
          onClear={handleClearFile}
          pageCount={docPageCount}
          isProcessing={isProcessing}
          title="Select or drop PDF document to summarize"
          subtitle="Supports PDF documents up to 15MB"
        />

        {/* Step 2: Mode Selector & Execution Button */}
        {selectedFile && !isProcessing && (
          <div className="ai-config-section">
            <h3 className="ai-section-title">Select Summary Mode</h3>
            <div className="summary-modes-grid">
              {SUMMARY_MODES.map((mode) => {
                const isSelected = selectedMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    className={`summary-mode-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedMode(mode.id);
                      if (summaryResult && summaryResult.mode !== mode.id) {
                        executeSummarize(mode.id);
                      }
                    }}
                  >
                    <div className="mode-card-header">
                      <div className="mode-icon-box">
                        <FontAwesomeIcon icon={mode.icon} />
                      </div>
                      <span className="mode-badge">{mode.badge}</span>
                    </div>
                    <h4 className="mode-title">{mode.title}</h4>
                    <p className="mode-desc">{mode.description}</p>
                    <span className="mode-target">{mode.targetTokens}</span>
                  </button>
                );
              })}
            </div>

            {!summaryResult && (
              <div className="ai-generate-row">
                <button
                  type="button"
                  className="ai-btn-generate-main"
                  onClick={() => executeSummarize()}
                  disabled={isProcessing}
                >
                  <FontAwesomeIcon icon={faWandMagicSparkles} />
                  <span>Generate Summary Now</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <AIProcessingIndicator
            statusMessage={statusMessage || 'Analyzing document context and synthesizing summary...'}
          />
        )}

        {/* Error State */}
        {activeError && !isProcessing && (
          <AIErrorState
            error={activeError}
            onRetry={() => executeSummarize()}
            onReset={handleClearFile}
            onSelectSample={handleSelectFile}
          />
        )}

        {/* Results Panel */}
        {!isProcessing && summaryResult && (
          <div className="ai-result-panel">
            <AIResultToolbar
              content={summaryResult.summary}
              rawDocumentName={selectedFile?.name || 'document'}
              wordCount={summaryResult.wordCount}
              charCount={summaryResult.charCount}
              readingTimeMinutes={summaryResult.estimatedReadingTimeMinutes}
              onReset={handleClearFile}
              suffix={`summary_${summaryResult.mode}`}
            />

            <div className="ai-result-card">
              <div className="ai-result-header-row">
                <div className="ai-result-mode-pill">
                  <FontAwesomeIcon icon={faWandMagicSparkles} />
                  <span>{SUMMARY_MODES.find((m) => m.id === summaryResult.mode)?.title || 'Summary'}</span>
                </div>
                <div className="ai-result-engine-meta">
                  <span className="ai-engine-tag">
                    {summaryResult.provider === 'deepseek' ? 'DeepSeek V3' : summaryResult.provider}
                  </span>
                  {summaryResult.isDemo && (
                    <span className="ai-demo-tag">Official Demo Paper (0 Quota)</span>
                  )}
                </div>
              </div>

              <div className="ai-result-text-body">
                {renderSummaryBlocks(summaryResult.summary)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Global Modals */}
      <AIConsentDialog
        isOpen={consentDialogOpen}
        onConfirm={handleConsentConfirm}
        onCancel={() => setConsentDialogOpen(false)}
      />

      <AILimitReachedModal
        isOpen={limitModalOpen}
        onClose={() => setLimitModalOpen(false)}
        onSelectSample={handleSelectFile}
      />
    </div>
  );
}
