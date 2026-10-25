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
  badge,
  badgeType = 'primary',
}) {
  const toolId = `tool-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

  return (
    <Link to={path} className="tool-card" id={toolId}>
      <div className="tool-card-top">
        <div className="tool-icon-wrapper">
          {icon && <FontAwesomeIcon icon={icon} className="tool-fa-icon" />}
        </div>
        {badge && (
          <span className={`badge badge-${badgeType}`}>
            {badge}
          </span>
        )}
      </div>

      <h3 className="tool-title">{title}</h3>
      <p className="tool-description">{description}</p>

      <div className="tool-card-footer">
        <span className="tool-action-link">Open tool</span>
        <FontAwesomeIcon icon={faArrowRight} className="tool-arrow" />
      </div>
    </Link>
  );
}
