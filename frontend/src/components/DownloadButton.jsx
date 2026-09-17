import React from 'react';
import { Download, Archive, RefreshCw, CheckCircle2, Eye, FileImage } from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatFileSize } from '../utils/formatFileSize';
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
          <CheckCircle2 size={32} />
        </div>
        <div className="success-banner-text">
          <h2 className="success-title">Conversion Complete!</h2>
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
            className="btn btn-primary btn-lg main-download-btn pulse-glow"
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
                <Archive size={24} /> Download All as ZIP ({totalImages} Pages)
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary btn-lg main-download-btn pulse-glow"
            onClick={() => {
              triggerConfetti();
              handleSingleDownload(convertedImages[0], 0);
            }}
          >
            <Download size={24} /> DOWNLOAD JPG IMAGE
          </button>
        )}

        <button
          type="button"
          className="btn btn-secondary btn-lg convert-another-btn"
          onClick={onConvertAnother}
        >
          <RefreshCw size={18} /> Convert Another PDF
        </button>
      </div>

      {/* Converted Pages Image Grid Preview */}
      <div className="converted-preview-section">
        <div className="preview-header">
          <h3 className="preview-title">
            <FileImage size={18} /> Generated Images ({totalImages})
          </h3>
          {isMultiPage && (
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={onDownloadZip}
              disabled={isZipping}
            >
              <Archive size={14} /> Download ZIP
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
                    <Download size={18} /> Download Page {idx + 1}
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
                >
                  <Download size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
