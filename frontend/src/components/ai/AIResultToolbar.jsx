import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCopy,
  faCheck,
  faDownload,
  faFileWord,
  faFileLines,
  faArrowRotateRight,
  faClock,
  faFont
} from '@fortawesome/free-solid-svg-icons';
import { downloadFile } from '../../utils/fileUtils';
import './AIResultToolbar.css';

export default function AIResultToolbar({
  content = '',
  rawDocumentName = 'document',
  wordCount,
  charCount,
  readingTimeMinutes,
  downloadToken,
  downloadUrl,
  onReset,
  suffix = 'ai_result'
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownloadTxt = () => {
    if (!content) return;
    const base = (rawDocumentName || 'document').replace(/\.[^/.]+$/, '');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    downloadFile(blob, `${base}_${suffix}.txt`);
  };

  const handleDownloadMd = () => {
    if (!content) return;
    const base = (rawDocumentName || 'document').replace(/\.[^/.]+$/, '');
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    downloadFile(blob, `${base}_${suffix}.md`);
  };

  const handleDownloadDocx = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
    } else if (downloadToken) {
      window.open(`/api/v1/download/${downloadToken}`, '_blank');
    }
  };

  return (
    <div className="ai-result-toolbar">
      <div className="ai-toolbar-meta">
        {wordCount !== undefined && wordCount !== null && (
          <span className="ai-meta-chip">
            <FontAwesomeIcon icon={faFont} />
            {wordCount} words
          </span>
        )}
        {charCount !== undefined && charCount !== null && (
          <span className="ai-meta-chip">
            {charCount.toLocaleString()} chars
          </span>
        )}
        {readingTimeMinutes !== undefined && readingTimeMinutes !== null && (
          <span className="ai-meta-chip">
            <FontAwesomeIcon icon={faClock} />
            ~{readingTimeMinutes} min read
          </span>
        )}
      </div>

      <div className="ai-toolbar-actions">
        <button
          type="button"
          className="ai-toolbar-btn"
          onClick={handleCopy}
          title="Copy text to clipboard"
        >
          <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>

        <button
          type="button"
          className="ai-toolbar-btn"
          onClick={handleDownloadTxt}
          title="Download as plain text file (.txt)"
        >
          <FontAwesomeIcon icon={faFileLines} />
          <span>.TXT</span>
        </button>

        <button
          type="button"
          className="ai-toolbar-btn"
          onClick={handleDownloadMd}
          title="Download as Markdown file (.md)"
        >
          <FontAwesomeIcon icon={faDownload} />
          <span>.MD</span>
        </button>

        {(downloadUrl || downloadToken) && (
          <button
            type="button"
            className="ai-toolbar-btn primary"
            onClick={handleDownloadDocx}
            title="Download formatted Microsoft Word document (.docx)"
          >
            <FontAwesomeIcon icon={faFileWord} />
            <span>Download DOCX</span>
          </button>
        )}

        {onReset && (
          <button
            type="button"
            className="ai-toolbar-btn"
            onClick={onReset}
            title="Start new analysis"
          >
            <FontAwesomeIcon icon={faArrowRotateRight} />
            <span>New</span>
          </button>
        )}
      </div>
    </div>
  );
}

