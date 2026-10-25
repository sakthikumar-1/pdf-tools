import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faLock, 
  faEye, 
  faEyeSlash, 
  faCheck, 
  faXmark, 
  faShieldHalved 
} from '@fortawesome/free-solid-svg-icons';
import './ProtectPasswordPanel.css';

export default function ProtectPasswordPanel({
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  onValidationChange
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Requirements checks
  const reqs = {
    hasUpperAndLower: /[a-z]/.test(password) && /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    hasMinLength: password.length >= 8,
  };

  const isPasswordValid = reqs.hasUpperAndLower && reqs.hasNumber && reqs.hasSpecial && reqs.hasMinLength;
  const isMatch = password && confirmPassword && password === confirmPassword;

  useEffect(() => {
    if (onValidationChange) {
      onValidationChange(isPasswordValid && isMatch);
    }
  }, [isPasswordValid, isMatch, onValidationChange]);

  return (
    <div className="protect-password-panel">
      <div className="protect-panel-header">
        <h3 className="protect-panel-title">Set document password</h3>
      </div>

      <div className="password-fields-wrapper">
        {/* Main Password Input with Floating Tooltip Popover */}
        <div className="password-field-group">
          <div className="password-input-container">
            <FontAwesomeIcon icon={faLock} className="field-icon-left" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 250)}
              placeholder="Enter encryption password..."
              className="password-text-input"
              aria-label="Document password"
            />
            <button
              type="button"
              className="eye-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
              title={showPassword ? 'Hide Password' : 'Show Password'}
              aria-label={showPassword ? 'Hide Password' : 'Show Password'}
            >
              <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
            </button>
          </div>

          {/* Requirements Tooltip */}
          {(isFocused || (password.length > 0 && !isPasswordValid)) && (
            <div className="password-requirements-popover" role="tooltip">
              <div className="popover-arrow"></div>
              <div className="req-item">
                <span className={`req-icon ${reqs.hasUpperAndLower ? 'pass' : 'fail'}`}>
                  <FontAwesomeIcon icon={reqs.hasUpperAndLower ? faCheck : faXmark} />
                </span>
                <span className="req-label">Lowercase &amp; Uppercase letters</span>
              </div>
              <div className="req-item">
                <span className={`req-icon ${reqs.hasNumber ? 'pass' : 'fail'}`}>
                  <FontAwesomeIcon icon={reqs.hasNumber ? faCheck : faXmark} />
                </span>
                <span className="req-label">At least one number (0-9)</span>
              </div>
              <div className="req-item">
                <span className={`req-icon ${reqs.hasSpecial ? 'pass' : 'fail'}`}>
                  <FontAwesomeIcon icon={reqs.hasSpecial ? faCheck : faXmark} />
                </span>
                <span className="req-label">Special character (!@#$%^&amp;*)</span>
              </div>
              <div className="req-item">
                <span className={`req-icon ${reqs.hasMinLength ? 'pass' : 'fail'}`}>
                  <FontAwesomeIcon icon={reqs.hasMinLength ? faCheck : faXmark} />
                </span>
                <span className="req-label">Minimum 8 characters</span>
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password Input */}
        <div className="password-field-group">
          <div className="password-input-container">
            <FontAwesomeIcon icon={faLock} className="field-icon-left" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm encryption password..."
              className="password-text-input"
              aria-label="Confirm password"
            />
            <button
              type="button"
              className="eye-toggle-btn"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              title={showConfirmPassword ? 'Hide Password' : 'Show Password'}
              aria-label={showConfirmPassword ? 'Hide Password' : 'Show Password'}
            >
              <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />
            </button>
          </div>

          {confirmPassword && !isMatch && (
            <div className="password-match-error" role="alert">
              Passwords do not match
            </div>
          )}
          {confirmPassword && isMatch && (
            <div className="password-match-success">
              <FontAwesomeIcon icon={faShieldHalved} />
              <span>Passwords match and criteria satisfied</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
