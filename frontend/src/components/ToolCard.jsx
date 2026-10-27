import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import './ToolCard.css';

export default function ToolCard({
  title,
  description,
  icon,
  iconColor,
  path,
  badge,
  badgeType = 'primary',
}) {
  const toolId = `tool-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

  return (
    <Link to={path} className="tool-card" id={toolId}>
      <div className="tool-card-header">
        <div 
          className="tool-icon-badge" 
          style={{ 
            backgroundColor: iconColor ? `${iconColor}18` : 'rgba(255, 194, 71, 0.15)',
            color: iconColor || 'var(--color-gold)'
          }}
        >
          {icon && <FontAwesomeIcon icon={icon} className="tool-icon-glyph" />}
        </div>

        <div className="tool-card-action">
          {badge && (
            <span className={`badge badge-${badgeType}`}>
              {badge}
            </span>
          )}
          <span className="tool-arrow-circle">
            <FontAwesomeIcon icon={faArrowRight} />
          </span>
        </div>
      </div>

      <div className="tool-card-body">
        <h3 className="tool-card-title">{title}</h3>
        <p className="tool-card-desc">{description}</p>
      </div>
    </Link>
  );
}
