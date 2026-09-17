import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Shield, Zap, Lock, Heart } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import './Footer.css';

export default function Footer() {
  const { theme } = useTheme();

  return (
    <footer className="footer">
      <div className="container footer-container">
        {/* Brand Column */}
        <div className="footer-brand-col">
          <div className="footer-logo">
            <img 
              src={theme === 'dark' ? '/hero-logo-dark.png' : '/hero-logo.png'} 
              alt="Simatrix Academy Logo" 
              className="footer-logo-img" 
            />
          </div>
          <p className="footer-description">
            Production-quality, privacy-first PDF utility suite designed for fast document processing, conversion, and organization.
          </p>
          <div className="footer-badges">
            <span className="footer-badge"><Shield size={14} /> 100% Private</span>
            <span className="footer-badge"><Lock size={14} /> Auto Delete</span>
            <span className="footer-badge"><Zap size={14} /> Ultra Fast</span>
          </div>
        </div>

        {/* Links Column 1: Popular PDF Tools */}
        <div className="footer-col">
          <h4 className="footer-title">Popular Tools</h4>
          <ul className="footer-links">
            <li><Link to="/pdf-to-jpg">PDF to JPG</Link></li>
            <li><Link to="/pdf-to-png">PDF to PNG</Link></li>
            <li><Link to="/pdf-to-word">PDF to Word</Link></li>
            <li><Link to="/merge-pdf">Merge PDF</Link></li>
            <li><Link to="/compress-pdf">Compress PDF</Link></li>
          </ul>
        </div>

        {/* Links Column 2: PDF Utilities */}
        <div className="footer-col">
          <h4 className="footer-title">PDF Utilities</h4>
          <ul className="footer-links">
            <li><Link to="/split-pdf">Split PDF</Link></li>
            <li><Link to="/rotate-pdf">Rotate PDF</Link></li>
            <li><Link to="/protect-pdf">Protect PDF</Link></li>
            <li><Link to="/images-to-pdf">Images to PDF</Link></li>
            <li><Link to="/remove-pages">Remove Pages</Link></li>
            <li><Link to="/pdf-to-excel">PDF to Excel</Link></li>
          </ul>
        </div>

        {/* Links Column 3: Platform */}
        <div className="footer-col">
          <h4 className="footer-title">Platform & Privacy</h4>
          <ul className="footer-links">
            <li><a href="#how-it-works">How It Works</a></li>
            <li><a href="#privacy">Privacy Policy</a></li>
            <li><a href="#terms">Terms of Service</a></li>
            <li><a href="#security">File Security Guarantee</a></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container footer-bottom-container">
          <p>© {new Date().getFullYear()} Simatrix Academy. All rights reserved.</p>
          <p className="footer-credit">Designed for speed, simplicity & high performance</p>
        </div>
      </div>
    </footer>
  );
}
