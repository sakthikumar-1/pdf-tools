import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faSpinner } from '@fortawesome/free-solid-svg-icons';

export default function AISampleDocumentButton({
  onSelectFile,
  disabled = false,
  className = '',
  label = 'Try Sample Document'
}) {
  const [loading, setLoading] = useState(false);

  const handleLoadSample = async () => {
    if (disabled || loading) return;
    setLoading(true);

    try {
      const response = await fetch('/sample_document.pdf');
      if (!response.ok) {
        throw new Error('Failed to load sample document.');
      }
      const blob = await response.blob();
      const sampleFile = new File([blob], 'sample_document.pdf', {
        type: 'application/pdf',
        lastModified: Date.now()
      });
      if (onSelectFile) {
        onSelectFile(sampleFile);
      }
    } catch (err) {
      console.error('Error loading sample document:', err);
      alert('Could not load sample document. Please select a local PDF file.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLoadSample}
      disabled={disabled || loading}
      className={`ai-btn-sample ${className}`}
      title="Load official Simatrix sample PDF (Zero quota deducted)"
    >
      <FontAwesomeIcon icon={loading ? faSpinner : faFilePdf} spin={loading} />
      <span>{loading ? 'Loading Sample...' : label}</span>
    </button>
  );
}

