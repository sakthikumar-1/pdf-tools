import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faClockRotateLeft, 
  faTrashCan, 
  faShieldHalved, 
  faFilePdf, 
  faCircleCheck,
  faArrowRight,
  faFilter
} from '@fortawesome/free-solid-svg-icons';
import './History.css';

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

  return (
    <div className="history-page-container container">
      {/* Top Breadcrumb */}
      <nav className="tool-breadcrumb" aria-label="Breadcrumb">
        <Link to="/" className="breadcrumb-link">
          Home
        </Link>
        <span className="breadcrumb-separator">/</span>
        <Link to="/account" className="breadcrumb-link">
          Account
        </Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Processing History</span>
      </nav>

      <div className="history-header">
        <div className="history-header-left">
          <div className="history-icon-badge">
            <FontAwesomeIcon icon={faClockRotateLeft} />
          </div>
          <div>
            <h1 className="history-title">Document Processing History</h1>
            <p className="history-subtitle">
              Metadata logs of your recent conversions and operations.
            </p>
          </div>
        </div>

        {historyItems.length > 0 && (
          <button 
            type="button" 
            className="btn btn-secondary btn-sm clear-history-btn"
            onClick={handleClearHistory}
          >
            <FontAwesomeIcon icon={faTrashCan} />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Privacy Guarantee Note */}
      <div className="history-privacy-banner">
        <FontAwesomeIcon icon={faShieldHalved} className="privacy-banner-icon" />
        <div className="privacy-banner-text">
          <strong>Privacy Guaranteed:</strong> This history log stores document file names and timestamp metadata only. File content is processed strictly in temporary volatile memory and is never permanently hosted or harvested.
        </div>
      </div>

      {/* Content Area */}
      {historyItems.length === 0 ? (
        <div className="history-empty-card">
          <div className="empty-icon-circle">
            <FontAwesomeIcon icon={faFilePdf} />
          </div>
          <h3 className="empty-title">No Processing History Recorded</h3>
          <p className="empty-desc">
            You haven't run any document conversions or AI summaries in this session yet. Convert a PDF or extract tables to see records here.
          </p>
          <Link to="/#tools-catalog" className="btn btn-primary btn-md">
            <span>Explore PDF Tools</span>
            <FontAwesomeIcon icon={faArrowRight} />
          </Link>
        </div>
      ) : (
        <div className="history-table-container">
          <table className="history-table">
            <thead>
              <tr>
                <th>Document Name</th>
                <th>Tool / Operation</th>
                <th>Timestamp</th>
                <th>Engine</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {historyItems.map((item, idx) => (
                <tr key={idx}>
                  <td className="doc-name-cell">
                    <FontAwesomeIcon icon={faFilePdf} className="doc-icon" />
                    <span>{item.fileName || 'Untitled document'}</span>
                  </td>
                  <td>{item.toolName || 'PDF Conversion'}</td>
                  <td className="timestamp-cell">{item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Recent'}</td>
                  <td><span className="engine-chip">{item.engine || 'WASM / PyMuPDF'}</span></td>
                  <td>
                    <span className="status-badge success">
                      <FontAwesomeIcon icon={faCircleCheck} /> Completed
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
