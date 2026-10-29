import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faWandMagicSparkles,
  faFilePdf,
  faFileWord,
  faFileImage,
  faArrowRight,
  faCircleCheck,
  faCircleExclamation,
  faRotateRight,
  faDownload,
  faBolt,
  faSliders,
  faFileLines,
  faCopy,
  faCheck,
  faServer,
  faUpload,
  faTrashCan,
  faSpinner,
  faClock,
  faBookOpen
} from '@fortawesome/free-solid-svg-icons';
import { checkOllamaStatus, interpretAIIntent, executeAITool } from '../services/api';
import './AIWorkspace.css';

const QUICK_PROMPTS = [
  { label: 'Convert to JPG', text: 'Convert my PDF into JPG images.' },
  { label: 'Convert to Word', text: 'Convert this PDF into an editable Word document.' },
  { label: 'Summarize PDF', text: 'Summarize this PDF document and give me key insights.' },
  { label: 'High-Res JPG (300 DPI)', text: 'Extract high-resolution 300 DPI JPG images from this PDF.' }
];

export default function AIWorkspace() {
  // Input & analysis state
  const [instruction, setInstruction] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [intentResult, setIntentResult] = useState(null);

  // File upload state
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Parameters state
  const [selectedParams, setSelectedParams] = useState({});

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [executionResult, setExecutionResult] = useState(null);

  // Status & error states
  const [ollamaStatus, setOllamaStatus] = useState(null);
  const [error, setError] = useState(null);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Check Ollama status on initial mount
  useEffect(() => {
    let mounted = true;
    async function loadStatus() {
      const status = await checkOllamaStatus();
      if (mounted) setOllamaStatus(status);
    }
    loadStatus();
    return () => { mounted = false; };
  }, []);

  // Sync parameters when intent changes
  useEffect(() => {
    if (intentResult && intentResult.parameters) {
      setSelectedParams(intentResult.parameters);
    } else {
      setSelectedParams({});
    }
  }, [intentResult]);

  // Handle intent analysis
  const handleAnalyzeIntent = async (textToAnalyze) => {
    const query = (textToAnalyze || instruction).trim();
    if (!query) {
      setError({ message: 'Please enter a prompt describing what you want to do with your document.' });
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setIntentResult(null);
    setExecutionResult(null);

    try {
      const result = await interpretAIIntent(query);
      setIntentResult(result);
      if (!result.is_supported) {
        setError({
          type: 'unsupported',
          message: result.explanation || 'This request is not currently supported in Phase 1.'
        });
      }
    } catch (err) {
      setError({
        type: 'ollama',
        message: err.message || 'Unable to interpret prompt via Ollama.'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Quick prompt chip click
  const handleQuickPrompt = (promptText) => {
    setInstruction(promptText);
    handleAnalyzeIntent(promptText);
  };

  // File selection
  const handleFileChange = (e) => {
    const selected = e.target.files && e.target.files[0];
    if (selected) {
      validateAndSetFile(selected);
    }
  };

  const validateAndSetFile = (f) => {
    setError(null);
    if (!f.name.toLowerCase().endsWith('.pdf')) {
      setError({ message: 'Please upload a valid PDF document (.pdf).' });
      return;
    }
    // Limit: 50MB
    if (f.size > 50 * 1024 * 1024) {
      setError({ message: 'File size exceeds maximum allowed limit of 50MB.' });
      return;
    }
    setFile(f);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  // Execute operation
  const handleExecute = async () => {
    if (!intentResult || !intentResult.tool) {
      setError({ message: 'Please analyze your instruction first to determine the required tool.' });
      return;
    }
    if (!file && intentResult.requires_file) {
      setError({ message: 'Please select or upload a PDF document before executing.' });
      return;
    }

    setIsExecuting(true);
    setExecutionProgress(5);
    setProgressStatus('Initializing execution pipeline...');
    setError(null);
    setExecutionResult(null);

    try {
      const result = await executeAITool(
        file,
        intentResult.tool,
        selectedParams,
        (progress, status) => {
          setExecutionProgress(progress);
          if (status) setProgressStatus(status);
        }
      );

      setExecutionResult(result);
      setExecutionProgress(100);
      setProgressStatus('Execution complete!');
    } catch (err) {
      setError({
        type: 'execution',
        message: err.message || 'Operation failed during document processing.'
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // Reset entire workflow
  const handleReset = () => {
    setInstruction('');
    setIntentResult(null);
    setFile(null);
    setExecutionResult(null);
    setError(null);
    setExecutionProgress(0);
    setProgressStatus('');
  };

  // Copy summary to clipboard
  const handleCopySummary = () => {
    if (executionResult && executionResult.summary && executionResult.summary.summary) {
      navigator.clipboard.writeText(executionResult.summary.summary);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getToolIcon = (tool) => {
    switch (tool) {
      case 'pdf_to_jpg': return faFileImage;
      case 'pdf_to_word': return faFileWord;
      case 'summarize_pdf': return faWandMagicSparkles;
      default: return faFilePdf;
    }
  };

  return (
    <div className="ai-workspace-page">
      {/* Breadcrumb Header */}
      <div className="ai-workspace-header">
        <nav className="ai-breadcrumbs" aria-label="Breadcrumbs">
          <Link to="/" className="breadcrumb-link">Home</Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">AI Workspace</span>
        </nav>

        {/* Runtime Status Badge */}
        <div className="runtime-status-pill">
          <FontAwesomeIcon icon={faServer} className="status-icon" />
          <span className="status-label">Local Ollama:</span>
          {ollamaStatus ? (
            ollamaStatus.available ? (
              <span className="status-badge available" title={`Model: ${ollamaStatus.model}`}>
                <span className="status-dot green" /> {ollamaStatus.model} Online
              </span>
            ) : (
              <span className="status-badge unavailable" title={ollamaStatus.error || 'Ollama offline'}>
                <span className="status-dot red" /> Offline
              </span>
            )
          ) : (
            <span className="status-badge checking">
              <FontAwesomeIcon icon={faSpinner} spin /> Checking...
            </span>
          )}
        </div>
      </div>

      {/* Hero Title */}
      <div className="ai-workspace-hero">
        <div className="hero-icon-container">
          <FontAwesomeIcon icon={faWandMagicSparkles} className="hero-main-icon" />
        </div>
        <h1 className="hero-title">Simatrix AI Workspace</h1>
        <p className="hero-description">
          Describe what you want to achieve with your PDF document in natural English.
          Your local Ollama assistant automatically determines the exact tool and parameters.
        </p>
      </div>

      {/* Main Interactive Grid */}
      <div className="ai-workspace-container">
        {/* Step 1: Prompt & Intent Analysis */}
        <div className="workspace-card prompt-card">
          <div className="card-header">
            <div className="step-badge">1</div>
            <div className="card-header-text">
              <h2 className="card-title">What would you like to do?</h2>
              <p className="card-subtitle">Type your instruction or choose a quick suggestion below</p>
            </div>
          </div>

          <div className="prompt-input-wrapper">
            <textarea
              className="prompt-textarea"
              placeholder="e.g. Convert my PDF into JPG images, or turn this into an editable Word document..."
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAnalyzeIntent();
                }
              }}
              rows={3}
              disabled={isAnalyzing || isExecuting}
            />

            <button
              type="button"
              className="analyze-btn"
              onClick={() => handleAnalyzeIntent()}
              disabled={isAnalyzing || !instruction.trim() || isExecuting}
            >
              {isAnalyzing ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faBolt} />
                  <span>Interpret Intent</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Suggestions Chips */}
          <div className="quick-prompts-row">
            <span className="quick-prompts-label">Try asking:</span>
            <div className="quick-chips">
              {QUICK_PROMPTS.map((qp, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="quick-chip"
                  onClick={() => handleQuickPrompt(qp.text)}
                  disabled={isAnalyzing || isExecuting}
                >
                  {qp.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Step 2: AI Interpretation Preview */}
        {intentResult && (
          <div className={`workspace-card intent-card ${intentResult.is_supported ? 'supported' : 'unsupported'}`}>
            <div className="card-header">
              <div className="step-badge">2</div>
              <div className="card-header-text">
                <h2 className="card-title">AI Interpretation Preview</h2>
                <p className="card-subtitle">
                  Interpreted by local <span className="model-name">{intentResult.model}</span>
                </p>
              </div>
            </div>

            <div className="intent-body">
              <div className="intent-meta-grid">
                <div className="intent-meta-item tool-detected">
                  <span className="meta-label">Detected Operation</span>
                  <div className="tool-pill">
                    <FontAwesomeIcon icon={getToolIcon(intentResult.tool)} className="tool-pill-icon" />
                    <span className="tool-pill-name">
                      {intentResult.suggested_action || intentResult.tool || 'Unsupported Request'}
                    </span>
                  </div>
                </div>

                <div className="intent-meta-item">
                  <span className="meta-label">Confidence</span>
                  <div className="confidence-meter">
                    <div
                      className="confidence-fill"
                      style={{ width: `${Math.round(intentResult.confidence * 100)}%` }}
                    />
                    <span className="confidence-text">{Math.round(intentResult.confidence * 100)}%</span>
                  </div>
                </div>
              </div>

              <div className="intent-explanation-box">
                <p className="intent-explanation-text">{intentResult.explanation}</p>
              </div>

              {/* Adjustable Tool Parameters */}
              {intentResult.is_supported && (
                <div className="tool-parameters-panel">
                  <div className="params-header">
                    <FontAwesomeIcon icon={faSliders} className="params-icon" />
                    <span className="params-title">Operational Settings:</span>
                  </div>

                  {intentResult.tool === 'pdf_to_jpg' && (
                    <div className="param-group">
                      <label className="param-label">Rendering Quality (DPI):</label>
                      <div className="param-options">
                        <button
                          type="button"
                          className={`param-chip ${(selectedParams.dpi || 150) === 150 ? 'active' : ''}`}
                          onClick={() => setSelectedParams(prev => ({ ...prev, dpi: 150 }))}
                        >
                          150 DPI (Balanced & Fast)
                        </button>
                        <button
                          type="button"
                          className={`param-chip ${(selectedParams.dpi) === 300 ? 'active' : ''}`}
                          onClick={() => setSelectedParams(prev => ({ ...prev, dpi: 300 }))}
                        >
                          300 DPI (Crisp Print Quality)
                        </button>
                      </div>
                    </div>
                  )}

                  {intentResult.tool === 'summarize_pdf' && (
                    <div className="param-group">
                      <label className="param-label">Summary Depth:</label>
                      <div className="param-options">
                        {[
                          { id: 'quick', label: 'Quick Overview' },
                          { id: 'detailed', label: 'Detailed Analysis' },
                          { id: 'key_points', label: 'Key Points' },
                          { id: 'section_by_section', label: 'Section by Section' }
                        ].map(m => (
                          <button
                            key={m.id}
                            type="button"
                            className={`param-chip ${(selectedParams.mode || 'quick') === m.id ? 'active' : ''}`}
                            onClick={() => setSelectedParams(prev => ({ ...prev, mode: m.id }))}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Document Upload & Confirmation */}
        {intentResult && intentResult.is_supported && (
          <div className="workspace-card upload-card">
            <div className="card-header">
              <div className="step-badge">3</div>
              <div className="card-header-text">
                <h2 className="card-title">Select Document & Confirm</h2>
                <p className="card-subtitle">Review proposed action and confirm execution</p>
              </div>
            </div>

            {/* Drag & Drop Zone */}
            <div
              className={`file-dropzone ${dragActive ? 'drag-active' : ''} ${file ? 'has-file' : ''}`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => !file && fileInputRef.current && fileInputRef.current.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="file-input-hidden"
                onChange={handleFileChange}
              />

              {!file ? (
                <div className="dropzone-empty">
                  <div className="dropzone-icon-wrap">
                    <FontAwesomeIcon icon={faUpload} className="dropzone-icon" />
                  </div>
                  <p className="dropzone-title">Click to upload or drag & drop your PDF</p>
                  <span className="dropzone-hint">Standard PDF documents up to 50MB</span>
                </div>
              ) : (
                <div className="dropzone-file-preview">
                  <div className="file-info-col">
                    <FontAwesomeIcon icon={faFilePdf} className="file-preview-icon" />
                    <div className="file-details">
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">{formatFileSize(file.size)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="file-remove-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    title="Remove file"
                  >
                    <FontAwesomeIcon icon={faTrashCan} />
                  </button>
                </div>
              )}
            </div>

            {/* Explicit Confirmation Bar */}
            <div className="confirmation-action-bar">
              <div className="action-summary">
                <span className="action-summary-label">Target Action:</span>
                <span className="action-summary-value">{intentResult.suggested_action}</span>
              </div>

              <button
                type="button"
                className="confirm-execute-btn"
                disabled={!file || isExecuting}
                onClick={handleExecute}
              >
                {isExecuting ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin />
                    <span>Processing Document...</span>
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faCircleCheck} />
                    <span>Confirm & Execute</span>
                  </>
                )}
              </button>
            </div>

            {/* Execution Progress Bar */}
            {isExecuting && (
              <div className="execution-progress-container">
                <div className="progress-info-row">
                  <span className="progress-status-text">{progressStatus}</span>
                  <span className="progress-percent-text">{executionProgress}%</span>
                </div>
                <div className="progress-bar-track">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${executionProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Notification Banner */}
        {error && (
          <div className="workspace-card error-card">
            <div className="error-card-content">
              <FontAwesomeIcon icon={faCircleExclamation} className="error-icon" />
              <div className="error-text-block">
                <h4 className="error-title">Notice</h4>
                <p className="error-message">{error.message}</p>
              </div>
            </div>
            {error.type === 'ollama' && (
              <button
                type="button"
                className="error-retry-btn"
                onClick={() => handleAnalyzeIntent()}
              >
                <FontAwesomeIcon icon={faRotateRight} /> Retry Connection
              </button>
            )}
          </div>
        )}

        {/* Step 4: Output & Results */}
        {executionResult && (
          <div className="workspace-card result-card">
            <div className="result-header">
              <div className="result-header-left">
                <FontAwesomeIcon icon={faCircleCheck} className="result-success-icon" />
                <div>
                  <h2 className="result-title">Processing Complete!</h2>
                  <p className="result-subtitle">
                    {executionResult.tool === 'summarize_pdf'
                      ? 'AI Summary ready for reading and export'
                      : `Output file ready: ${executionResult.filename}`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="new-task-btn"
                onClick={handleReset}
              >
                Process Another File
              </button>
            </div>

            {/* Result for PDF-to-JPG and PDF-to-Word */}
            {executionResult.download_url && (
              <div className="file-download-box">
                <div className="file-meta-row">
                  <div className="meta-badge">
                    <span className="meta-badge-label">Pages:</span>
                    <span className="meta-badge-val">{executionResult.page_count}</span>
                  </div>
                  <div className="meta-badge">
                    <span className="meta-badge-label">Output Size:</span>
                    <span className="meta-badge-val">{formatFileSize(executionResult.size_bytes)}</span>
                  </div>
                  {executionResult.execution_time_ms > 0 && (
                    <div className="meta-badge">
                      <FontAwesomeIcon icon={faClock} className="meta-badge-icon" />
                      <span className="meta-badge-val">{executionResult.execution_time_ms} ms</span>
                    </div>
                  )}
                </div>

                <div className="download-buttons-group">
                  <a
                    href={executionResult.download_url}
                    download={executionResult.filename}
                    className="primary-download-btn"
                  >
                    <FontAwesomeIcon icon={faDownload} />
                    <span>Download {executionResult.is_zip ? 'All Pages (ZIP)' : executionResult.filename}</span>
                  </a>
                </div>

                {/* Individual JPG Page Images Preview */}
                {executionResult.images && executionResult.images.length > 0 && (
                  <div className="images-list-container">
                    <h3 className="images-list-title">Rendered JPG Pages:</h3>
                    <div className="images-grid">
                      {executionResult.images.map((img) => (
                        <div key={img.page} className="image-card">
                          <div className="image-card-header">
                            <span className="page-number-tag">Page {img.page}</span>
                            <span className="page-size-tag">{formatFileSize(img.size_bytes)}</span>
                          </div>
                          <a
                            href={img.download_url}
                            download={img.filename}
                            className="image-download-link"
                          >
                            <FontAwesomeIcon icon={faDownload} /> Download JPG
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Result for Summarizer */}
            {executionResult.summary && (
              <div className="summary-result-box">
                <div className="summary-metrics-row">
                  <div className="metric-item">
                    <FontAwesomeIcon icon={faBookOpen} className="metric-icon" />
                    <span>{executionResult.summary.word_count || 0} words</span>
                  </div>
                  <div className="metric-item">
                    <FontAwesomeIcon icon={faClock} className="metric-icon" />
                    <span>~{executionResult.summary.estimated_reading_time_minutes || 1} min read</span>
                  </div>
                  <button
                    type="button"
                    className="copy-summary-btn"
                    onClick={handleCopySummary}
                  >
                    <FontAwesomeIcon icon={copiedSummary ? faCheck : faCopy} />
                    <span>{copiedSummary ? 'Copied!' : 'Copy Summary'}</span>
                  </button>
                </div>

                <div className="summary-content-viewport">
                  <div className="summary-markdown-text">
                    {executionResult.summary.summary}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

