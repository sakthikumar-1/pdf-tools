import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faClock } from '@fortawesome/free-solid-svg-icons';
import './ToolCard.css';

export default function ToolCard({
  title,
  description,
  icon,
  path,
  variant = 'compact', // 'compact' for All Utilities, 'popular' for Popular Tools
  badge,
  comingSoon = false
}) {
  const toolId = `tool-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

  if (comingSoon) {
    if (variant === 'popular') {
      return (
        <div
          className="tool-card-popular is-coming-soon"
          id={toolId}
          title={`${title}: Under active development (Coming Soon)`}
        >
          <div className="popular-top-row">
            <div className="popular-icon-box" aria-hidden="true">
              {icon && <FontAwesomeIcon icon={icon} className="popular-icon-glyph" />}
            </div>
            <span className="tool-card-badge coming-soon">
              <FontAwesomeIcon icon={faClock} /> Coming Soon
            </span>
          </div>
          <h3 className="popular-card-title">{title}</h3>
          <p className="popular-card-desc">{description}</p>
        </div>
      );
    }

    return (
      <div
        className="tool-card-compact is-coming-soon"
        id={toolId}
        title={`${title}: Under active development (Coming Soon)`}
      >
        <div className="compact-icon-box" aria-hidden="true">
          {icon && <FontAwesomeIcon icon={icon} className="compact-icon-glyph" />}
        </div>
        <div className="compact-text-box">
          <span className="compact-tool-title">{title}</span>
        </div>
        <span className="tool-card-badge coming-soon compact">
          Coming Soon
        </span>
      </div>
    );
  }

  if (variant === 'popular') {
    return (
      <Link to={path} className="tool-card-popular" id={toolId}>
        <div className="popular-icon-box" aria-hidden="true">
          {icon && <FontAwesomeIcon icon={icon} className="popular-icon-glyph" />}
        </div>
        <h3 className="popular-card-title">{title}</h3>
        <p className="popular-card-desc">{description}</p>
        <span className="popular-card-arrow" aria-hidden="true">
          <FontAwesomeIcon icon={faArrowRight} />
        </span>
      </Link>
    );
  }

  return (
    <Link to={path} className="tool-card-compact" id={toolId} title={`${title}: ${description}`}>
      <div className="compact-icon-box" aria-hidden="true">
        {icon && <FontAwesomeIcon icon={icon} className="compact-icon-glyph" />}
      </div>
      <div className="compact-text-box">
        <span className="compact-tool-title">{title}</span>
      </div>
      <span className="compact-tool-arrow" aria-hidden="true">
        <FontAwesomeIcon icon={faArrowRight} />
      </span>
    </Link>
  );
}
