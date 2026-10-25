import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faDownload, 
  faFileZipper, 
  faRotateRight, 
  faCircleCheck, 
  faFileImage 
} from '@fortawesome/free-solid-svg-icons';
import confetti from 'canvas-confetti';
import { downloadFile } from '../utils/fileUtils';
import './DownloadButton.css';

export default function DownloadButton({
  convertedImages = [],
  originalFileName = 'document.pdf',
  onConvertAnother,
  onDownloadZip,
  isZipping = false,
}) {
  const triggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  React.useEffect(() => {
    triggerConfetti();
  }, []);

  const totalImages = convertedImages.length;
  const isMultiPage = totalImages > 1;

  const handleSingleDownload = (imgObj, index) => {
    const defaultName = originalFileName.replace(/\.[^/.]+$/, "") + `-page-${index + 1}.jpg`;
    downloadFile(imgObj.dataUrl || imgObj.url, imgObj.name || defaultName);
  };

  return (
    <div className="download-success-container">
      {/* Banner */}
      <div className="success-banner">
        <div className="success-icon-badge">
          <FontAwesomeIcon icon={faCircleCheck} size="2x" />
        </div>
        <div className="success-banner-text">
          <h2 className="success-title">Conversion Complete</h2>
          <p className="success-subtitle">
            Successfully converted <strong>{totalImages} {totalImages === 1 ? 'page' : 'pages'}</strong> into high-quality JPG image{totalImages > 1 ? 's' : ''}.
          </p>
        </div>
      </div>

      {/* Main Download Action Bar */}
      <div className="main-download-box">
        {isMultiPage ? (
          <button
            type="button"
            className="btn btn-primary btn-lg main-download-btn"
            onClick={() => {
              triggerConfetti();
              onDownloadZip();
            }}
            disabled={isZipping}
          >
            {isZipping ? (
              <>Creating ZIP Archive...</>
            ) : (
              <>
                <FontAwesomeIcon icon={faFileZipper} />
                <span>Download All as ZIP ({totalImages} Pages)</span>
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary btn-lg main-download-btn"
            onClick={() => {
              triggerConfetti();
              handleSingleDownload(convertedImages[0], 0);
            }}
          >
            <FontAwesomeIcon icon={faDownload} />
            <span>Download JPG Image</span>
          </button>
        )}

        <button
          type="button"
          className="btn btn-secondary btn-lg convert-another-btn"
          onClick={onConvertAnother}
        >
          <FontAwesomeIcon icon={faRotateRight} />
          <span>Convert Another PDF</span>
        </button>
      </div>

      {/* Converted Pages Image Grid Preview */}
      <div className="converted-preview-section">
        <div className="preview-header">
          <h3 className="preview-title">
            <FontAwesomeIcon icon={faFileImage} className="preview-title-icon" />
            <span>Generated Images ({totalImages})</span>
          </h3>
          {isMultiPage && (
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={onDownloadZip}
              disabled={isZipping}
            >
              <FontAwesomeIcon icon={faFileZipper} />
              <span>Download ZIP</span>
            </button>
          )}
        </div>

        <div className="image-grid">
          {convertedImages.map((img, idx) => (
            <div className="image-card" key={idx}>
              <div className="image-preview-wrapper">
                <img
                  src={img.dataUrl || img.url}
                  alt={`Page ${idx + 1}`}
                  className="converted-img"
                  loading="lazy"
                />
                <div className="image-overlay">
                  <button
                    type="button"
                    className="image-download-overlay-btn"
                    onClick={() => handleSingleDownload(img, idx)}
                    title={`Download Page ${idx + 1}`}
                  >
                    <FontAwesomeIcon icon={faDownload} />
                    <span>Download Page {idx + 1}</span>
                  </button>
                </div>
              </div>

              <div className="image-card-info">
                <span className="page-label">Page {idx + 1}</span>
                <button
                  type="button"
                  className="page-download-icon-btn"
                  onClick={() => handleSingleDownload(img, idx)}
                  title="Download image"
                  aria-label={`Download Page ${idx + 1}`}
                >
                  <FontAwesomeIcon icon={faDownload} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
