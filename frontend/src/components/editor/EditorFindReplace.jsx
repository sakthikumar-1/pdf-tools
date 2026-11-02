/**
 * Simatrix PDF Tools - Editor Find & Replace Floating Widget
 * 
 * Searches for text occurrences across PDF document pages using PDF.js text streams.
 * Supports:
 * - Real-time match counting and navigation (Previous / Next).
 * - Automatic page jumping when navigating matches across pages.
 * - Replace active match occurrence.
 * - Replace all matching occurrences in one batch.
 * - Case-sensitive and whole-word matching options.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMagnifyingGlass,
  faChevronUp,
  faChevronDown,
  faXmark,
  faCheck,
  faPenToSquare,
  faRotate,
} from '@fortawesome/free-solid-svg-icons';

export default function EditorFindReplace({
  isOpen = false,
  onClose,
  pdfDocProxy,
  currentPage = 1,
  totalPages = 1,
  onNavigateToPage,
  onApplyReplacementBoxes,
  showToast,
}) {
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(true);

  const [matches, setMatches] = useState([]); // [{ id, page, str, ptX, ptY, ptWidth, ptHeight, fontSize, fontFamily }]
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  const findInputRef = useRef(null);

  // Autofocus input when opened
  useEffect(() => {
    if (isOpen && findInputRef.current) {
      findInputRef.current.focus();
      findInputRef.current.select();
    }
  }, [isOpen]);

  // Search document whenever findText, matchCase, or wholeWord changes
  useEffect(() => {
    if (!isOpen || !pdfDocProxy || !findText.trim()) {
      setMatches([]);
      setCurrentMatchIndex(0);
      return;
    }

    let isCancelled = false;

    const performSearch = async () => {
      try {
        setIsSearching(true);
        const query = matchCase ? findText.trim() : findText.trim().toLowerCase();
        const foundMatches = [];

        for (let p = 1; p <= totalPages; p++) {
          if (isCancelled) return;
          const page = await pdfDocProxy.getPage(p);
          const unscaledViewport = page.getViewport({ scale: 1.0 });
          const textContent = await page.getTextContent();
          if (isCancelled) return;

          const rawItems = textContent.items || [];
          const styles = textContent.styles || {};

          let matchCounter = 0;

          for (const item of rawItems) {
            const rawStr = item.str || '';
            if (!rawStr.trim()) continue;

            const targetStr = matchCase ? rawStr : rawStr.toLowerCase();

            // Word boundary regex or standard substring matching
            let regex;
            try {
              const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const pattern = wholeWord ? `\\b${escaped}\\b` : escaped;
              regex = new RegExp(pattern, matchCase ? 'g' : 'gi');
            } catch (_) {
              continue;
            }

            let m;
            while ((m = regex.exec(rawStr)) !== null) {
              const matchedSubstr = m[0];
              const matchStartIdx = m.index;
              const matchLen = matchedSubstr.length;

              const itemW = Number(item.width) || 0;
              const itemH = Number(item.height) || Math.hypot(item.transform[0], item.transform[1]) || 12;

              // Convert PDF points to canonical top-left viewport coordinates at scale 1.0
              const rect = [
                item.transform[4],
                item.transform[5],
                item.transform[4] + itemW,
                item.transform[5] + itemH,
              ];
              const vpRect = unscaledViewport.convertToViewportRectangle(rect);

              const fullPtX = Math.round(Math.min(vpRect[0], vpRect[2]));
              const fullPtY = Math.round(Math.min(vpRect[1], vpRect[3]));
              const fullPtW = Math.max(12, Math.round(Math.abs(vpRect[2] - vpRect[0])));
              const fullPtH = Math.max(10, Math.round(Math.abs(vpRect[3] - vpRect[1])));

              // Sub-item character offset estimation
              const charWidth = fullPtW / Math.max(1, rawStr.length);
              const subPtX = Math.round(fullPtX + matchStartIdx * charWidth);
              const subPtW = Math.max(15, Math.round(matchLen * charWidth));

              // Detect font family
              const styleObj = styles[item.fontName] || {};
              const rawFam = (styleObj.fontFamily || '').toLowerCase();
              let fontFamily = 'Helvetica';
              if (rawFam.includes('times') || rawFam.includes('serif') || rawFam.includes('roman')) {
                fontFamily = 'Times Roman';
              } else if (rawFam.includes('courier') || rawFam.includes('mono')) {
                fontFamily = 'Courier';
              }

              foundMatches.push({
                id: `match_${p}_${matchCounter++}_${matchStartIdx}`,
                page: p,
                str: matchedSubstr,
                ptX: subPtX,
                ptY: fullPtY,
                ptWidth: subPtW,
                ptHeight: fullPtH,
                fontSize: Math.max(8, Math.min(72, Math.round(itemH))),
                fontFamily,
              });
            }
          }
        }

        if (!isCancelled) {
          setMatches(foundMatches);
          setCurrentMatchIndex(0);
          if (foundMatches.length > 0 && typeof onNavigateToPage === 'function') {
            onNavigateToPage(foundMatches[0].page);
          }
        }
      } catch (err) {
        console.warn('[FindReplace Search Warning]:', err);
      } finally {
        if (!isCancelled) {
          setIsSearching(false);
        }
      }
    };

    const timer = setTimeout(performSearch, 180);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, findText, matchCase, wholeWord, pdfDocProxy, totalPages, onNavigateToPage]);

  if (!isOpen) return null;

  // Navigate to next / previous match
  const handleNextMatch = () => {
    if (matches.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % matches.length;
    setCurrentMatchIndex(nextIdx);
    const targetMatch = matches[nextIdx];
    if (targetMatch && targetMatch.page !== currentPage && typeof onNavigateToPage === 'function') {
      onNavigateToPage(targetMatch.page);
    }
  };

  const handlePrevMatch = () => {
    if (matches.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + matches.length) % matches.length;
    setCurrentMatchIndex(prevIdx);
    const targetMatch = matches[prevIdx];
    if (targetMatch && targetMatch.page !== currentPage && typeof onNavigateToPage === 'function') {
      onNavigateToPage(targetMatch.page);
    }
  };

  // Replace current match
  const handleReplaceCurrent = () => {
    if (matches.length === 0 || !replaceText.trim()) return;
    const activeMatch = matches[currentMatchIndex];
    if (!activeMatch) return;

    const box = {
      id: `replace_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      page: activeMatch.page,
      ptX: activeMatch.ptX,
      ptY: activeMatch.ptY,
      ptWidth: Math.max(25, activeMatch.ptWidth),
      ptHeight: Math.max(16, activeMatch.ptHeight),
      text: replaceText,
      originalText: activeMatch.str,
      isReplacement: true,
      backgroundColor: '#FFFFFF',
      fontFamily: activeMatch.fontFamily || 'Helvetica',
      fontSize: activeMatch.fontSize || 14,
      color: '#111827',
      bold: false,
      italic: false,
      align: 'left',
      lineHeight: 1.25,
    };

    onApplyReplacementBoxes([box]);

    // Remove the replaced match from current search results
    const remaining = matches.filter((_, idx) => idx !== currentMatchIndex);
    setMatches(remaining);
    if (currentMatchIndex >= remaining.length) {
      setCurrentMatchIndex(Math.max(0, remaining.length - 1));
    }
    if (typeof showToast === 'function') {
      showToast(`Replaced "${activeMatch.str}" with "${replaceText}".`);
    }
  };

  // Replace all matches
  const handleReplaceAll = () => {
    if (matches.length === 0 || !replaceText.trim()) return;

    const boxes = matches.map((m) => ({
      id: `replace_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      page: m.page,
      ptX: m.ptX,
      ptY: m.ptY,
      ptWidth: Math.max(25, m.ptWidth),
      ptHeight: Math.max(16, m.ptHeight),
      text: replaceText,
      originalText: m.str,
      isReplacement: true,
      backgroundColor: '#FFFFFF',
      fontFamily: m.fontFamily || 'Helvetica',
      fontSize: m.fontSize || 14,
      color: '#111827',
      bold: false,
      italic: false,
      align: 'left',
      lineHeight: 1.25,
    }));

    onApplyReplacementBoxes(boxes);
    const count = matches.length;
    setMatches([]);
    setCurrentMatchIndex(0);
    if (typeof showToast === 'function') {
      showToast(`Replaced all ${count} occurrences across the document.`);
    }
  };

  return (
    <div className="editor-find-replace-bar" role="search" aria-label="Find and Replace Bar">
      {/* Top Search Inputs Row */}
      <div className="find-replace-inputs-row">
        {/* Find Input */}
        <div className="find-input-wrapper">
          <FontAwesomeIcon icon={faMagnifyingGlass} className="find-search-icon" />
          <input
            ref={findInputRef}
            type="text"
            className="find-replace-input"
            placeholder="Find text in PDF..."
            value={findText}
            onChange={(e) => setFindText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleNextMatch();
              } else if (e.key === 'Escape') {
                onClose();
              }
            }}
          />
          {/* Match counter */}
          <span className="find-counter-badge">
            {isSearching
              ? '...'
              : findText.trim()
              ? matches.length > 0
                ? `${currentMatchIndex + 1}/${matches.length}`
                : '0 matches'
              : ''}
          </span>
        </div>

        {/* Replace Input */}
        <div className="replace-input-wrapper">
          <input
            type="text"
            className="find-replace-input"
            placeholder="Replace with..."
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleReplaceCurrent();
              } else if (e.key === 'Escape') {
                onClose();
              }
            }}
          />
        </div>

        {/* Match Toggles */}
        <div className="find-toggles-group">
          <button
            type="button"
            className={`find-toggle-btn ${matchCase ? 'is-active' : ''}`}
            onClick={() => setMatchCase(!matchCase)}
            title="Match Case (Case Sensitive)"
            aria-pressed={matchCase}
          >
            Aa
          </button>
          <button
            type="button"
            className={`find-toggle-btn ${wholeWord ? 'is-active' : ''}`}
            onClick={() => setWholeWord(!wholeWord)}
            title="Match Whole Word"
            aria-pressed={wholeWord}
          >
            \b
          </button>
        </div>

        {/* Match Navigation Arrows */}
        <div className="find-nav-buttons">
          <button
            type="button"
            className="find-icon-btn"
            onClick={handlePrevMatch}
            disabled={matches.length === 0}
            title="Previous match (Shift+Enter)"
          >
            <FontAwesomeIcon icon={faChevronUp} />
          </button>
          <button
            type="button"
            className="find-icon-btn"
            onClick={handleNextMatch}
            disabled={matches.length === 0}
            title="Next match (Enter)"
          >
            <FontAwesomeIcon icon={faChevronDown} />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="find-actions-group">
          <button
            type="button"
            className="find-action-btn replace-single-btn"
            onClick={handleReplaceCurrent}
            disabled={matches.length === 0 || !replaceText.trim()}
            title="Replace current occurrence"
          >
            Replace
          </button>
          <button
            type="button"
            className="find-action-btn replace-all-btn"
            onClick={handleReplaceAll}
            disabled={matches.length === 0 || !replaceText.trim()}
            title="Replace all matching occurrences"
          >
            Replace All
          </button>
          <button
            type="button"
            className="find-icon-btn close-find-btn"
            onClick={onClose}
            title="Close Find & Replace (Esc)"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
      </div>
    </div>
  );
}

