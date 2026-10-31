import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPenNib,
  faArrowLeft,
  faBriefcase,
  faGraduationCap,
  faFeather,
  faCheck,
  faAlignLeft,
  faBolt
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
import { rewritePdfAI, fetchAIQuota } from '../services/api';
import './PDFRewriter.css';

const REWRITE_STYLES = [
  {
    id: 'professional',
    label: 'Professional',
    badge: 'Business',
    icon: faBriefcase,
    description: 'Polished corporate tone maintaining formal precision, clarity, and industry terminology.'
  },
  {
    id: 'simplified',
    label: 'Simplified',
    badge: 'Plain English',
    icon: faFeather,
    description: 'Streamlined, jargon-free plain English that is easy for general audiences to understand.'
  },
  {
    id: 'executive',
    label: 'Executive',
    badge: 'Concise',
    icon: faBolt,
    description: 'High-level synthesis focused on core decisions, implications, and bottom-line outcomes.'
  },
  {
    id: 'academic',
    label: 'Academic',
    badge: 'Scholarly',
    icon: faGraduationCap,
    description: 'Analytical, formal research tone with structured methodology and nuanced discourse.'
  }
];

export default function PDFRewriter() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [docPageCount, setDocPageCount] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState('professional');
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

  const executeRewrite = async (styleOverride = null) => {
    const styleToUse = styleOverride || selectedStyle;
    if (!selectedFile || isProcessing) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setActiveError({
        message: 'Network Offline: PDF rewriting requires an active internet connection.',
        code: 'NETWORK_OFFLINE'
      });
      return;
    }

    if (quota && quota.remaining <= 0 && !result?.is_demo) {
      setLimitModalOpen(true);
      return;
    }

    if (!hasUserGivenAIConsent()) {
      pendingOperationRef.current = () => executeRewrite(styleToUse);
      setConsentDialogOpen(true);
      return;
    }

    setIsProcessing(true);
    setActiveError(null);
    setStatusMessage(`Rewriting document text in ${styleToUse.toUpperCase()} style...`);

    try {
      const res = await rewritePdfAI({
        file: selectedFile,
        style: styleToUse,
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
      console.error('Rewriter error:', err);
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

  const activeStyleMeta = REWRITE_STYLES.find((s) => s.id === (result?.style || selectedStyle)) || REWRITE_STYLES[0];
  const rewrittenText = result?.rewritten_text || '';

  return (
    <div className="rw-container">
      {/* Top Navigation Row */}
      <div className="tool-top-nav-row">
        <Link to="/" className="tool-back-link">
          <FontAwesomeIcon icon={faArrowLeft} /> Back to Tools
        </Link>
      </div>

      {/* Hero Header */}
      <div className="ai-tool-hero">
        <div className="ai-tool-icon">
          <FontAwesomeIcon icon={faPenNib} />
        </div>
        <div className="ai-tool-info">
          <h1 className="ai-tool-title">PDF Rewriter</h1>
          <p className="ai-tool-desc">
            Transform and adapt document language into Professional, Plain English, Executive, or Academic styles while retaining all facts.
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

      <div className="rw-content">
        {/* Step 1: File Uploader */}
        <AIFileUploader
          file={selectedFile}
          onSelectFile={handleSelectFile}
          onClear={handleClearFile}
          pageCount={docPageCount}
          isProcessing={isProcessing}
          title="Select or drop PDF document to rewrite"
          subtitle="Supports PDF documents up to 15MB"
        />

        {/* Step 2: Tone Selection & Action Button */}
        {selectedFile && !isProcessing && (
          <div className="rw-config-card">
            <h3 className="rw-config-title">Choose Desired Tone & Style</h3>
            <div className="rw-styles-grid">
              {REWRITE_STYLES.map((style) => {
                const isSelected = selectedStyle === style.id;
                return (
                  <button
                    key={style.id}
                    type="button"
                    className={`rw-style-btn ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedStyle(style.id);
                      if (result && result.style !== style.id) {
                        executeRewrite(style.id);
                      }
                    }}
                  >
                    <div className="rw-style-header">
                      <FontAwesomeIcon icon={style.icon} className="rw-style-icon" />
                      <span className="rw-style-badge">{style.badge}</span>
                    </div>
                    <span className="rw-style-label">{style.label}</span>
                    <p className="rw-style-desc">{style.description}</p>
                  </button>
                );
              })}
            </div>

            {!result && (
              <div className="rw-action-row">
                <button
                  type="button"
                  className="ai-btn-generate-main"
                  onClick={() => executeRewrite()}
                  disabled={isProcessing}
                >
                  <FontAwesomeIcon icon={faPenNib} />
                  <span>Rewrite Document Now</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <AIProcessingIndicator
            statusMessage={statusMessage || `Adapting document into ${activeStyleMeta.label} style...`}
          />
        )}

        {/* Error State */}
        {activeError && !isProcessing && (
          <AIErrorState
            error={activeError}
            onRetry={() => executeRewrite()}
            onReset={handleClearFile}
            onSelectSample={handleSelectFile}
          />
        )}

        {/* Results Presentation */}
        {!isProcessing && result && (
          <div className="rw-result-panel">
            <AIResultToolbar
              content={rewrittenText}
              rawDocumentName={selectedFile?.name || 'document'}
              onReset={handleClearFile}
              suffix={`rewritten_${result.style || selectedStyle}`}
            />

            <div className="rw-result-card">
              <div className="rw-result-header">
                <div className="rw-style-pill">
                  <FontAwesomeIcon icon={activeStyleMeta.icon} />
                  <span>Rewritten in {activeStyleMeta.label} ({activeStyleMeta.badge}) Style</span>
                </div>
                {result.is_demo && (
                  <span className="rw-demo-tag">Official Demo Paper (0 Quota)</span>
                )}
              </div>

              <div className="rw-text-body">
                {rewrittenText.split('\n').map((para, pIdx) => {
                  const trimmed = para.trim();
                  if (!trimmed) return <div key={pIdx} className="rw-spacer" />;
                  return (
                    <p key={pIdx} className="rw-paragraph">
                      {renderTextWithCitations(trimmed)}
                    </p>
                  );
                })}
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

