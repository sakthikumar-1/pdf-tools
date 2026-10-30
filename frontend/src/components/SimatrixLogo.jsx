import React from 'react';
import { Link } from 'react-router-dom';
import './SimatrixLogo.css';

export default function SimatrixLogo({ 
  className = '', 
  showText = true, 
  asLink = true, 
  onClick 
}) {
  const content = (
    <div className={`simatrix-brand-badge ${className}`}>
      <div className="simatrix-logo-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="logo-svg">
          <rect width="32" height="32" rx="6" fill="#E03131" />
          {/* Crisp stylized Simatrix geometric emblem */}
          <path
            d="M16 6.5C12.4 6.5 9.5 9.4 9.5 13C9.5 15.6 11 17.8 13.2 18.9L9 25.5H12.5L15.2 21.2C15.5 21.3 15.7 21.3 16 21.3C19.6 21.3 22.5 18.4 22.5 14.8C22.5 11.2 19.6 6.5 16 6.5ZM16 17.5C14.3 17.5 13 16.2 13 14.5C13 12.8 14.3 10.3 16 10.3C17.7 10.3 19 12.8 19 14.5C19 16.2 17.7 17.5 16 17.5Z"
            fill="#FFFFFF"
          />
        </svg>
      </div>
      {showText && (
        <span className="simatrix-brand-name">
          Simatrix <span className="simatrix-brand-sub">PDF</span>
        </span>
      )}
    </div>
  );

  if (asLink) {
    return (
      <Link to="/" className="simatrix-logo-link" onClick={onClick} aria-label="Simatrix PDF Home">
        {content}
      </Link>
    );
  }

  return content;
}

