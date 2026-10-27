import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faClockRotateLeft, 
  faTrashCan, 
  faFilePdf, 
  faCircleCheck,
  faArrowRight,
  faDownload,
  faEllipsisVertical,
  faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import './History.css';

function formatRelativeTime(timestamp) {
  if (!timestamp) return 'Recently';
  const now = new Date();
  const past = new Date(timestamp);
  const diffSec = Math.floor((now - past) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min${diffMin === 1 ? '' : 's'} ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

export default function History() {
  const [historyItems, setHistoryItems] = useState([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('simatrix_pdf_history');
      if (stored) {
        setHistoryItems(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to parse history from localStorage', e);
    }
  }, []);

  const handleClearHistory = () => {
    localStorage.removeItem('simatrix_pdf_history');
    setHistoryItems([]);
  };

  const handleDeleteItem = (index) => {
    const updated = historyItems.filter((_, idx) => idx !== index);
    setHistoryItems(updated);
    localStorage.setItem('simatrix_pdf_history', JSON.stringify(updated));
  };

  return (
    <div className="recent-files-page">
      <div className="recent-files-container">
        {/* Top Back Link */}
        <Link to="/" className="tool-back-link">
          <FontAwesomeIcon icon={faArrowLeft} /> Back to Dashboard
        </Link>

        {/* Header matching Reference */}
        <div className="recent-files-header">
          <div>
            <h1 className="recent-files-title">Recent Files</h1>
            <p className="recent-files-subtitle">
              Your recent processing history. Files are not stored on our servers.
            </p>
          </div>

          {historyItems.length > 0 && (
            <button 
              type="button" 
              className="btn-clear-history"
              onClick={handleClearHistory}
              title="Clear all recent files"
            >
              <FontAwesomeIcon icon={faTrashCan} />
              <span>Clear History</span>
            </button>
          )}
        </div>

        {/* Content Table or Empty State */}
        {historyItems.length === 0 ? (
          <div className="recent-files-empty-card">
            <div className="empty-files-icon">
              <FontAwesomeIcon icon={faClockRotateLeft} />
            </div>
            <h3 className="empty-files-title">No Recent Files</h3>
            <p className="empty-files-desc">
              Documents you process using Simatrix tools will be listed here during your session.
            </p>
            <Link to="/" className="btn btn-primary btn-md">
              <span>Explore PDF Tools</span>
              <FontAwesomeIcon icon={faArrowRight} />
            </Link>
          </div>
        ) : (
          <div className="recent-files-table-wrapper">
            <table className="recent-files-table">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Tool</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {historyItems.map((item, idx) => (
                  <tr key={idx} className="recent-file-row">
                    <td className="file-name-cell">
                      <div className="file-icon-square">
                        <FontAwesomeIcon icon={faFilePdf} />
                      </div>
                      <span className="file-name-text" title={item.fileName}>
                        {item.fileName || 'document.pdf'}
                      </span>
                    </td>
                    <td className="tool-name-cell">
                      {item.toolName || 'PDF Operation'}
                    </td>
                    <td className="date-cell">
                      {formatRelativeTime(item.timestamp)}
                    </td>
                    <td className="status-cell">
                      <span className="status-pill completed">
                        <FontAwesomeIcon icon={faCircleCheck} /> Completed
                      </span>
                    </td>
                    <td className="action-cell">
                      <div className="action-cell-btns">
                        <button
                          type="button"
                          className="action-icon-btn"
                          onClick={() => handleDeleteItem(idx)}
                          title="Remove from history"
                        >
                          <FontAwesomeIcon icon={faTrashCan} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
