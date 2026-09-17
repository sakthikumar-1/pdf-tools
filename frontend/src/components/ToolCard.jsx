import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import './ToolCard.css';

export default function ToolCard({
  title,
  description,
  icon: Icon,
  path,
  badge,
  badgeType = 'primary',
  popular = false,
}) {
  return (
    <Link to={path} className={`tool-card ${popular ? 'popular' : ''}`}>
      <div className="tool-card-header">
        <div className="tool-icon-wrapper">
          <Icon size={24} className="tool-icon" />
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
        <span className="tool-action-text">Use Tool</span>
        <ArrowRight size={16} className="tool-arrow" />
      </div>
    </Link>
  );
}
