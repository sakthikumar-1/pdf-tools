import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBookOpen } from '@fortawesome/free-solid-svg-icons';
import './AIPageCitation.css';

export default function AIPageCitation({ pageNumber, onClick }) {
  const handleClick = (e) => {
    if (onClick) {
      e.preventDefault();
      onClick(pageNumber);
    }
  };

  return (
    <span
      className={`ai-page-citation ${onClick ? 'clickable' : ''}`}
      onClick={handleClick}
      title={`Cited from Page ${pageNumber}`}
    >
      <FontAwesomeIcon icon={faBookOpen} />
      <span>Page {pageNumber}</span>
    </span>
  );
}

/**
 * Parses markdown or plain text with inline citations like [Page 1] or [Page 2, Page 3]
 * and returns React elements with styled citation badges.
 */
export function renderTextWithCitations(text, onPageClick) {
  if (!text) return null;

  // Regex to match [Page X] or [Page X, Page Y] or [Pages X-Y]
  const citationRegex = /\[Page\s*(\d+)(?:,\s*Page\s*(\d+))*\]|\[Pages\s*(\d+)\s*-\s*(\d+)\]/gi;

  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = citationRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const fullMatch = match[0];
    // Extract individual page digits
    const pageDigits = fullMatch.match(/\d+/g) || [];

    parts.push(
      <span key={`cite-${match.index}`} className="ai-citations-group">
        {pageDigits.map((p, pIdx) => (
          <AIPageCitation
            key={`${p}-${pIdx}`}
            pageNumber={parseInt(p, 10)}
            onClick={onPageClick}
          />
        ))}
      </span>
    );

    lastIndex = match.index + fullMatch.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

