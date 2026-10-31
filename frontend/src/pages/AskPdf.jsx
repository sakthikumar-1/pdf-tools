import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faComments,
  faArrowLeft,
  faPaperPlane,
  faRotateRight,
  faTrashCan,
  faBookOpen,
  faShieldHalved,
  faFilePdf,
  faClock,
  faCircleCheck,
  faBan,
  faArrowDown
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
  renderTextWithCitations,
  AIPageCitation
} from '../components/ai';
import { getPdfPageCount } from '../utils/pdfPageCounter';
import { chatPdfAI, deleteAIChatSession, fetchAIQuota } from '../services/api';
import './AskPdf.css';

const SUGGESTED_QUESTIONS = [
  'What is the executive summary of this document?',
  'What are the primary findings and conclusions?',
  'What key data points or metrics are reported?',
  'What methodology or framework is presented?'
];

export default function AskPdf() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [docPageCount, setDocPageCount] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [activeError, setActiveError] = useState(null);
  const [quota, setQuota] = useState(null);
  const [quotaLoading, setQuotaLoading] = useState(false);
  const [consentDialogOpen, setConsentDialogOpen] = useState(false);
  const [limitModalOpen, setLimitModalOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const pendingQueryRef = useRef(null);
  const inputRef = useRef(null);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

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
    // If selecting a different file, reset chat session
    setSelectedFile(file);
    setSessionId(null);
    setMessages([]);
    setActiveError(null);
  };

  const handleClearFile = async () => {
    if (sessionId) {
      await deleteAIChatSession(sessionId).catch(() => {});
    }
    setSelectedFile(null);
    setSessionId(null);
    setMessages([]);
    setActiveError(null);
    setDocPageCount(null);
    setIsProcessing(false);
  };

  const handleSendMessage = async (queryToSend = null) => {
    const q = (queryToSend || inputQuery).trim();
    if (!q || isProcessing) return;

    if (!selectedFile && !sessionId) {
      setActiveError({
        message: 'Please select or drop a PDF document first before asking questions.',
        code: 'NO_DOCUMENT'
      });
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setActiveError({
        message: 'Network Offline: Ask PDF requires an active internet connection to query AI models.',
        code: 'NETWORK_OFFLINE'
      });
      return;
    }

    if (quota && quota.remaining <= 0 && messages.every((m) => !m.isDemo)) {
      setLimitModalOpen(true);
      return;
    }

    if (!hasUserGivenAIConsent()) {
      pendingQueryRef.current = q;
      setConsentDialogOpen(true);
      return;
    }

    // Add user message to UI immediately
    const userMsg = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsProcessing(true);
    setActiveError(null);
    setStatusMessage('Searching document chunks & formulating response...');

    try {
      const response = await chatPdfAI({
        file: sessionId ? null : selectedFile, // Only send file on initial session creation
        sessionId: sessionId,
        query: q,
        consent: true,
        onProgress: (percent, msg) => {
          if (msg) setStatusMessage(msg);
        }
      });

      if (response.sessionId) {
        setSessionId(response.sessionId);
      }

      if (response.quota) {
        setQuota(response.quota);
      } else {
        loadQuota();
      }

      const assistantMsg = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        citedPages: response.citedPages || [],
        isGrounded: response.isGrounded,
        provider: response.provider,
        model: response.model,
        isDemo: response.isDemo,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Ask PDF error:', err);
      if (err.code === 'AI_LIMIT_REACHED') {
        setLimitModalOpen(true);
      }
      setActiveError(err);
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleConsentConfirm = () => {
    setUserAIConsent(true);
    setConsentDialogOpen(false);
    if (pendingQueryRef.current) {
      const q = pendingQueryRef.current;
      pendingQueryRef.current = null;
      handleSendMessage(q);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = async () => {
    if (sessionId) {
      await deleteAIChatSession(sessionId).catch(() => {});
    }
    setSessionId(null);
    setMessages([]);
    setActiveError(null);
  };

  return (
    <div className="ask-pdf-container">
      {/* Back Link */}
      <div className="tool-top-nav-row">
        <Link to="/" className="tool-back-link">
          <FontAwesomeIcon icon={faArrowLeft} /> Back to Tools
        </Link>
      </div>

      {/* Hero Header */}
      <div className="ai-tool-hero">
        <div className="ai-tool-icon">
          <FontAwesomeIcon icon={faComments} />
        </div>
        <div className="ai-tool-info">
          <h1 className="ai-tool-title">Ask PDF (AI Chat)</h1>
          <p className="ai-tool-desc">
            Chat with any PDF document. Get answers with exact page citations, powered by grounded BM25 chunk retrieval and DeepSeek / Gemini AI.
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

      <div className="ask-pdf-content">
        {/* Step 1: Upload or Document Header */}
        {!selectedFile ? (
          <AIFileUploader
            file={selectedFile}
            onSelectFile={handleSelectFile}
            onClear={handleClearFile}
            title="Select or drop PDF to begin conversation"
            subtitle="Chat across up to 15MB PDF documents"
          />
        ) : (
          <div className="ask-pdf-chat-layout">
            {/* Active Document Info Bar */}
            <div className="ask-doc-bar">
              <div className="ask-doc-info">
                <div className="ask-doc-icon">
                  <FontAwesomeIcon icon={faFilePdf} />
                </div>
                <div className="ask-doc-meta">
                  <span className="ask-doc-title" title={selectedFile.name}>
                    {selectedFile.name}
                  </span>
                  <div className="ask-doc-chips">
                    {docPageCount !== null && (
                      <span className="ask-chip">
                        <FontAwesomeIcon icon={faBookOpen} /> {docPageCount} pages
                      </span>
                    )}
                    {sessionId && (
                      <span className="ask-chip active">
                        Session Active (24h)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="ask-doc-actions">
                {messages.length > 0 && (
                  <button
                    type="button"
                    className="ask-btn-tool"
                    onClick={handleClearChat}
                    title="Clear chat history and start fresh"
                  >
                    <FontAwesomeIcon icon={faRotateRight} />
                    <span>New Chat</span>
                  </button>
                )}
                <button
                  type="button"
                  className="ask-btn-tool"
                  onClick={handleClearFile}
                  title="Upload a different PDF document"
                >
                  <FontAwesomeIcon icon={faTrashCan} />
                  <span>Change File</span>
                </button>
              </div>
            </div>

            {/* Error Display */}
            {activeError && (
              <AIErrorState
                error={activeError}
                onRetry={() => handleSendMessage()}
                onReset={handleClearFile}
                onSelectSample={handleSelectFile}
              />
            )}

            {/* Chat Conversation Area */}
            <div className="ask-chat-window">
              {messages.length === 0 ? (
                <div className="ask-chat-empty-state">
                  <div className="ask-empty-icon">
                    <FontAwesomeIcon icon={faComments} />
                  </div>
                  <h3 className="ask-empty-title">Ready to Answer Questions</h3>
                  <p className="ask-empty-desc">
                    Ask any question about <strong>{selectedFile.name}</strong>. Answers are grounded in the document with page citations.
                  </p>

                  <div className="ask-suggested-section">
                    <span className="ask-suggested-label">Suggested Questions:</span>
                    <div className="ask-suggested-chips">
                      {SUGGESTED_QUESTIONS.map((q, i) => (
                        <button
                          key={i}
                          type="button"
                          className="ask-suggested-chip"
                          onClick={() => handleSendMessage(q)}
                          disabled={isProcessing}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="ask-messages-list">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`ask-message-bubble ${msg.role === 'user' ? 'user' : 'assistant'}`}
                    >
                      <div className="ask-message-header">
                        <span className="ask-message-author">
                          {msg.role === 'user' ? 'You' : 'Simatrix AI'}
                        </span>
                        <span className="ask-message-time">{msg.timestamp}</span>
                      </div>

                      <div className="ask-message-body">
                        {renderTextWithCitations(msg.content)}
                      </div>

                      {msg.role === 'assistant' && msg.citedPages && msg.citedPages.length > 0 && (
                        <div className="ask-message-citations">
                          <span className="ask-citations-label">Sources:</span>
                          {msg.citedPages.map((p, idx) => (
                            <AIPageCitation key={idx} pageNumber={p} />
                          ))}
                        </div>
                      )}

                      {msg.role === 'assistant' && msg.isDemo && (
                        <div className="ask-message-footer-meta">
                          <span className="ask-demo-badge">Official Demo Paper (0 Quota)</span>
                        </div>
                      )}
                    </div>
                  ))}

                  {isProcessing && (
                    <div className="ask-message-bubble assistant processing">
                      <div className="ask-message-header">
                        <span className="ask-message-author">Simatrix AI</span>
                      </div>
                      <div className="ask-typing-indicator">
                        <div className="ask-typing-dot" />
                        <div className="ask-typing-dot" />
                        <div className="ask-typing-dot" />
                        <span className="ask-typing-text">{statusMessage || 'Thinking...'}</span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}

              {/* Chat Input Bar */}
              <div className="ask-input-container">
                <textarea
                  ref={inputRef}
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Ask a question about ${selectedFile.name}... (Press Enter to send)`}
                  rows={2}
                  disabled={isProcessing}
                  className="ask-textarea"
                />
                <button
                  type="button"
                  className="ask-btn-send"
                  onClick={() => handleSendMessage()}
                  disabled={!inputQuery.trim() || isProcessing}
                  title="Send message"
                  aria-label="Send message"
                >
                  <FontAwesomeIcon icon={faPaperPlane} />
                </button>
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
