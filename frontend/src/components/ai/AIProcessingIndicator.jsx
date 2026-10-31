import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faXmark, faMicrochip } from '@fortawesome/free-solid-svg-icons';
import './AIProcessingIndicator.css';

export default function AIProcessingIndicator({
  statusMessage = 'Analyzing document...',
  onCancel,
  showCancel = false
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setElapsed(0);
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatElapsed = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m > 0 ? `${m}m ` : ''}${s}s`;
  };

  return (
    <div className="ai-processing-indicator" role="status" aria-live="polite">
      <div className="ai-spinner-container">
        <div className="ai-spinner" />
      </div>

      <div className="ai-processing-details">
        <div className="ai-processing-status-row">
          <span className="ai-processing-msg">{statusMessage}</span>
          <span className="ai-processing-timer">
            <FontAwesomeIcon icon={faClock} />
            {formatElapsed(elapsed)}
          </span>
        </div>
        <p className="ai-processing-sub">
          Processing via DeepSeek / Gemini AI. Token streaming active.
        </p>
      </div>

      {showCancel && onCancel && (
        <button
          type="button"
          className="ai-btn-cancel-proc"
          onClick={onCancel}
          title="Cancel operation"
        >
          <FontAwesomeIcon icon={faXmark} />
          <span>Cancel</span>
        </button>
      )}
    </div>
  );
}

