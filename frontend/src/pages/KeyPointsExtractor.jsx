import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faListCheck,
  faArrowLeft,
  faCalendarDays,
  faChartLine,
  faCheckDouble,
  faLightbulb,
  faFileLines
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
import { extractKeyPointsAI, fetchAIQuota } from '../services/api';
import './KeyPointsExtractor.css';

export default function KeyPointsExtractor() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [docPageCount, setDocPageCount] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [result, setResult] = useState(null);
  const [activeError, setActiveError] = useState(null);
  const [quota, setQuota] = useState(null);
  const [quotaLoading, setQuotaLoading] = useState(false);
  const [consentDialogOpen, setConsentDialogOpen] = useState(false);
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const pendingOperationRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    loadQuota();
  }, []);

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
      console.warn('Could not load AI quota:', err);
    } finally {
      setQuotaLoading(false);
    }
  };

  const handleSelectFile = (file) => {
    setSelectedFile(file);
    setResult(null);
    setActiveError(null);
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setResult(null);
    setActiveError(null);
    setDocPageCount(null);
    setIsProcessing(false);
  };

  const executeExtraction = async () => {
    if (!selectedFile || isProcessing) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setActiveError({
        message: 'Network Offline: AI key points extraction requires an active internet connection.',
        code: 'NETWORK_OFFLINE'
      });
      return;
    }

    if (quota && quota.remaining <= 0 && !result?.is_demo) {
      setLimitModalOpen(true);
      return;
    }

    if (!hasUserGivenAIConsent()) {
      pendingOperationRef.current = executeExtraction;
      setConsentDialogOpen(true);
      return;
    }

    setIsProcessing(true);
    setActiveError(null);
    setStatusMessage('Scanning document for key takeaways, dates, and metrics...');

    try {
      const res = await extractKeyPointsAI({
        file: selectedFile,
        consent: true,
        onProgress: (percent, msg) => {
          if (msg) setStatusMessage(msg);
        }
      });

      setResult(res);
      if (res.quota) {
        setQuota(res.quota);
      } else {
        loadQuota();
      }
    } catch (err) {
      console.error('Key Points error:', err);
      if (err.code === 'AI_LIMIT_REACHED') {
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

  // Build combined markdown export content
  const exportContent = result
    ? [
        `# Key Points: ${selectedFile?.name || 'Document'}`,
        '',
        result.key_takeaways?.length
          ? `## Core Takeaways\n${result.key_takeaways.map((t) => `- ${t}`).join('\n')}`
          : '',
        result.critical_dates?.length
          ? `\n## Critical Dates & Deadlines\n${result.critical_dates.map((d) => `- ${d}`).join('\n')}`
          : '',
        result.metrics?.length
          ? `\n## Key Metrics & Figures\n${result.metrics.map((m) => `- ${m}`).join('\n')}`
          : '',
        result.action_items?.length
          ? `\n## Action Items\n${result.action_items.map((a) => `- [ ] ${a}`).join('\n')}`
          : '',
        result.content ? `\n## Detailed Analysis\n${result.content}` : ''
      ]
        .filter(Boolean)
        .join('\n')
    : '';

  return (
    <div className="kp-container">
      {/* Top Navigation Row */}
      <div className="tool-top-nav-row">
        <Link to="/" className="tool-back-link">
          <FontAwesomeIcon icon={faArrowLeft} /> Back to Tools
        </Link>
      </div>

      {/* Hero Banner */}
      <div className="ai-tool-hero">
        <div className="ai-tool-icon">
          <FontAwesomeIcon icon={faListCheck} />
        </div>
        <div className="ai-tool-info">
          <h1 className="ai-tool-title">Key Points Extractor</h1>
          <p className="ai-tool-desc">
            Instantly surface core takeaways, critical dates, metrics, figures, and actionable next steps from any PDF.
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

      <div className="kp-content">
        {/* Step 1: File Uploader */}
        <AIFileUploader
          file={selectedFile}
          onSelectFile={handleSelectFile}
          onClear={handleClearFile}
          pageCount={docPageCount}
          isProcessing={isProcessing}
          title="Select or drop PDF to extract key points"
          subtitle="Supports PDF documents up to 15MB"
        />

        {/* Step 2: Action Button */}
        {selectedFile && !result && !isProcessing && (
          <div className="kp-action-row">
            <button
              type="button"
              className="ai-btn-generate-main"
              onClick={executeExtraction}
              disabled={isProcessing}
            >
              <FontAwesomeIcon icon={faListCheck} />
              <span>Extract Key Points Now</span>
            </button>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <AIProcessingIndicator
            statusMessage={statusMessage || 'Extracting structured highlights and figures...'}
          />
        )}

        {/* Error Banner */}
        {activeError && !isProcessing && (
          <AIErrorState
            error={activeError}
            onRetry={executeExtraction}
            onReset={handleClearFile}
          />
        )}

        {/* Results Presentation */}
        {!isProcessing && result && (
          <div className="kp-result-panel">
            <AIResultToolbar
              content={exportContent}
              rawDocumentName={selectedFile?.name || 'document'}
              onReset={handleClearFile}
              suffix="key_points"
            />

            <div className="kp-cards-grid">
              {/* Core Takeaways */}
              {result.key_takeaways && result.key_takeaways.length > 0 && (
                <div className="kp-card">
                  <div className="kp-card-header">
                    <FontAwesomeIcon icon={faLightbulb} className="kp-icon gold" />
                    <h3>Core Takeaways</h3>
                  </div>
                  <ul className="kp-list">
                    {result.key_takeaways.map((item, idx) => (
                      <li key={idx}>{renderTextWithCitations(item)}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Critical Dates & Deadlines */}
              {result.critical_dates && result.critical_dates.length > 0 && (
                <div className="kp-card">
                  <div className="kp-card-header">
                    <FontAwesomeIcon icon={faCalendarDays} className="kp-icon blue" />
                    <h3>Critical Dates & Deadlines</h3>
                  </div>
                  <div className="kp-chips-wrap">
                    {result.critical_dates.map((date, idx) => (
                      <span key={idx} className="kp-chip date-chip">
                        {renderTextWithCitations(date)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Metrics & Figures */}
              {result.metrics && result.metrics.length > 0 && (
                <div className="kp-card">
                  <div className="kp-card-header">
                    <FontAwesomeIcon icon={faChartLine} className="kp-icon green" />
                    <h3>Key Metrics & Statistics</h3>
                  </div>
                  <div className="kp-chips-wrap">
                    {result.metrics.map((metric, idx) => (
                      <span key={idx} className="kp-chip metric-chip">
                        {renderTextWithCitations(metric)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Items */}
              {result.action_items && result.action_items.length > 0 && (
                <div className="kp-card">
                  <div className="kp-card-header">
                    <FontAwesomeIcon icon={faCheckDouble} className="kp-icon red" />
                    <h3>Action Items & Next Steps</h3>
                  </div>
                  <ul className="kp-checklist">
                    {result.action_items.map((action, idx) => (
                      <li key={idx}>
                        <input type="checkbox" readOnly checked={false} />
                        <span>{renderTextWithCitations(action)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Detailed Context Content (if returned) */}
              {result.content && (
                <div className="kp-card full-width">
                  <div className="kp-card-header">
                    <FontAwesomeIcon icon={faFileLines} className="kp-icon" />
                    <h3>Analysis Details</h3>
                  </div>
                  <div className="kp-content-body">
                    {result.content.split('\n').map((line, i) => (
                      <p key={i}>{renderTextWithCitations(line)}</p>
                    ))}
                  </div>
                </div>
              )}
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
      />
    </div>
  );
}

