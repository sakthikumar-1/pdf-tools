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
            <strong>Commercial API Privacy Protections:</strong> Simatrix PDF utilizes commercial developer API tiers provided by cloud AI infrastructure providers (such as DeepSeek and Google Gemini API). Under standard commercial terms for paid developer API tiers, customer inputs and generated outputs are not used by upstream providers to train, retrain, or improve public foundation models. We do not publish an unconditional or blanket guarantee where provider terms depend on commercial account tiers; rather, we strictly configure and maintain paid commercial developer accounts with data segregation controls enabled.
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
              <strong>Automated Scheduled Cleanup (15–30 Minute Cycle):</strong> Temporary upload and output files expire 15 minutes (900 seconds) after creation, at which point their download tokens are invalidated. Automated cleanup sweeps run on a recurring 15-minute schedule to permanently purge all files whose age exceeds this 15-minute threshold. Depending on when your file was created within the recurring cycle, files are unlinked and permanently deleted within approximately 15 to 30 minutes of completion. Files are never retained permanently.
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
              After 24 hours, expired sessions and their associated document chunks automatically expire and are purged during our scheduled 15-minute cleanup sweeps.
            </li>
            <li>
              You can permanently delete your active Ask PDF session and all indexed chunk context immediately at any time by clicking <strong>&quot;Delete Chat&quot;</strong> in the chat interface.
            </li>
          </ul>
        </section>

        {/* Section 6: Authentication & Zero Fingerprinting */}
        <section className="privacy-section">
          <div className="privacy-section-icon-row">
            <FontAwesomeIcon icon={faLock} className="privacy-icon" />
            <h2 className="privacy-section-heading">6. Account Authentication & No Device Fingerprinting</h2>
          </div>
          <p>
            Simatrix PDF operates with strict privacy principles and clear access boundaries:
          </p>
          <ul className="privacy-bullet-list">
            <li>
              <strong>Standard PDF Utilities:</strong> All 19 standard PDF utilities (PDF to Word, Merge, Split, Protect, Crop, Rotate, Watermark, etc.) remain fully accessible without requiring user registration or authentication.
            </li>
            <li>
              <strong>Simatrix AI Features:</strong> Access to advanced AI features requires an authenticated registered account via Google OAuth. Each registered user receives 5 free lifetime AI operations.
            </li>
            <li>
              <strong>Zero Persistent Tracking:</strong> We do not issue guest tracking cookies or anonymous device tokens, and we <strong>do not</strong> use invasive hardware or browser fingerprinting (such as canvas, WebGL, font, or audio fingerprinting).
            </li>
            <li>
              <strong>Short-Lived Abuse Prevention:</strong> IP addresses are utilized solely for short-lived sliding-window security rate limiting to prevent automated denial-of-service attacks, and are never used as a permanent visitor identity.
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

