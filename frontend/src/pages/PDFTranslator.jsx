import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faLanguage,
  faArrowLeft,
  faFileWord,
  faDownload,
  faRotateRight,
  faBookOpen,
  faGlobe,
  faCheck,
  faCopy
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
  AILanguageSelector,
  SUPPORTED_AI_LANGUAGES,
  renderTextWithCitations
} from '../components/ai';
import { getPdfPageCount } from '../utils/pdfPageCounter';
import { translatePdfAI, fetchAIQuota } from '../services/api';
import './PDFTranslator.css';

export default function PDFTranslator() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [docPageCount, setDocPageCount] = useState(null);
  const [targetLanguage, setTargetLanguage] = useState('tamil');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [translationResult, setTranslationResult] = useState(null);
  const [activeError, setActiveError] = useState(null);
  const [quota, setQuota] = useState(null);
  const [quotaLoading, setQuotaLoading] = useState(false);
  const [consentDialogOpen, setConsentDialogOpen] = useState(false);
  const [limitModalOpen, setLimitModalOpen] = useState(false);

  const pendingTranslateRef = useRef(null);

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
    setTranslationResult(null);
    setActiveError(null);
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setTranslationResult(null);
    setActiveError(null);
    setDocPageCount(null);
    setIsProcessing(false);
  };

  const executeTranslate = async () => {
    if (!selectedFile || isProcessing) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setActiveError({
        message: 'Network Offline: PDF translation requires an active internet connection.',
        code: 'NETWORK_OFFLINE'
      });
      return;
    }

    if (quota && quota.remaining <= 0 && !translationResult?.isDemo) {
      setLimitModalOpen(true);
      return;
    }

    if (!hasUserGivenAIConsent()) {
      pendingTranslateRef.current = executeTranslate;
      setConsentDialogOpen(true);
      return;
    }

    setIsProcessing(true);
    setActiveError(null);
    setStatusMessage(`Translating document to ${targetLanguage.toUpperCase()}...`);

    try {
      const result = await translatePdfAI({
        file: selectedFile,
        targetLanguage: targetLanguage,
        consent: true,
        onProgress: (percent, msg) => {
          if (msg) setStatusMessage(msg);
        }
      });

      setTranslationResult(result);
      if (result.quota) {
        setQuota(result.quota);
      } else {
        loadQuota();
      }
    } catch (err) {
      console.error('PDF Translation error:', err);
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
    if (pendingTranslateRef.current) {
      const op = pendingTranslateRef.current;
      pendingTranslateRef.current = null;
      op();
    }
  };

  const targetLangMeta = SUPPORTED_AI_LANGUAGES.find((l) => l.code === targetLanguage) || {
    label: targetLanguage,
    nativeLabel: ''
  };

  const renderTranslationContent = (text) => {
    if (!text) return null;

    return text.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return <div key={idx} className="trans-spacer" />;
      }

      // Page boundary headers
      if (trimmed.startsWith('--- Page') || trimmed.startsWith('=== Page') || trimmed.startsWith('## Page')) {
        return (
          <div key={idx} className="trans-page-divider">
            <span>{trimmed.replace(/[-=#]/g, '').trim()}</span>
          </div>
        );
      }

      // Headings
      if (trimmed.startsWith('# ') || trimmed.startsWith('## ')) {
        return (
          <h3 key={idx} className="trans-h3">
            {trimmed.replace(/^#+\s*/, '')}
          </h3>
        );
      }

      // Bullets
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
        return (
          <li key={idx} className="trans-bullet">
            {renderTextWithCitations(trimmed.replace(/^[\*\-•]\s*/, ''))}
          </li>
        );
      }

      return (
        <p key={idx} className="trans-paragraph">
          {renderTextWithCitations(trimmed)}
        </p>
      );
    });
  };

  return (
    <div className="pdf-translator-container">
      {/* Back Link */}
      <div className="tool-top-nav-row">
        <Link to="/" className="tool-back-link">
          <FontAwesomeIcon icon={faArrowLeft} /> Back to Tools
        </Link>
      </div>

      {/* Hero Header */}
      <div className="ai-tool-hero">
        <div className="ai-tool-icon">
          <FontAwesomeIcon icon={faLanguage} />
        </div>
        <div className="ai-tool-info">
          <h1 className="ai-tool-title">PDF Translator</h1>
          <p className="ai-tool-desc">
            Translate documents accurately into Tamil, Hindi, Spanish, French, German, Japanese, and more with editable Word (.docx) export.
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

      <div className="pdf-translator-content">
        {/* Step 1: File Uploader */}
        <AIFileUploader
          file={selectedFile}
          onSelectFile={handleSelectFile}
          onClear={handleClearFile}
          pageCount={docPageCount}
          isProcessing={isProcessing}
          title="Select or drop PDF document to translate"
          subtitle="Supports PDF documents up to 15MB"
        />

        {/* Step 2: Language Selector & Translate Button */}
        {selectedFile && !isProcessing && (
          <div className="translator-config-panel">
            <div className="translator-controls-row">
              <div className="translator-lang-wrapper">
                <AILanguageSelector
                  value={targetLanguage}
                  onChange={(val) => {
                    setTargetLanguage(val);
                    if (translationResult) {
                      setTranslationResult(null);
                    }
                  }}
                  disabled={isProcessing}
                  label="Translate Into:"
                />
              </div>

              <button
                type="button"
                className="btn-translate-main"
                onClick={executeTranslate}
                disabled={isProcessing}
              >
                <FontAwesomeIcon icon={faLanguage} />
                <span>Translate Document Now</span>
              </button>
            </div>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <AIProcessingIndicator
            statusMessage={statusMessage || `Translating document into ${targetLangMeta.label}...`}
          />
        )}

        {/* Error State */}
        {activeError && !isProcessing && (
          <AIErrorState
            error={activeError}
            onRetry={executeTranslate}
            onReset={handleClearFile}
            onSelectSample={handleSelectFile}
          />
        )}

        {/* Result View */}
        {!isProcessing && translationResult && (
          <div className="trans-result-panel">
            <AIResultToolbar
              content={translationResult.translatedText}
              rawDocumentName={selectedFile?.name || 'document'}
              wordCount={translationResult.wordCount}
              charCount={translationResult.charCount}
              downloadToken={translationResult.downloadToken}
              downloadUrl={translationResult.downloadUrl}
              onReset={handleClearFile}
              suffix={`translated_${targetLanguage}`}
            />

            <div className="trans-result-card">
              <div className="trans-result-header">
                <div className="trans-target-badge">
                  <FontAwesomeIcon icon={faGlobe} />
                  <span>
                    Translated into {targetLangMeta.label} ({targetLangMeta.nativeLabel})
                  </span>
                </div>

                <div className="trans-engine-meta">
                  <span className="trans-provider-tag">
                    {translationResult.provider === 'deepseek' ? 'DeepSeek V3' : translationResult.provider}
                  </span>
                  {translationResult.isDemo && (
                    <span className="trans-demo-tag">Official Demo Paper (0 Quota)</span>
                  )}
                </div>
              </div>

              <div className="trans-body-preview">
                {renderTranslationContent(translationResult.translatedText)}
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

