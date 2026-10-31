import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faScaleBalanced,
  faArrowLeft,
  faPlus,
  faMinus,
  faPen,
  faCheck,
  faFilePdf,
  faTrashCan,
  faCodeCompare
} from '@fortawesome/free-solid-svg-icons';
import {
  AIQuotaBanner,
  AIConsentDialog,
  hasUserGivenAIConsent,
  setUserAIConsent,
  AIProcessingIndicator,
  AIErrorState,
  AILimitReachedModal,
  AIResultToolbar,
  renderTextWithCitations
} from '../components/ai';
import { formatBytes } from '../utils/fileUtils';
import { comparePdfAI, fetchAIQuota } from '../services/api';
import './PDFComparison.css';

export default function PDFComparison() {
  const [file1, setFile1] = useState(null);
  const [file2, setFile2] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [result, setResult] = useState(null);
  const [activeError, setActiveError] = useState(null);
  const [quota, setQuota] = useState(null);
  const [quotaLoading, setQuotaLoading] = useState(false);
  const [consentDialogOpen, setConsentDialogOpen] = useState(false);
  const [limitModalOpen, setLimitModalOpen] = useState(false);

  const fileInputRef1 = useRef(null);
  const fileInputRef2 = useRef(null);
  const pendingOperationRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    loadQuota();
  }, []);

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

  const handleSelectFile1 = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile1(e.target.files[0]);
      setResult(null);
      setActiveError(null);
    }
  };

  const handleSelectFile2 = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile2(e.target.files[0]);
      setResult(null);
      setActiveError(null);
    }
  };

  const handleLoadSampleComparison = async () => {
    try {
      const res1 = await fetch('/sample_document.pdf');
      const blob1 = await res1.blob();
      const f1 = new File([blob1], 'sample_document_v1.pdf', { type: 'application/pdf' });
      const f2 = new File([blob1], 'sample_document_v2.pdf', { type: 'application/pdf' });
      setFile1(f1);
      setFile2(f2);
      setResult(null);
      setActiveError(null);
    } catch (err) {
      console.warn('Failed to load sample comparison:', err);
    }
  };

  const handleClearAll = () => {
    setFile1(null);
    setFile2(null);
    setResult(null);
    setActiveError(null);
    setIsProcessing(false);
  };

  const executeComparison = async () => {
    if (!file1 || isProcessing) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setActiveError({
        message: 'Network Offline: PDF comparison requires an active internet connection.',
        code: 'NETWORK_OFFLINE'
      });
      return;
    }

    if (quota && quota.remaining <= 0 && !result?.is_demo) {
      setLimitModalOpen(true);
      return;
    }

    if (!hasUserGivenAIConsent()) {
      pendingOperationRef.current = executeComparison;
      setConsentDialogOpen(true);
      return;
    }

    setIsProcessing(true);
    setActiveError(null);
    setStatusMessage('Aligning documents and performing structural & semantic comparison...');

    try {
      const res = await comparePdfAI({
        file: file1,
        file2: file2,
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
      console.error('Comparison error:', err);
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

  const exportText = result
    ? [
        `# PDF Comparison Report`,
        `Doc 1: ${file1?.name || 'Document 1'}`,
        `Doc 2: ${file2?.name || 'Document 2 (or Baseline)'}`,
        '',
        result.differences_summary ? `## Summary of Differences\n${result.differences_summary}` : '',
        result.additions?.length ? `\n## Additions\n${result.additions.map((a) => `+ ${a}`).join('\n')}` : '',
        result.deletions?.length ? `\n## Deletions\n${result.deletions.map((d) => `- ${d}`).join('\n')}` : '',
        result.modifications?.length
          ? `\n## Modifications\n${result.modifications.map((m) => `~ ${m}`).join('\n')}`
          : '',
        result.comparison ? `\n## Detailed Analysis\n${result.comparison}` : ''
      ]
        .filter(Boolean)
        .join('\n')
    : '';

  return (
    <div className="cmp-container">
      {/* Top Navigation Row */}
      <div className="tool-top-nav-row">
        <Link to="/" className="tool-back-link">
          <FontAwesomeIcon icon={faArrowLeft} /> Back to Tools
        </Link>
      </div>

      {/* Hero Header */}
      <div className="ai-tool-hero">
        <div className="ai-tool-icon">
          <FontAwesomeIcon icon={faScaleBalanced} />
        </div>
        <div className="ai-tool-info">
          <h1 className="ai-tool-title">PDF Comparison</h1>
          <p className="ai-tool-desc">
            Compare two PDF documents to identify additions, deletions, revisions, and semantic discrepancies.
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

      <div className="cmp-content">
        {/* Dual Upload Cards */}
        <div className="cmp-upload-grid">
          {/* Doc 1 */}
          <div className="cmp-upload-card">
            <span className="cmp-upload-tag">Document 1 (Original)</span>
            <input
              ref={fileInputRef1}
              type="file"
              accept=".pdf,application/pdf"
              style={{ display: 'none' }}
              onChange={handleSelectFile1}
              disabled={isProcessing}
            />

            {file1 ? (
              <div className="cmp-selected-box">
                <FontAwesomeIcon icon={faFilePdf} className="cmp-pdf-icon" />
                <div className="cmp-file-meta">
                  <span className="cmp-file-name" title={file1.name}>{file1.name}</span>
                  <span className="cmp-file-size">{formatBytes(file1.size)}</span>
                </div>
                <button
                  type="button"
                  className="cmp-btn-change"
                  onClick={() => fileInputRef1.current?.click()}
                  disabled={isProcessing}
                >
                  Change
                </button>
              </div>
            ) : (
              <div
                className="cmp-dropzone"
                onClick={() => fileInputRef1.current?.click()}
              >
                <FontAwesomeIcon icon={faFilePdf} className="cmp-dz-icon" />
                <span className="cmp-dz-text">Choose Original PDF</span>
                <span className="cmp-dz-sub">or drop document here</span>
              </div>
            )}
          </div>

          {/* Doc 2 */}
          <div className="cmp-upload-card">
            <span className="cmp-upload-tag">Document 2 (Revised / Comparison)</span>
            <input
              ref={fileInputRef2}
              type="file"
              accept=".pdf,application/pdf"
              style={{ display: 'none' }}
              onChange={handleSelectFile2}
              disabled={isProcessing}
            />

            {file2 ? (
              <div className="cmp-selected-box">
                <FontAwesomeIcon icon={faFilePdf} className="cmp-pdf-icon" />
                <div className="cmp-file-meta">
                  <span className="cmp-file-name" title={file2.name}>{file2.name}</span>
                  <span className="cmp-file-size">{formatBytes(file2.size)}</span>
                </div>
                <button
                  type="button"
                  className="cmp-btn-change"
                  onClick={() => fileInputRef2.current?.click()}
                  disabled={isProcessing}
                >
                  Change
                </button>
              </div>
            ) : (
              <div
                className="cmp-dropzone"
                onClick={() => fileInputRef2.current?.click()}
              >
                <FontAwesomeIcon icon={faFilePdf} className="cmp-dz-icon" />
                <span className="cmp-dz-text">Choose Revised PDF</span>
                <span className="cmp-dz-sub">or drop document here</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="cmp-actions-center">
          <button
            type="button"
            className="ai-btn-generate-main"
            onClick={executeComparison}
            disabled={!file1 || isProcessing}
          >
            <FontAwesomeIcon icon={faCodeCompare} />
            <span>Compare Documents Now</span>
          </button>

          {!file1 && (
            <button
              type="button"
              className="cmp-btn-sample"
              onClick={handleLoadSampleComparison}
              disabled={isProcessing}
            >
              Try Sample Comparison (Zero Quota)
            </button>
          )}

          {file1 && (
            <button
              type="button"
              className="cmp-btn-clear"
              onClick={handleClearAll}
              disabled={isProcessing}
            >
              <FontAwesomeIcon icon={faTrashCan} />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Processing Indicator */}
        {isProcessing && (
          <AIProcessingIndicator
            statusMessage={statusMessage || 'Analyzing structural and semantic diffs...'}
          />
        )}

        {/* Error State */}
        {activeError && !isProcessing && (
          <AIErrorState
            error={activeError}
            onRetry={executeComparison}
            onReset={handleClearAll}
          />
        )}

        {/* Results Presentation */}
        {!isProcessing && result && (
          <div className="cmp-result-panel">
            <AIResultToolbar
              content={exportText}
              rawDocumentName={file1?.name || 'comparison'}
              onReset={handleClearAll}
              suffix="comparison_report"
            />

            {/* Differences Summary Card */}
            {result.differences_summary && (
              <div className="cmp-card summary-card">
                <div className="cmp-card-header">
                  <FontAwesomeIcon icon={faCodeCompare} className="cmp-icon" />
                  <h3>Differences Summary</h3>
                </div>
                <p className="cmp-summary-text">
                  {renderTextWithCitations(result.differences_summary)}
                </p>
              </div>
            )}

            {/* Additions, Deletions, Modifications Grid */}
            <div className="cmp-diff-grid">
              {/* Additions */}
              <div className="cmp-card add-card">
                <div className="cmp-card-header">
                  <FontAwesomeIcon icon={faPlus} className="diff-icon green" />
                  <h3>Additions</h3>
                </div>
                {result.additions && result.additions.length > 0 ? (
                  <ul className="cmp-diff-list">
                    {result.additions.map((item, idx) => (
                      <li key={idx} className="diff-item-add">
                        {renderTextWithCitations(item)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="diff-empty">No additions detected</span>
                )}
              </div>

              {/* Deletions */}
              <div className="cmp-card del-card">
                <div className="cmp-card-header">
                  <FontAwesomeIcon icon={faMinus} className="diff-icon red" />
                  <h3>Deletions</h3>
                </div>
                {result.deletions && result.deletions.length > 0 ? (
                  <ul className="cmp-diff-list">
                    {result.deletions.map((item, idx) => (
                      <li key={idx} className="diff-item-del">
                        {renderTextWithCitations(item)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="diff-empty">No deletions detected</span>
                )}
              </div>

              {/* Modifications */}
              <div className="cmp-card mod-card">
                <div className="cmp-card-header">
                  <FontAwesomeIcon icon={faPen} className="diff-icon blue" />
                  <h3>Modifications</h3>
                </div>
                {result.modifications && result.modifications.length > 0 ? (
                  <ul className="cmp-diff-list">
                    {result.modifications.map((item, idx) => (
                      <li key={idx} className="diff-item-mod">
                        {renderTextWithCitations(item)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="diff-empty">No modifications detected</span>
                )}
              </div>
            </div>

            {/* Detailed Content */}
            {result.comparison && (
              <div className="cmp-card">
                <div className="cmp-card-header">
                  <h3>Detailed Semantic Diff Report</h3>
                </div>
                <div className="cmp-report-body">
                  {result.comparison.split('\n').map((line, i) => (
                    <p key={i}>{renderTextWithCitations(line)}</p>
                  ))}
                </div>
              </div>
            )}
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
        onSelectSample={() => handleLoadSampleComparison()}
      />
    </div>
  );
}

