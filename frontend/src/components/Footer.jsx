import React from 'react';
import './Footer.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="simatrix-footer" role="contentinfo">
      <div className="footer-container">
        <span className="footer-copyright">
          &copy; {currentYear} Simatrix PDF. All rights reserved.
        </span>
      </div>
    </footer>
  );
}
