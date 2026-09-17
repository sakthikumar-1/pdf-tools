import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileImage, 
  FileText, 
  FileSpreadsheet, 
  Layers, 
  Scissors, 
  Minimize2, 
  RotateCw, 
  Lock, 
  Type, 
  Presentation, 
  Images, 
  ShieldCheck, 
  Zap, 
  CheckCircle,
  FileCheck,
  Sparkles,
  Trash2
} from 'lucide-react';
import ToolCard from '../components/ToolCard';
import { useTheme } from '../context/ThemeContext';
import './Home.css';

export default function Home() {
  const [activeCategory, setActiveCategory] = useState('all');
  const { theme } = useTheme();

  const toolsList = [
    {
      title: 'PDF to JPG',
      description: 'Convert PDF pages into crisp, high-resolution JPG images instantly.',
      icon: FileImage,
      path: '/pdf-to-jpg',
      badge: 'V1 READY',
      badgeType: 'success',
      popular: true,
      category: 'convert',
    },
    {
      title: 'PDF to Word',
      description: 'Convert PDF documents into editable Microsoft Word (.docx) files.',
      icon: FileText,
      path: '/pdf-to-word',
      badge: 'POPULAR',
      badgeType: 'primary',
      popular: true,
      category: 'convert',
    },
    {
      title: 'Merge PDF',
      description: 'Combine multiple PDF files into one single organized document.',
      icon: Layers,
      path: '/merge-pdf',
      badge: 'POPULAR',
      badgeType: 'primary',
      popular: true,
      category: 'organize',
    },
    {
      title: 'Compress PDF',
      description: 'Reduce PDF file size significantly while preserving document quality.',
      icon: Minimize2,
      path: '/compress-pdf',
      badge: 'FAST',
      badgeType: 'primary',
      popular: true,
      category: 'organize',
    },
    {
      title: 'Split PDF',
      description: 'Separate one PDF document into individual pages or page ranges.',
      icon: Scissors,
      path: '/split-pdf',
      badge: 'UTILITY',
      badgeType: 'muted',
      category: 'organize',
    },
    {
      title: 'PDF to Excel',
      description: 'Extract PDF table data directly into Microsoft Excel spreadsheets.',
      icon: FileSpreadsheet,
      path: '/pdf-to-excel',
      badge: 'DATA',
      badgeType: 'muted',
      category: 'convert',
    },
    {
      title: 'PDF to PNG',
      description: 'Extract PDF pages into transparent, lossless PNG images.',
      icon: Images,
      path: '/pdf-to-png',
      badge: 'CONVERT',
      badgeType: 'muted',
      category: 'convert',
    },
    {
      title: 'PDF to Text',
      description: 'Extract raw text contents from any PDF document quickly.',
      icon: Type,
      path: '/pdf-to-text',
      badge: 'UTILITY',
      badgeType: 'muted',
      category: 'convert',
    },
    {
      title: 'PDF to PowerPoint',
      description: 'Turn your PDF slides into editable PPTX presentations.',
      icon: Presentation,
      path: '/pdf-to-ppt',
      badge: 'SLIDES',
      badgeType: 'muted',
      category: 'convert',
    },
    {
      title: 'Rotate PDF',
      description: 'Rotate PDF pages clockwise or counter-clockwise permanently.',
      icon: RotateCw,
      path: '/rotate-pdf',
      badge: 'ORGANIZE',
      badgeType: 'muted',
      category: 'organize',
    },
    {
      title: 'Protect PDF',
      description: 'Encrypt your PDF with strong password protection.',
      icon: Lock,
      path: '/protect-pdf',
      badge: 'SECURITY',
      badgeType: 'muted',
      category: 'security',
    },
    {
      title: 'Images to PDF',
      description: 'Convert JPG, PNG, or WebP photos into a single clean PDF.',
      icon: FileCheck,
      path: '/images-to-pdf',
      badge: 'CREATE',
      badgeType: 'muted',
      category: 'convert',
    },
    {
      title: 'Remove Pages',
      description: 'Visually select and delete unwanted pages from your PDF document.',
      icon: Trash2,
      path: '/remove-pages',
      badge: 'NEW',
      badgeType: 'success',
      category: 'organize',
    },
  ];

  const displayedTools = activeCategory === 'all' 
    ? toolsList 
    : toolsList.filter(tool => tool.category === activeCategory);

  return (
    <div className="homepage-container">
      {/* HERO SECTION */}
      <section className="hero-section">
        <div className="container hero-grid">
          <div className="hero-content">
            <div className="hero-badge-pill">
              <Zap size={14} className="hero-pill-icon" />
              <span>Simatrix Academy PDF Tools Suite</span>
            </div>

            <h1 className="hero-title">
              Simple PDF tools. <br />
              <span className="hero-title-gradient">Fast results.</span>
            </h1>

            <p className="hero-subtitle">
              Convert, merge, split, compress, and manage your PDF files quickly, securely, and without quality loss. 100% free with zero file tracking.
            </p>

            <div className="hero-cta-row">
              <Link to="/pdf-to-jpg" className="btn btn-primary btn-lg hero-cta-btn">
                <FileImage size={22} /> Convert PDF to JPG Now
              </Link>
              <a href="#tools-catalog" className="btn btn-secondary btn-lg">
                Explore All Tools
              </a>
            </div>

            <div className="hero-features-strip">
              <div className="strip-item"><CheckCircle size={16} /> No Registration</div>
              <div className="strip-item"><ShieldCheck size={16} /> Automatic File Erasure</div>
              <div className="strip-item"><Zap size={16} /> Lightning Speed</div>
            </div>
          </div>

          <div className="hero-media">
            <div className="hero-advisor-card">
              <div className="hero-glow-backdrop"></div>
              
              <div className="advisor-header">
                <div className="advisor-title-group">
                  <div className="advisor-badge-icon">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="advisor-main-title">Simatrix Academy</h3>
                    <p className="advisor-main-sub">Smart PDF Processing Suite</p>
                  </div>
                </div>
                <div className="advisor-status-chip">
                  <span className="live-pulse"></span> Active Engine
                </div>
              </div>

              <div className="advisor-card-content">
                <div className="advisor-doc-preview">
                  <div className="preview-top">
                    <FileImage size={22} className="doc-icon" />
                    <div className="doc-info">
                      <span className="doc-filename">Document_Conversion.pdf</span>
                      <span className="doc-detail">12 Pages • High-Res Rendering</span>
                    </div>
                    <span className="doc-badge">Ready</span>
                  </div>

                  <div className="preview-bar-track">
                    <div className="preview-bar-fill"></div>
                  </div>

                  <div className="advisor-highlights">
                    <div className="highlight-chip"><Zap size={14} /> High Speed</div>
                    <div className="highlight-chip"><ShieldCheck size={14} /> 100% Secure</div>
                    <div className="highlight-chip"><CheckCircle size={14} /> No Loss</div>
                  </div>
                </div>
              </div>

              <div className="hero-image-tagline">
                <span className="tagline-dot"></span>
                SIMATRIX ACADEMY • SMART DOCUMENT SUITE
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SINGLE UNIFIED TOOLS CATALOG */}
      <section className="tools-section container" id="tools-catalog">
        <div className="section-header">
          <div>
            <h2 className="section-title">PDF Tools Catalog</h2>
            <p className="section-subtitle">Select a tool to start processing your document</p>
          </div>

          {/* Category Tabs */}
          <div className="category-tabs-bar">
            <button 
              className={`category-tab ${activeCategory === 'all' ? 'active' : ''}`}
              onClick={() => setActiveCategory('all')}
            >
              All Tools
            </button>
            <button 
              className={`category-tab ${activeCategory === 'convert' ? 'active' : ''}`}
              onClick={() => setActiveCategory('convert')}
            >
              Convert PDF
            </button>
            <button 
              className={`category-tab ${activeCategory === 'organize' ? 'active' : ''}`}
              onClick={() => setActiveCategory('organize')}
            >
              Organize & Edit
            </button>
            <button 
              className={`category-tab ${activeCategory === 'security' ? 'active' : ''}`}
              onClick={() => setActiveCategory('security')}
            >
              Security
            </button>
          </div>
        </div>

        {/* Tools Catalog Grid */}
        <div className="tools-grid">
          {displayedTools.map((tool, idx) => (
            <ToolCard key={idx} {...tool} />
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how-it-works-section" id="how-it-works">
        <div className="container">
          <div className="section-header center">
            <h2 className="section-title">How It Works</h2>
            <p className="section-subtitle">Four simple steps to process your PDF files</p>
          </div>

          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">01</div>
              <h3 className="step-title">Choose a Tool</h3>
              <p className="step-desc">Select the PDF utility you need from our catalog.</p>
            </div>

            <div className="step-card">
              <div className="step-number">02</div>
              <h3 className="step-title">Upload File</h3>
              <p className="step-desc">Drag and drop your document into the upload box.</p>
            </div>

            <div className="step-card">
              <div className="step-number">03</div>
              <h3 className="step-title">Process</h3>
              <p className="step-desc">Our high-speed engine converts or modifies your file.</p>
            </div>

            <div className="step-card">
              <div className="step-number">04</div>
              <h3 className="step-title">Download</h3>
              <p className="step-desc">Save your processed file or ZIP archive instantly.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
