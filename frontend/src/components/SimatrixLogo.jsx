import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import './SimatrixLogo.css';

// Combined mark + wordmark artwork, one variant per theme (see public/brand/)
const LOGO_SOURCES = {
  light: '/brand/pdfwithus-logo-light.png',
  dark: '/brand/pdfwithus-logo-dark.png',
};

export default function SimatrixLogo({
  className = '',
  asLink = true,
  onClick
}) {
  const { theme } = useTheme();

  const content = (
    <span className={`simatrix-brand-badge ${className}`}>
      <img
        src={LOGO_SOURCES[theme] || LOGO_SOURCES.light}
        alt="PDFwithUs"
        className="simatrix-brand-logo"
        width="328"
        height="112"
        decoding="async"
      />
    </span>
  );

  if (asLink) {
    return (
      <Link to="/" className="simatrix-logo-link" onClick={onClick} aria-label="PDFwithUs Home">
        {content}
      </Link>
    );
  }

  return content;
}
