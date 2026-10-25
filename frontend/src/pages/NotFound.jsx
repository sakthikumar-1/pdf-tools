import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileCircleQuestion, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import './NotFound.css';

export default function NotFound() {
  return (
    <div className="notfound-container container">
      <div className="notfound-card">
        <div className="notfound-badge">
          <FontAwesomeIcon icon={faFileCircleQuestion} />
        </div>
        <h1 className="notfound-code">404</h1>
        <h2 className="notfound-title">Page Not Found</h2>
        <p className="notfound-desc">
          The PDF tool or page you requested does not exist or may have been relocated.
        </p>
        <Link to="/" className="btn btn-primary btn-md">
          <FontAwesomeIcon icon={faArrowLeft} />
          <span>Return to Homepage</span>
        </Link>
      </div>
    </div>
  );
}
