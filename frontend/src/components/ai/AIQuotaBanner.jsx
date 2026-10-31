import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBolt,
  faRotateRight,
  faCircleCheck,
  faTriangleExclamation,
  faBan
} from '@fortawesome/free-solid-svg-icons';
import './AIQuotaBanner.css';

export default function AIQuotaBanner({
  quota,
  onRefresh,
  isLoading = false,
  onUpgradeClick
}) {
  if (!quota) return null;

  const total = quota.total_allowed ?? 5;
  const used = quota.used_count ?? 0;
  const remaining = quota.remaining ?? Math.max(0, total - used);
  const isBlocked = quota.is_blocked || remaining <= 0;
  const percentUsed = Math.min(100, Math.round((used / Math.max(1, total)) * 100));

  let statusClass = 'status-normal';
  let statusIcon = faBolt;
  let statusLabel = `${remaining} request${remaining === 1 ? '' : 's'} remaining`;

  if (isBlocked) {
    statusClass = 'status-exhausted';
    statusIcon = faBan;
    statusLabel = 'Quota limit reached (0 remaining)';
  } else if (remaining === 1) {
    statusClass = 'status-warning';
    statusIcon = faTriangleExclamation;
    statusLabel = '1 request remaining';
  }

  return (
    <div className={`ai-quota-banner ${statusClass}`}>
      <div className="ai-quota-left">
        <div className="ai-quota-icon-badge">
          <FontAwesomeIcon icon={statusIcon} />
        </div>
        <div className="ai-quota-info">
          <div className="ai-quota-title-row">
            <span className="ai-quota-title">AI Engine Quota</span>
            <span className="ai-quota-badge">{statusLabel}</span>
          </div>
          <div className="ai-quota-meter-wrapper">
            <div className="ai-quota-meter-track">
              <div
                className="ai-quota-meter-fill"
                style={{ width: `${percentUsed}%` }}
              />
            </div>
            <span className="ai-quota-count">
              {used} / {total} used
            </span>
          </div>
        </div>
      </div>

      <div className="ai-quota-actions">
        {onRefresh && (
          <button
            type="button"
            className="ai-quota-btn-refresh"
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh AI quota balance"
            aria-label="Refresh AI quota"
          >
            <FontAwesomeIcon icon={faRotateRight} spin={isLoading} />
          </button>
        )}
        {isBlocked && onUpgradeClick && (
          <button
            type="button"
            className="ai-quota-btn-upgrade"
            onClick={onUpgradeClick}
          >
            Request Increase
          </button>
        )}
      </div>
    </div>
  );
}
