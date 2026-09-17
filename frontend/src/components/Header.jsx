import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FileText, 
  FileImage, 
  FileSpreadsheet, 
  Images, 
  Type, 
  Presentation, 
  Layers, 
  Scissors, 
  Minimize2, 
  RotateCw, 
  Lock, 
  FileCheck,
  ChevronDown,
  Sun,
  Moon,
  Menu,
  X,
  Trash2
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import './Header.css';

export default function Header() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const dropdownRef = useRef(null);

  const toolsList = [
    { name: 'PDF to JPG', path: '/pdf-to-jpg', icon: FileImage, badge: 'V1 Ready' },
    { name: 'PDF to Word', path: '/pdf-to-word', icon: FileText, badge: 'Popular' },
    { name: 'Merge PDF', path: '/merge-pdf', icon: Layers, badge: 'Popular' },
    { name: 'Compress PDF', path: '/compress-pdf', icon: Minimize2, badge: 'Fast' },
    { name: 'Split PDF', path: '/split-pdf', icon: Scissors },
    { name: 'PDF to Excel', path: '/pdf-to-excel', icon: FileSpreadsheet },
    { name: 'PDF to PNG', path: '/pdf-to-png', icon: Images },
    { name: 'PDF to Text', path: '/pdf-to-text', icon: Type },
    { name: 'PDF to PowerPoint', path: '/pdf-to-ppt', icon: Presentation },
    { name: 'Rotate PDF', path: '/rotate-pdf', icon: RotateCw },
    { name: 'Protect PDF', path: '/protect-pdf', icon: Lock },
    { name: 'Images to PDF', path: '/images-to-pdf', icon: FileCheck },
    { name: 'Remove Pages', path: '/remove-pages', icon: Trash2, badge: 'New' },
  ];

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className="header">
      <div className="container header-container">
        {/* Brand Logo */}
        <Link to="/" className="brand-logo" title="Simatrix Academy PDF Tools">
          <img 
            src={theme === 'dark' ? '/hero-logo-dark.png' : '/hero-logo.png'} 
            alt="Simatrix Academy Logo" 
            className="brand-logo-img" 
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="desktop-nav">
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
            Home
          </Link>

          {/* Clean Tools Dropdown */}
          <div className="nav-dropdown-wrapper" ref={dropdownRef}>
            <button 
              className={`nav-link dropdown-trigger ${dropdownOpen ? 'active' : ''}`}
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <span>All Tools</span>
              <ChevronDown size={15} className={`chevron-icon ${dropdownOpen ? 'open' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="tools-dropdown-menu">
                <div className="dropdown-grid">
                  {toolsList.map((tool, idx) => {
                    const IconComp = tool.icon;
                    const isActive = location.pathname === tool.path;
                    return (
                      <Link 
                        to={tool.path} 
                        key={idx} 
                        className={`dropdown-item ${isActive ? 'active' : ''}`}
                      >
                        <IconComp size={18} className="dropdown-item-icon" />
                        <span className="dropdown-item-name">{tool.name}</span>
                        {tool.badge && <span className="dropdown-item-badge">{tool.badge}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <Link to="/pdf-to-jpg" className={`nav-link ${location.pathname === '/pdf-to-jpg' ? 'active' : ''}`}>
            PDF to JPG
          </Link>
          <Link to="/pdf-to-word" className={`nav-link ${location.pathname === '/pdf-to-word' ? 'active' : ''}`}>
            PDF to Word
          </Link>
          <Link to="/merge-pdf" className={`nav-link ${location.pathname === '/merge-pdf' ? 'active' : ''}`}>
            Merge PDF
          </Link>
          <Link to="/compress-pdf" className={`nav-link ${location.pathname === '/compress-pdf' ? 'active' : ''}`}>
            Compress PDF
          </Link>
        </nav>

        {/* Action Controls & Theme Toggle */}
        <div className="header-actions">
          <button 
            className="theme-toggle-btn" 
            onClick={toggleTheme} 
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle Color Theme"
          >
            {theme === 'dark' ? (
              <Sun size={19} className="theme-icon sun-icon" />
            ) : (
              <Moon size={19} className="theme-icon moon-icon" />
            )}
          </button>

          <button 
            className="mobile-menu-btn" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Clean Mobile Menu */}
      {mobileMenuOpen && (
        <div className="mobile-menu-overlay">
          <div className="mobile-menu-container">
            <div className="mobile-menu-header">
              <span className="mobile-menu-title">PDF Tools</span>
              <button className="theme-toggle-btn" onClick={toggleTheme}>
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>

            <div className="mobile-tool-grid">
              {toolsList.map((tool, idx) => {
                const IconC = tool.icon;
                return (
                  <Link key={idx} to={tool.path} className="mobile-tool-card">
                    <IconC size={18} className="mobile-tool-icon" />
                    <span>{tool.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
