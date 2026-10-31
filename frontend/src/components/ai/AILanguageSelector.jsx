import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLanguage } from '@fortawesome/free-solid-svg-icons';
import './AILanguageSelector.css';

export const SUPPORTED_AI_LANGUAGES = [
  { code: 'tamil', label: 'Tamil', nativeLabel: 'தமிழ்' },
  { code: 'hindi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'english', label: 'English', nativeLabel: 'English' },
  { code: 'spanish', label: 'Spanish', nativeLabel: 'Español' },
  { code: 'french', label: 'French', nativeLabel: 'Français' },
  { code: 'german', label: 'German', nativeLabel: 'Deutsch' },
  { code: 'japanese', label: 'Japanese', nativeLabel: '日本語' },
  { code: 'chinese', label: 'Chinese (Simplified)', nativeLabel: '简体中文' },
  { code: 'arabic', label: 'Arabic', nativeLabel: 'العربية' },
  { code: 'portuguese', label: 'Portuguese', nativeLabel: 'Português' },
  { code: 'russian', label: 'Russian', nativeLabel: 'Русский' },
  { code: 'italian', label: 'Italian', nativeLabel: 'Italiano' }
];

export default function AILanguageSelector({
  value = 'tamil',
  onChange,
  disabled = false,
  label = 'Target Language'
}) {
  return (
    <div className="ai-language-selector-wrapper">
      {label && <label className="ai-language-label">{label}</label>}
      <div className="ai-language-select-box">
        <FontAwesomeIcon icon={faLanguage} className="ai-language-icon" />
        <select
          value={value}
          onChange={(e) => onChange && onChange(e.target.value)}
          disabled={disabled}
          className="ai-language-select"
        >
          {SUPPORTED_AI_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label} ({lang.nativeLabel})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

