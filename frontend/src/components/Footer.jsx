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

        {/* Product & Security Information */}
        <div className="footer-nav-col">
          <h4 className="footer-heading">Product & Security</h4>
          <ul className="footer-nav-list">
            <li><a href="/#faq-section">Frequently Asked Questions</a></li>
            <li><a href="/#security-section">Privacy & Retention Policy</a></li>
            <li><Link to="/ai-summarizer">Gemini AI Document Analysis</Link></li>
          </ul>
          <div className="footer-security-card">
            <span className="security-title">Strict Privacy Guarantee</span>
            <p className="security-text">
              Uploaded files are never indexed, stored permanently, or used for AI training.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Bottom Bar */}
      <div className="footer-bottom">
        <div className="container footer-bottom-inner">
          <p className="footer-copy">
            &copy; {currentYear} Simatrix Academy. All rights reserved.
          </p>
          <div className="footer-bottom-links">
            <a href="/#security-section">Security</a>
            <span className="dot-sep">&bull;</span>
            <a href="/#faq-section">Help &amp; FAQ</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
