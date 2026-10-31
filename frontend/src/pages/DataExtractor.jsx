import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTable,
  faArrowLeft,
  faFileCsv,
  faFileCode,
  faDatabase,
  faTags
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
import { downloadFile } from '../utils/fileUtils';
import { extractDataAI, fetchAIQuota } from '../services/api';
import './DataExtractor.css';

export default function DataExtractor() {
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
        message: 'Network Offline: Tabular data extraction requires an active internet connection.',
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
    setStatusMessage('Scanning document for tables, numbers, and key-value metrics...');

    try {
      const res = await extractDataAI({
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
      console.error('Data Extractor error:', err);
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

  const handleDownloadCsv = () => {
    if (!result?.tables || result.tables.length === 0) return;
    const base = (selectedFile?.name || 'document').replace(/\.[^/.]+$/, '');

    const csvLines = [];
    result.tables.forEach((tbl, tIdx) => {
      if (tbl.title) csvLines.push(`"${tbl.title}"`);
      if (tbl.headers) csvLines.push(tbl.headers.map((h) => `"${h}"`).join(','));
      if (tbl.rows) {
        tbl.rows.forEach((r) => {
          csvLines.push(r.map((c) => `"${c}"`).join(','));
        });
      }
      csvLines.push('');
    });

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8' });
    downloadFile(blob, `${base}_extracted_tables.csv`);
  };

  const handleDownloadJson = () => {
    if (!result) return;
    const base = (selectedFile?.name || 'document').replace(/\.[^/.]+$/, '');
    const dataToExport = {
      source_file: selectedFile?.name,
      tables: result.tables || [],
      key_values: result.key_values || {},
      raw_content: result.content
    };
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    downloadFile(blob, `${base}_extracted_data.json`);
  };

  const exportText = result?.content || JSON.stringify(result, null, 2);

  return (
    <div className="de-container">
      {/* Top Navigation Row */}
      <div className="tool-top-nav-row">
        <Link to="/" className="tool-back-link">
          <FontAwesomeIcon icon={faArrowLeft} /> Back to Tools
        </Link>
      </div>

      {/* Hero Header */}
      <div className="ai-tool-hero">
        <div className="ai-tool-icon">
          <FontAwesomeIcon icon={faTable} />
        </div>
        <div className="ai-tool-info">
          <h1 className="ai-tool-title">Data Extractor</h1>
          <p className="ai-tool-desc">
            Extract tables, financial figures, metrics, and key-value pairs from PDF documents into structured CSV and JSON.
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

      <div className="de-content">
        {/* Step 1: File Uploader */}
        <AIFileUploader
          file={selectedFile}
          onSelectFile={handleSelectFile}
          onClear={handleClearFile}
          pageCount={docPageCount}
          isProcessing={isProcessing}
          title="Select or drop PDF to extract tables and data"
          subtitle="Supports PDF documents up to 15MB"
        />

        {/* Step 2: Action Button */}
        {selectedFile && !result && !isProcessing && (
          <div className="de-action-row">
            <button
              type="button"
              className="ai-btn-generate-main"
              onClick={executeExtraction}
              disabled={isProcessing}
            >
              <FontAwesomeIcon icon={faTable} />
              <span>Extract Structured Data Now</span>
            </button>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <AIProcessingIndicator
            statusMessage={statusMessage || 'Extracting tabular data and entities...'}
          />
        )}

        {/* Error State */}
        {activeError && !isProcessing && (
          <AIErrorState
            error={activeError}
            onRetry={executeExtraction}
            onReset={handleClearFile}
          />
        )}

        {/* Results Presentation */}
        {!isProcessing && result && (
          <div className="de-result-panel">
            <AIResultToolbar
              content={exportText}
              rawDocumentName={selectedFile?.name || 'document'}
              onReset={handleClearFile}
              suffix="data_extracted"
            />

            <div className="de-export-actions-row">
              {result.tables && result.tables.length > 0 && (
                <button type="button" className="de-btn-export" onClick={handleDownloadCsv}>
                  <FontAwesomeIcon icon={faFileCsv} />
                  <span>Download .CSV</span>
                </button>
              )}
              <button type="button" className="de-btn-export" onClick={handleDownloadJson}>
                <FontAwesomeIcon icon={faFileCode} />
                <span>Download .JSON</span>
              </button>
            </div>

            {/* Key-Value Pairs Card */}
            {result.key_values && Object.keys(result.key_values).length > 0 && (
              <div className="de-card">
                <div className="de-card-header">
                  <FontAwesomeIcon icon={faTags} className="de-icon" />
                  <h3>Extracted Entities & Key-Values</h3>
                </div>
                <div className="de-kv-grid">
                  {Object.entries(result.key_values).map(([k, v], idx) => (
                    <div key={idx} className="de-kv-item">
                      <span className="de-kv-key">{k}</span>
                      <span className="de-kv-val">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tables */}
            {result.tables && result.tables.length > 0 ? (
              result.tables.map((table, tIdx) => (
                <div key={tIdx} className="de-card table-card">
                  <div className="de-card-header">
                    <FontAwesomeIcon icon={faTable} className="de-icon" />
                    <h3>{table.title || `Extracted Table ${tIdx + 1}`}</h3>
                  </div>
                  <div className="de-table-responsive">
                    <table className="de-table">
                      {table.headers && (
                        <thead>
                          <tr>
                            {table.headers.map((h, hIdx) => (
                              <th key={hIdx}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                      )}
                      <tbody>
                        {table.rows?.map((row, rIdx) => (
                          <tr key={rIdx}>
                            {row.map((cell, cIdx) => (
                              <td key={cIdx}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            ) : null}

            {/* Raw Content Fallback */}
            {result.content && (!result.tables || result.tables.length === 0) && (
              <div className="de-card">
                <div className="de-card-header">
                  <FontAwesomeIcon icon={faDatabase} className="de-icon" />
                  <h3>Extracted Data Preview</h3>
                </div>
                <div className="de-raw-body">
                  {result.content.split('\n').map((line, i) => (
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
      />
    </div>
  );
}

