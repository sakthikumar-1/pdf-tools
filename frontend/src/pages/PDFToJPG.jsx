import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileImage, 
  Settings, 
  Sparkles, 
  ArrowLeft, 
  ShieldCheck, 
  Check, 
  HelpCircle,
  FileCheck
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import UploadBox from '../components/UploadBox';
import FileUploader from '../components/FileUploader';
import ProgressBar from '../components/ProgressBar';
import DownloadButton from '../components/DownloadButton';
import { useFileUpload } from '../hooks/useFileUpload';
import { uploadAndConvertPdf } from '../services/api';
import { downloadFile } from '../utils/fileUtils';
import './PDFToJPG.css';

// Set up PDF.js worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function PDFToJPG() {
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
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isZipping, setIsZipping] = useState(false);

  // Convert PDF to JPG using PDF.js canvas rendering
  const processPdfToJpg = async () => {
    if (!file) return;

    setStatus('processing');
    setProgress(5);
    setConvertedImages([]);
    setError(null);

    try {
      // First attempt PHP backend upload if accessible
      let useClientRendering = true;
      try {
        const result = await uploadAndConvertPdf(file, '/pdf/pdf-to-jpg.php', (percent) => {
          setProgress(Math.min(90, Math.round(percent * 0.5)));
        });
        if (result && result.success && result.images) {
          setConvertedImages(result.images);
          setStatus('success');
          setProgress(100);
          useClientRendering = false;
        }
      } catch (backendErr) {
        console.log('[PDFToJPG] Backend server not reachable or fallback enabled. Using fast local rendering engine.');
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
      const zip = new JSZip();
      const folderName = file ? file.name.replace(/\.[^/.]+$/, "") : "pdf_images";
      const folder = zip.folder(folderName);

      convertedImages.forEach((img, idx) => {
        // Remove base64 prefix
        const base64Data = img.dataUrl.replace(/^data:image\/jpeg;base64,/, "");
        folder.file(`page_${idx + 1}.jpg`, base64Data, { base64: true });
      });

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
      {/* Top Breadcrumb / Back Link */}
      <div className="tool-breadcrumb">
        <Link to="/#tools-catalog" className="breadcrumb-link">
          <ArrowLeft size={16} /> Back to All PDF Tools
        </Link>
      </div>

      {/* Tool Title Header */}
      <div className="tool-header">
        <div className="tool-header-icon-badge">
          <FileImage size={32} />
        </div>
        <h1 className="tool-header-title">PDF to JPG Converter</h1>
        <p className="tool-header-subtitle">
          Convert each PDF page into high-resolution JPG images in seconds.
        </p>
      </div>

      {/* WORKFLOW VIEW CONTROLLER */}
      <div className="tool-workspace">
        {/* STEP 1: Idle / Upload State */}
        {status === 'idle' && (
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
                <Settings size={18} className="options-icon" />
                <h3 className="options-title">Image Quality Options</h3>
              </div>

              <div className="options-grid">
                <div 
                  className={`quality-card ${qualityDpi === 150 ? 'active' : ''}`}
                  onClick={() => setQualityDpi(150)}
                >
                  <div className="quality-radio">
                    {qualityDpi === 150 && <Check size={14} />}
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
                    {qualityDpi === 300 && <Check size={14} />}
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
            onConvertAnother={reset}
            onDownloadZip={handleDownloadZip}
            isZipping={isZipping}
          />
        )}

        {/* STEP 5: Error State */}
        {status === 'error' && (
          <div className="tool-error-card">
            <UploadBox
              onFileSelect={selectFile}
              isDragging={isDragging}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              error={error}
            />
          </div>
        )}
      </div>

      {/* SEO & INFORMATION SECTION */}
      <section className="tool-seo-section">
        <h2 className="seo-section-title">How to Convert PDF to JPG Online</h2>

        <div className="seo-steps-list">
          <div className="seo-step-item">
            <span className="seo-step-num">1</span>
            <div>
              <h3 className="seo-step-title">Select your PDF document</h3>
              <p>Drag and drop your PDF into the box above or click to select a file from your device.</p>
            </div>
          </div>

          <div className="seo-step-item">
            <span className="seo-step-num">2</span>
            <div>
              <h3 className="seo-step-title">Choose image resolution</h3>
              <p>Select between Standard (150 DPI) for web viewing or High Quality (300 DPI) for printing.</p>
            </div>
          </div>

          <div className="seo-step-item">
            <span className="seo-step-num">3</span>
            <div>
              <h3 className="seo-step-title">Download your JPG images</h3>
              <p>Download individual converted page images or grab all pages in a single ZIP file with one click.</p>
            </div>
          </div>
        </div>

        <div className="seo-faq-grid">
          <div className="faq-card">
            <h4 className="faq-question"><ShieldCheck size={18} /> Is my PDF file secure?</h4>
            <p className="faq-answer">
              Yes, absolutely. Your document privacy is completely protected. Conversion occurs securely without saving permanent copies.
            </p>
          </div>

          <div className="faq-card">
            <h4 className="faq-question"><Sparkles size={18} /> Will my image quality degrade?</h4>
            <p className="faq-answer">
              No. Our rendering engine preserves text sharpness, vector shapes, fonts, and original image colors accurately.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
