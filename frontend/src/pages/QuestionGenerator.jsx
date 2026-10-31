import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleQuestion,
  faArrowLeft,
  faCheck,
  faXmark,
  faCircleInfo,
  faRotateRight,
  faLightbulb
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
import { generateQuestionsAI, fetchAIQuota } from '../services/api';
import './QuestionGenerator.css';

export default function QuestionGenerator() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [docPageCount, setDocPageCount] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [result, setResult] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [revealedAnswers, setRevealedAnswers] = useState({});
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
    setSelectedAnswers({});
    setRevealedAnswers({});
    setActiveError(null);
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setResult(null);
    setSelectedAnswers({});
    setRevealedAnswers({});
    setActiveError(null);
    setDocPageCount(null);
    setIsProcessing(false);
  };

  const executeGeneration = async () => {
    if (!selectedFile || isProcessing) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setActiveError({
        message: 'Network Offline: Question generation requires an active internet connection.',
        code: 'NETWORK_OFFLINE'
      });
      return;
    }

    if (quota && quota.remaining <= 0 && !result?.is_demo) {
      setLimitModalOpen(true);
      return;
    }

    if (!hasUserGivenAIConsent()) {
      pendingOperationRef.current = executeGeneration;
      setConsentDialogOpen(true);
      return;
    }

    setIsProcessing(true);
    setActiveError(null);
    setStatusMessage('Analyzing document context and synthesizing study questions...');

    try {
      const res = await generateQuestionsAI({
        file: selectedFile,
        consent: true,
        onProgress: (percent, msg) => {
          if (msg) setStatusMessage(msg);
        }
      });

      setResult(res);
      setSelectedAnswers({});
      setRevealedAnswers({});
      if (res.quota) {
        setQuota(res.quota);
      } else {
        loadQuota();
      }
    } catch (err) {
      console.error('Question Generator error:', err);
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

  const handleSelectOption = (qIdx, option) => {
    setSelectedAnswers((prev) => ({ ...prev, [qIdx]: option }));
    setRevealedAnswers((prev) => ({ ...prev, [qIdx]: true }));
  };

  const exportText = result?.questions?.length
    ? result.questions
        .map(
          (q, i) =>
            `Q${i + 1}: ${q.question}\n` +
            (q.options ? q.options.map((opt) => `  - ${opt}`).join('\n') + '\n' : '') +
            `Answer: ${q.correct_answer || 'N/A'}\n` +
            (q.explanation ? `Explanation: ${q.explanation}\n` : '')
        )
        .join('\n\n')
    : result?.content || '';

  return (
    <div className="qg-container">
      {/* Top Navigation Row */}
      <div className="tool-top-nav-row">
        <Link to="/" className="tool-back-link">
          <FontAwesomeIcon icon={faArrowLeft} /> Back to Tools
        </Link>
      </div>

      {/* Hero Header */}
      <div className="ai-tool-hero">
        <div className="ai-tool-icon">
          <FontAwesomeIcon icon={faCircleQuestion} />
        </div>
        <div className="ai-tool-info">
          <h1 className="ai-tool-title">Question Generator</h1>
          <p className="ai-tool-desc">
            Automatically generate multiple-choice quizzes, comprehension questions, and study cards from any PDF document.
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

      <div className="qg-content">
        {/* Step 1: File Uploader */}
        <AIFileUploader
          file={selectedFile}
          onSelectFile={handleSelectFile}
          onClear={handleClearFile}
          pageCount={docPageCount}
          isProcessing={isProcessing}
          title="Select or drop PDF to generate study questions"
          subtitle="Supports PDF documents up to 15MB"
        />

        {/* Step 2: Action Button */}
        {selectedFile && !result && !isProcessing && (
          <div className="qg-action-row">
            <button
              type="button"
              className="ai-btn-generate-main"
              onClick={executeGeneration}
              disabled={isProcessing}
            >
              <FontAwesomeIcon icon={faCircleQuestion} />
              <span>Generate Questions Now</span>
            </button>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <AIProcessingIndicator
            statusMessage={statusMessage || 'Formulating questions and explanations...'}
          />
        )}

        {/* Error State */}
        {activeError && !isProcessing && (
          <AIErrorState
            error={activeError}
            onRetry={executeGeneration}
            onReset={handleClearFile}
          />
        )}

        {/* Results Presentation */}
        {!isProcessing && result && (
          <div className="qg-result-panel">
            <AIResultToolbar
              content={exportText}
              rawDocumentName={selectedFile?.name || 'document'}
              onReset={handleClearFile}
              suffix="study_questions"
            />

            {/* Questions List */}
            {result.questions && result.questions.length > 0 ? (
              <div className="qg-questions-list">
                {result.questions.map((qItem, qIdx) => {
                  const selectedOpt = selectedAnswers[qIdx];
                  const isRevealed = revealedAnswers[qIdx];
                  const isCorrect = selectedOpt === qItem.correct_answer;

                  return (
                    <div key={qIdx} className="qg-question-card">
                      <div className="qg-q-header">
                        <span className="qg-q-number">Question {qIdx + 1}</span>
                      </div>
                      <h3 className="qg-q-title">{qItem.question}</h3>

                      {/* Options */}
                      {qItem.options && (
                        <div className="qg-options-grid">
                          {qItem.options.map((opt, oIdx) => {
                            let optClass = 'qg-option-btn';
                            if (isRevealed) {
                              if (opt === qItem.correct_answer) {
                                optClass += ' is-correct';
                              } else if (opt === selectedOpt) {
                                optClass += ' is-wrong';
                              }
                            } else if (selectedOpt === opt) {
                              optClass += ' is-selected';
                            }

                            return (
                              <button
                                key={oIdx}
                                type="button"
                                className={optClass}
                                onClick={() => handleSelectOption(qIdx, opt)}
                              >
                                <span className="opt-letter">
                                  {String.fromCharCode(65 + oIdx)}.
                                </span>
                                <span className="opt-text">{opt}</span>
                                {isRevealed && opt === qItem.correct_answer && (
                                  <FontAwesomeIcon icon={faCheck} className="opt-icon correct" />
                                )}
                                {isRevealed && opt === selectedOpt && opt !== qItem.correct_answer && (
                                  <FontAwesomeIcon icon={faXmark} className="opt-icon wrong" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Explanation Reveal */}
                      {isRevealed && (
                        <div className={`qg-explanation-box ${isCorrect ? 'correct' : 'wrong'}`}>
                          <div className="qg-exp-header">
                            <FontAwesomeIcon icon={faLightbulb} />
                            <strong>{isCorrect ? 'Correct!' : 'Incorrect'}</strong>
                          </div>
                          {qItem.explanation && (
                            <p className="qg-exp-text">
                              {renderTextWithCitations(qItem.explanation)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="qg-raw-card">
                <div className="qg-raw-body">
                  {result.content?.split('\n').map((line, i) => (
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

