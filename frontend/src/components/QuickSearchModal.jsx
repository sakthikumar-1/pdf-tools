import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMagnifyingGlass,
  faXmark,
  faArrowRight,
  faArrowTurnDown,
  faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import { filterTools } from '../utils/toolsData';
import './QuickSearchModal.css';

export default function QuickSearchModal({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const filtered = filterTools(query, 'all');

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + (filtered.length || 1)) % (filtered.length || 1));
      } else if (e.key === 'Enter' && filtered.length > 0) {
        e.preventDefault();
        const selectedTool = filtered[selectedIndex];
        if (selectedTool) {
          navigate(selectedTool.path);
          onClose();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex, navigate, onClose]);

  if (!isOpen) return null;

  return (
    <div className="quick-search-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Search Tools">
      <div className="quick-search-card" onClick={(e) => e.stopPropagation()}>
        {/* Search Input Bar with Back Button */}
        <div className="quick-search-input-box">
          <button
            type="button"
            className="search-back-btn"
            onClick={onClose}
            aria-label="Back / Close search"
            title="Back (Esc)"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          <FontAwesomeIcon icon={faMagnifyingGlass} className="search-lead-icon" />
          <input
            ref={inputRef}
            type="text"
            className="search-lead-input"
            placeholder="Type a tool name, format, or task (e.g., word, compress, merge)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-autocomplete="list"
          />
          {query && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setQuery('')}
              aria-label="Clear query"
              title="Clear search"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          )}
          <button
            type="button"
            className="search-esc-hint"
            onClick={onClose}
            title="Close search modal"
            aria-label="Close"
          >
            ESC
          </button>
        </div>

        {/* Results List */}
        <div className="quick-search-results">
          {filtered.length === 0 ? (
            <div className="quick-search-empty">
              <p>No PDF tools matching &ldquo;{query}&rdquo;</p>
              <span>Try searching for &lsquo;word&rsquo;, &lsquo;jpg&rsquo;, &lsquo;merge&rsquo;, or &lsquo;summarize&rsquo;.</span>
            </div>
          ) : (
            filtered.map((tool, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={tool.id}
                  className={`search-result-row ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    navigate(tool.path);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="search-result-icon">
                    <FontAwesomeIcon icon={tool.icon} />
                  </div>
                  <div className="search-result-info">
                    <div className="search-result-title-line">
                      <span className="search-result-title">{tool.title}</span>
                      <span className="search-result-cat">{tool.categoryLabel}</span>
                    </div>
                    <p className="search-result-desc">{tool.description}</p>
                  </div>
                  <div className="search-result-action">
                    {isSelected ? (
                      <span className="enter-key-badge">
                        <FontAwesomeIcon icon={faArrowTurnDown} className="enter-fa" />
                        <span>Select</span>
                      </span>
                    ) : (
                      <FontAwesomeIcon icon={faArrowRight} className="search-arrow-icon" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer Keyboard Legend */}
        <div className="quick-search-footer">
          <span className="legend-item"><kbd>↑</kbd><kbd>↓</kbd> to navigate</span>
          <span className="legend-item"><kbd>↵</kbd> to select</span>
          <span className="legend-item"><kbd>esc</kbd> to close</span>
        </div>
      </div>
    </div>
  );
}
