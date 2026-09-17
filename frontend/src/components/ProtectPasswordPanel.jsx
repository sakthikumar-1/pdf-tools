import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, Check, X, ShieldCheck } from 'lucide-react';
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
        <h3 className="protect-panel-title">Set a password</h3>
      </div>

      <div className="password-fields-wrapper">
        {/* Main Password Input with Floating Tooltip Popover */}
        <div className="password-field-group">
          <div className="password-input-container">
            <Lock size={18} className="field-icon-left" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 250)}
              placeholder="Enter password..."
              className="password-text-input"
            />
            <button
              type="button"
              className="eye-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
              title={showPassword ? 'Hide Password' : 'Show Password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Floating Requirements Tooltip (Shown when focused or password invalid) */}
          {(isFocused || (password.length > 0 && !isPasswordValid)) && (
            <div className="password-requirements-popover">
              <div className="popover-arrow"></div>
              <div className="req-item">
                <span className={`req-icon ${reqs.hasUpperAndLower ? 'pass' : 'fail'}`}>
                  {reqs.hasUpperAndLower ? <Check size={14} /> : <X size={14} />}
                </span>
                <span className="req-label">Lowercase &amp; Uppercase</span>
              </div>
              <div className="req-item">
                <span className={`req-icon ${reqs.hasNumber ? 'pass' : 'fail'}`}>
                  {reqs.hasNumber ? <Check size={14} /> : <X size={14} />}
                </span>
                <span className="req-label">Number (0-9)</span>
              </div>
              <div className="req-item">
                <span className={`req-icon ${reqs.hasSpecial ? 'pass' : 'fail'}`}>
                  {reqs.hasSpecial ? <Check size={14} /> : <X size={14} />}
                </span>
                <span className="req-label">Special Character (!@#$%^&amp;*)</span>
              </div>
              <div className="req-item">
                <span className={`req-icon ${reqs.hasMinLength ? 'pass' : 'fail'}`}>
                  {reqs.hasMinLength ? <Check size={14} /> : <X size={14} />}
                </span>
                <span className="req-label">At least 8 Characters</span>
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password Input */}
        <div className="password-field-group">
          <div className="password-input-container">
            <Lock size={18} className="field-icon-left" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password..."
              className="password-text-input"
            />
            <button
              type="button"
              className="eye-toggle-btn"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              title={showConfirmPassword ? 'Hide Password' : 'Show Password'}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {confirmPassword && !isMatch && (
            <div className="password-match-error">
              Passwords do not match
            </div>
          )}
          {confirmPassword && isMatch && (
            <div className="password-match-success">
              <ShieldCheck size={14} /> Passwords match!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
