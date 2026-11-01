import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShieldHalved,
  faServer,
  faClock,
  faBrain,
  faTrashCan,
  faLock,
  faDatabase,
  faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import './PrivacyPolicy.css';

export default function PrivacyPolicy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="privacy-page-container">
      {/* Header Banner */}
      <div className="privacy-header">
        <Link to="/" className="privacy-back-link">
          <FontAwesomeIcon icon={faArrowLeft} />
          <span>Back to Home</span>
        </Link>
        <div className="privacy-header-badge">
          <FontAwesomeIcon icon={faShieldHalved} />
          <span>Data Governance & Transparency</span>
        </div>
        <h1 className="privacy-title">Privacy Policy</h1>
        <p className="privacy-subtitle">
          Effective Date: November 1, 2026 | Policy Version: 2026.1
        </p>
      </div>

      <div className="privacy-content-card">
        {/* Section 1: Overview & Identity */}
        <section className="privacy-section">
          <h2 className="privacy-section-heading">1. Introduction & Overview</h2>
          <p>
            Welcome to Simatrix PDF (&quot;we&quot;, &quot;our&quot;, or &quot;the Service&quot;). We respect your privacy and are committed to transparency regarding how documents and data are processed when you use our web utilities and artificial intelligence features.
          </p>
          <p>
            Customer-facing document intelligence features throughout our platform operate under the brand <strong>Simatrix AI</strong>. This policy details our document lifecycle, processing pipeline, retention schedules, and data safeguards.
          </p>
        </section>

        {/* Section 2: Standard Server-Side Processing */}
        <section className="privacy-section">
          <div className="privacy-section-icon-row">
            <FontAwesomeIcon icon={faServer} className="privacy-icon" />
            <h2 className="privacy-section-heading">2. Server-Side Document Processing</h2>
          </div>
          <p>
            When you use standard PDF conversion and utility tools (such as PDF to Word, Merge PDF, Compress PDF, PDF to JPG, or Protect PDF), your document is uploaded securely over TLS to isolated server nodes to execute the necessary file transformation.
          </p>
          <p>
            These transformations are purely algorithmic operations designed to convert file structures, compress image assets, or parse layouts according to your instructions. We do not inspect document text or analyze contents during standard PDF utilities.
          </p>
        </section>

        {/* Section 3: Simatrix AI Infrastructure & External AI Processing */}
        <section className="privacy-section">
          <div className="privacy-section-icon-row">
            <FontAwesomeIcon icon={faBrain} className="privacy-icon" />
            <h2 className="privacy-section-heading">3. Simatrix AI Processing & Infrastructure</h2>
          </div>
          <p>
            Our document intelligence features (including <strong>AI Summarizer</strong>, <strong>Ask PDF</strong>, <strong>PDF Translator</strong>, <strong>Key Points Extractor</strong>, <strong>Data Extractor</strong>, <strong>Question Generator</strong>, <strong>PDF Rewriter</strong>, and <strong>PDF Comparison</strong>) operate under the <strong>Simatrix AI</strong> product identity.
          </p>
          <p>
            <strong>Underlying Model Infrastructure:</strong> Simatrix PDF does not operate a proprietary foundation model. To deliver high-accuracy semantic document processing, extracted document text is transmitted to commercial cloud AI API providers.
          </p>
          <p>
            <strong>Zero Public Model Training:</strong> Under standard commercial API developer agreements, customer data submitted through paid API endpoints is not used to train, retrain, or improve public foundation models. We do not publish inflated claims of custom bespoke enterprise guarantees where standard commercial developer API terms govern.
          </p>
          <p>
            <strong>Explicit User Consent:</strong> Document text is only transmitted to external cloud AI infrastructure after you explicitly opt in by checking the Simatrix AI Processing agreement. Your consent status is recorded on your profile and respected across sessions.
          </p>
        </section>

        {/* Section 4: File Retention & Temporary Storage */}
        <section className="privacy-section">
          <div className="privacy-section-icon-row">
            <FontAwesomeIcon icon={faClock} className="privacy-icon" />
            <h2 className="privacy-section-heading">4. Temporary File Retention & Scheduled Cleanup</h2>
          </div>
          <p>
            We do not make misleading claims of instantaneous or zero retention. To deliver reliable file downloads and execute multi-step conversions:
          </p>
          <ul className="privacy-bullet-list">
            <li>
              <strong>Uploaded Files & Conversions:</strong> Uploaded PDFs and generated output files (e.g. converted DOCX, compressed PDFs, ZIP archives) are stored temporarily in isolated server storage solely to complete the requested operation and serve your authenticated download.
            </li>
            <li>
              <strong>15-Minute Automated Cleanup:</strong> A production background timer runs every 15 minutes to delete temporary files and invalidate expired download tokens (TTL 900 seconds). Files are never retained permanently.
            </li>
          </ul>
        </section>

        {/* Section 5: Ask PDF Context Retention */}
        <section className="privacy-section">
          <div className="privacy-section-icon-row">
            <FontAwesomeIcon icon={faDatabase} className="privacy-icon" />
            <h2 className="privacy-section-heading">5. Ask PDF Conversational Context (Up to 24 Hours)</h2>
          </div>
          <p>
            The <strong>Ask PDF (AI Chat)</strong> utility enables multi-turn conversations and page-cited grounding over long documents. To support this:
          </p>
          <ul className="privacy-bullet-list">
            <li>
              Document text chunks, BM25 retrieval metadata, and conversational turn history are retained in database storage for <strong>up to 24 hours</strong> from creation.
            </li>
            <li>
              After 24 hours, expired sessions and their associated document chunks automatically expire and are purged by our 15-minute scheduled cleanup worker.
            </li>
            <li>
              You can permanently delete your active Ask PDF session and all indexed chunk context immediately at any time by clicking <strong>&quot;Delete Chat&quot;</strong> in the chat interface.
            </li>
          </ul>
        </section>

        {/* Section 6: Guest Identity & Device Tokens */}
        <section className="privacy-section">
          <div className="privacy-section-icon-row">
            <FontAwesomeIcon icon={faLock} className="privacy-icon" />
            <h2 className="privacy-section-heading">6. Guest Device Tokens & Privacy</h2>
          </div>
          <p>
            To provide frictionless access without requiring registration, Simatrix PDF supports anonymous guest usage with one free lifetime AI request:
          </p>
          <ul className="privacy-bullet-list">
            <li>
              Guest identity is maintained using an anonymous, cryptographically random token stored in a secure <code>HttpOnly</code> browser cookie.
            </li>
            <li>
              Only a SHA-256 cryptographic hash of this token is stored on our servers. The raw token is never logged or exposed.
            </li>
            <li>
              We <strong>do not</strong> use invasive hardware fingerprinting (e.g., canvas or audio fingerprinting). Guest profiles require no email, name, or password.
            </li>
          </ul>
        </section>

        {/* Section 7: Security & Encryption */}
        <section className="privacy-section">
          <div className="privacy-section-icon-row">
            <FontAwesomeIcon icon={faShieldHalved} className="privacy-icon" />
            <h2 className="privacy-section-heading">7. Security & Encryption</h2>
          </div>
          <p>
            All network communication between your browser and Simatrix PDF is encrypted using modern TLS (HTTPS). Internal services enforce strict row-level tenant isolation, rate limiting, and time-signed download tokens to ensure that only the session owner can access processed files.
          </p>
        </section>

        {/* Section 8: Inquiries & Contact */}
        <section className="privacy-section">
          <h2 className="privacy-section-heading">8. Questions & Contact</h2>
          <p>
            If you have questions about our data handling practices or wish to submit feedback regarding Simatrix AI, please contact our team at{' '}
            <a href="mailto:privacy@simatrix.com" className="privacy-mail-link">
              privacy@simatrix.com
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
}

