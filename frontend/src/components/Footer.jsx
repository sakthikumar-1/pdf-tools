import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFilePdf, 
  faShieldHalved, 
  faLock, 
  faBolt 
} from '@fortawesome/free-solid-svg-icons';
import './Footer.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer" role="contentinfo">
      <div className="container footer-content">
        {/* Brand & Mission Column */}
        <div className="footer-brand">
          <Link to="/" className="footer-logo">
            <span className="brand-icon-box">
              <FontAwesomeIcon icon={faFilePdf} />
            </span>
            <span className="brand-text">
              Simatrix <span className="brand-sub">PDF</span>
            </span>
          </Link>
          <p className="footer-tagline">
            Professional document intelligence and high-fidelity PDF processing. Fast, private, and free to use without account requirements.
          </p>
          <div className="footer-highlights">
            <span className="highlight-pill">
              <FontAwesomeIcon icon={faShieldHalved} className="highlight-icon" />
              <span>100% Client/Private Execution</span>
            </span>
            <span className="highlight-pill">
              <FontAwesomeIcon icon={faLock} className="highlight-icon" />
              <span>15-Minute Auto Purge</span>
            </span>
            <span className="highlight-pill">
              <FontAwesomeIcon icon={faBolt} className="highlight-icon" />
              <span>Free Anonymous Access</span>
            </span>
          </div>
        </div>

        {/* Quick Tools */}
        <div className="footer-nav-col">
          <h4 className="footer-heading">Popular Tools</h4>
          <ul className="footer-nav-list">
            <li><Link to="/pdf-to-word">PDF to Word</Link></li>
            <li><Link to="/merge-pdf">Merge PDF</Link></li>
            <li><Link to="/compress-pdf">Compress PDF</Link></li>
            <li><Link to="/pdf-to-jpg">PDF to JPG</Link></li>
            <li><Link to="/ai-summarizer">AI PDF Summarizer</Link></li>
            <li><Link to="/protect-pdf">Protect PDF</Link></li>
          </ul>
        </div>

        {/* All Utilities Category Links */}
        <div className="footer-nav-col">
          <h4 className="footer-heading">PDF Operations</h4>
          <ul className="footer-nav-list">
            <li><Link to="/split-pdf">Split PDF</Link></li>
            <li><Link to="/rotate-pdf">Rotate Pages</Link></li>
            <li><Link to="/remove-pages">Remove Pages</Link></li>
            <li><Link to="/reorder-pdf">Reorder Pages</Link></li>
            <li><Link to="/add-page-numbers">Add Page Numbers</Link></li>
            <li><Link to="/watermark-pdf">Watermark PDF</Link></li>
          </ul>
        </div>

        {/* Account & Information */}
        <div className="footer-nav-col">
          <h4 className="footer-heading">Account & System</h4>
          <ul className="footer-nav-list">
            <li><Link to="/account">Account Settings</Link></li>
            <li><Link to="/history">Recent Processing History</Link></li>
            <li><Link to="/ai-summarizer">AI Document Intelligence</Link></li>
          </ul>
        </div>
      </div>

      {/* Footer Bottom Bar */}
      <div className="footer-bottom">
        <div className="container footer-bottom-inner">
          <p className="footer-copy">
            &copy; {currentYear} Simatrix Academy. All rights reserved. Client-first document processing.
          </p>
          <div className="footer-bottom-links">
            <Link to="/history">History</Link>
            <span className="dot-sep">&bull;</span>
            <Link to="/account">Account</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
