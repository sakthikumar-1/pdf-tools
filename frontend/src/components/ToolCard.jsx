import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import './ToolCard.css';

export default function ToolCard({
  title,
  description,
  icon,
  path,
  variant = 'compact', // 'compact' for All Utilities, 'popular' for Popular Tools
  badge,
}) {
  const toolId = `tool-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

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
