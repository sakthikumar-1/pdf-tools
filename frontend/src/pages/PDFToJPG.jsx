import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFileImage, 
  faGear, 
  faRotateRight, 
  faCheck, 
  faCircleQuestion,
  faShieldHalved,
  faWandMagicSparkles,
  faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import { pdfjsLib } from '../utils/pdfjsConfig';
import JSZip from 'jszip';
import UploadBox from '../components/UploadBox';
import FileUploader from '../components/FileUploader';
import ProgressBar from '../components/ProgressBar';
import DownloadButton from '../components/DownloadButton';
import { useFileUpload } from '../hooks/useFileUpload';
import { convertPdfToJpgPython } from '../services/api';
import { downloadFile } from '../utils/fileUtils';
import './PDFToJPG.css';

function PDFToJPGInner() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const {
    file,
    isDragging,
    error,
    status,
    progress,
    setStatus,
    setProgress,
    setError,
    selectFile,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    reset,
  } = useFileUpload();

  // Settings options
  const [qualityDpi, setQualityDpi] = useState(150); // 150 DPI standard, 300 DPI high resolution
  const [convertedImages, setConvertedImages] = useState([]);
  const [backendZipUrl, setBackendZipUrl] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isZipping, setIsZipping] = useState(false);

  // Convert PDF to JPG using PDF.js canvas rendering
  const processPdfToJpg = async () => {
    if (!file) return;

    setStatus('processing');
    setProgress(5);
    setConvertedImages([]);
    setBackendZipUrl(null);
    setError(null);

    try {
      // First attempt Python backend conversion if accessible
      let useClientRendering = true;
      try {
        const result = await convertPdfToJpgPython(file, qualityDpi, (percent) => {
          setProgress(Math.min(90, Math.round(percent * 0.5)));
        });
        if (result && result.success && result.images && result.images.length > 0) {
          if (result.isZip && result.downloadUrl) {
            setBackendZipUrl(result.downloadUrl);
          } else {
            setBackendZipUrl(null);
          }
          const formatted = result.images.map((img) => ({
            pageNumber: img.page,
            fileName: img.filename,
            url: img.download_url,
            previewUrl: img.download_url ? `${img.download_url}?inline=1` : img.download_url,
            size: img.size_bytes,
          }));
          setConvertedImages(formatted);
          setTotalPages(result.pageCount || result.images.length);
          setStatus('success');
          setProgress(100);
          useClientRendering = false;
        }
      } catch (backendErr) {
        console.log('[PDFToJPG] Python backend offline or error, executing client canvas fallback:', backendErr);
      }

      // Fallback or Direct client-side PDF rendering
      if (useClientRendering) {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        const total = pdf.numPages;
        setTotalPages(total);

        const images = [];
        const scale = qualityDpi / 72; // Standard PDF DPI is 72

        for (let pageNum = 1; pageNum <= total; pageNum++) {
          setCurrentPage(pageNum);
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          };

          await page.render(renderContext).promise;

          // Convert canvas to JPG data URL
          const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
          const pageFileName = `${file.name.replace(/\.[^/.]+$/, "")}_page_${pageNum}.jpg`;

          images.push({
            pageNumber: pageNum,
            dataUrl: dataUrl,
            name: pageFileName,
            width: viewport.width,
            height: viewport.height,
          });

          const currentPercent = Math.round((pageNum / total) * 100);
          setProgress(currentPercent);
        }

        setConvertedImages(images);
        setStatus('success');
      }
    } catch (err) {
      console.error('[PDFToJPG Error]:', err);
      setError(err.message || 'Failed to render PDF file. Please ensure the document is not password-protected.');
      setStatus('error');
    }
  };

  // ZIP batch packaging
  const handleDownloadZip = async () => {
    if (convertedImages.length === 0) return;
    setIsZipping(true);

    try {
      const folderName = file ? file.name.replace(/\.[^/.]+$/, "") : "pdf_images";

      // If Python backend created a native ZIP package, download it directly
      if (backendZipUrl) {
        downloadFile(backendZipUrl, `${folderName}.zip`);
        return;
      }

      const zip = new JSZip();
      const folder = zip.folder(folderName);

      for (let idx = 0; idx < convertedImages.length; idx++) {
        const img = convertedImages[idx];
        if (img.dataUrl) {
          const base64Data = img.dataUrl.replace(/^data:image\/jpeg;base64,/, "");
          folder.file(`page_${idx + 1}.jpg`, base64Data, { base64: true });
        } else if (img.url) {
          const res = await fetch(img.url);
          const blob = await res.blob();
          folder.file(`page_${idx + 1}.jpg`, blob);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      downloadFile(content, `${folderName}_images.zip`);
    } catch (err) {
      console.error('ZIP generation error:', err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="tool-page-wrapper container">
      {/* Top Navigation Row with Back Button */}
      <div className="tool-top-nav-row">
        <Link to="/" className="tool-back-link">
          <FontAwesomeIcon icon={faArrowLeft} /> Back to Tools
        </Link>
      </div>

      {/* Tool Title Header */}
      <div className="tool-header">
        <div className="tool-header-icon-badge">
          <FontAwesomeIcon icon={faFileImage} size="2x" />
        </div>
        <h1 className="tool-header-title">PDF to JPG Converter</h1>
        <p className="tool-header-subtitle">
          Convert each PDF page into high-resolution JPG images in seconds.
        </p>
      </div>

      {/* WORKFLOW VIEW CONTROLLER */}
      <div className="tool-workspace">
        {/* STEP 1: Idle / Upload State */}
        {(status === 'idle' || status === 'error') && (
          <UploadBox
            onFileSelect={selectFile}
            isDragging={isDragging}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            error={error}
            title="Convert PDF to JPG Images"
            subtitle="Drag & drop your PDF file here or click to select"
          />
        )}

        {/* STEP 2: Selected File State + Quality Options */}
        {status === 'selected' && (
          <div className="selected-workspace">
            <FileUploader
              file={file}
              onRemove={reset}
              onProcess={processPdfToJpg}
              isProcessing={false}
            />

            {/* Conversion Quality Options */}
            <div className="options-panel">
              <div className="options-header">
                <FontAwesomeIcon icon={faGear} className="options-icon" />
                <h3 className="options-title">Image Quality Options</h3>
              </div>

              <div className="options-grid">
                <div 
                  className={`quality-card ${qualityDpi === 150 ? 'active' : ''}`}
                  onClick={() => setQualityDpi(150)}
                >
                  <div className="quality-radio">
                    {qualityDpi === 150 && <FontAwesomeIcon icon={faCheck} />}
                  </div>
                  <div className="quality-text">
                    <span className="quality-name">Standard Quality (150 DPI)</span>
                    <span className="quality-desc">Best balance of crisp text and fast download size.</span>
                  </div>
                </div>

                <div 
                  className={`quality-card ${qualityDpi === 300 ? 'active' : ''}`}
                  onClick={() => setQualityDpi(300)}
                >
                  <div className="quality-radio">
                    {qualityDpi === 300 && <FontAwesomeIcon icon={faCheck} />}
                  </div>
                  <div className="quality-text">
                    <span className="quality-name">High Quality (300 DPI) <span className="pill-badge">PRO</span></span>
                    <span className="quality-desc">Maximum resolution for printing or fine detail graphics.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Processing State */}
        {status === 'processing' && (
          <ProgressBar
            progress={progress}
            statusText="Rendering PDF pages into JPG images..."
            fileName={file ? file.name : ''}
            currentPage={currentPage}
            totalPages={totalPages}
          />
        )}

        {/* STEP 4: Success State with Download Action */}
        {status === 'success' && (
          <DownloadButton
            convertedImages={convertedImages}
            originalFileName={file ? file.name : 'document.pdf'}
            onConvertAnother={() => {
              setBackendZipUrl(null);
              setConvertedImages([]);
              reset();
            }}
            onDownloadZip={handleDownloadZip}
            isZipping={isZipping}
          />
        )}

        {/* STEP 5: Error State with In-Place Actionable Retry */}
        {status === 'error' && (
          <div className="tool-error-card" style={{ maxWidth: '640px', margin: '2rem auto', textAlign: 'center', padding: '2.5rem 2rem', background: 'var(--color-bg-surface)', borderRadius: '1rem', border: '1px solid var(--color-border-subtle)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <div style={{ color: 'var(--color-danger, #ef4444)', marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
              <FontAwesomeIcon icon={faCircleQuestion} size="3x" />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>
              Conversion Error
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.75rem', lineHeight: 1.6 }}>
              {error || 'An unexpected error occurred while converting your PDF. Please ensure the document is not password-protected and try again.'}
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              {file && (
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={processPdfToJpg}
                >
                  <FontAwesomeIcon icon={faRotateRight} /> Retry Conversion
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary btn-lg"
                onClick={() => reset()}
              >
                Choose Another PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// React Error Boundary to prevent any unhandled child exceptions from causing a blank white page
class PDFToJPGErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('[PDFToJPGErrorBoundary caught error]:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="tool-page-wrapper container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
          <div style={{ maxWidth: '580px', margin: '0 auto', padding: '2.5rem', background: 'var(--color-bg-surface)', borderRadius: '1rem', border: '1px solid var(--color-border-subtle)', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 600, color: 'var(--color-danger, #ef4444)', marginBottom: '0.75rem' }}>
              Something went wrong
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.75rem', lineHeight: 1.5 }}>
              The PDF to JPG converter encountered an unexpected view error. You can reset and try again.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            >
              Reload Converter
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function PDFToJPG(props) {
  return (
    <PDFToJPGErrorBoundary>
      <PDFToJPGInner {...props} />
    </PDFToJPGErrorBoundary>
  );
}
