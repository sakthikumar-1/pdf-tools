import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Settings, 
  ShieldCheck, 
  Check, 
  Download,
  RotateCcw,
  Sparkles,
  FileCheck,
  AlertCircle,
  Scissors,
  Minimize2,
  RotateCw,
  Layers,
  FileText
} from 'lucide-react';
import UploadBox from '../components/UploadBox';
import FileUploader from '../components/FileUploader';
import ProgressBar from '../components/ProgressBar';
import ProtectPasswordPanel from '../components/ProtectPasswordPanel';
import { useFileUpload } from '../hooks/useFileUpload';
import { downloadFile } from '../utils/fileUtils';
import { formatFileSize } from '../utils/formatFileSize';
import { 
  extractTextFromPdf, 
  createDocxFile, 
  createTxtFile, 
  createPptxFile, 
  createExcelCsv,
  createExcelFile, 
  renderPdfToPngs,
  createZipFromImages,
  createPdfBlob,
  mergePdfs,
  splitPdf,
  rotatePdf,
  imagesToPdf,
  protectPdf
} from '../utils/pdfProcessor';
import { fetchServerCapabilities, getToolCapability } from '../utils/capabilityChecker';
import './GenericTool.css';

export default function GenericTool({
  title = 'PDF Tool',
  description = 'Process and manage your PDF files quickly.',
  icon: ToolIcon,
  actionLabel = 'Process File Now',
  accept = '.pdf'
}) {
  const [capabilitiesMap, setCapabilitiesMap] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchServerCapabilities().then((data) => setCapabilitiesMap(data));
  }, []);

  const capability = getToolCapability(title, capabilitiesMap);
  const isMultipleTool = title.toLowerCase().includes('merge') || title.toLowerCase().includes('images');

  const {
    file,
    files,
    isDragging,
    error,
    status,
    progress,
    setStatus,
    setProgress,
    setError,
    selectFile,
    selectMultipleFiles,
    removeFileAtIndex,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    reset,
  } = useFileUpload();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPassValid, setIsPassValid] = useState(false);
  const [splitRange, setSplitRange] = useState('1');
  const [compressLevel, setCompressLevel] = useState('recommended');
  const [rotateAngle, setRotateAngle] = useState(90);
  const [optionValue, setOptionValue] = useState('standard');
  const [processedResult, setProcessedResult] = useState(null);
  const [compressMeta, setCompressMeta] = useState(null);

  const handleProcess = async () => {
    const targetFile = file || (files && files[0]);
    if (!targetFile && (!files || files.length === 0)) return;

    setStatus('processing');
    setProgress(15);
    setError(null);
    setCompressMeta(null);

    try {
      const titleLower = title.toLowerCase();
      const primaryFile = targetFile || files[0];
      const baseName = primaryFile ? primaryFile.name.replace(/\.[^/.]+$/, '') : 'document';
      let blob;
      let filename;

      if (titleLower.includes('compress')) {
        const res = await compressPdf(primaryFile, compressLevel, (p) => setProgress(p));
        blob = res.blob;
        filename = `${baseName}_compressed.pdf`;
        setCompressMeta(res);
      } else if (titleLower.includes('merge')) {
        blob = await mergePdfs(files && files.length > 0 ? files : [primaryFile], (p) => setProgress(p));
        filename = `Merged_Document.pdf`;
      } else if (titleLower.includes('split')) {
        blob = await splitPdf(primaryFile, splitRange, (p) => setProgress(p));
        filename = `${baseName}_split.pdf`;
      } else if (titleLower.includes('rotate')) {
        blob = await rotatePdf(primaryFile, rotateAngle, (p) => setProgress(p));
        filename = `${baseName}_rotated.pdf`;
      } else if (titleLower.includes('protect')) {
        if (!password || !password.trim()) {
          throw new Error('Please enter a password to protect your PDF document.');
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match. Please verify your confirm password.');
        }
        blob = await protectPdf(primaryFile, password, (p) => setProgress(p));
        filename = `${baseName}_protected.pdf`;
        setPassword('');
        setConfirmPassword('');
      } else if (titleLower.includes('images')) {
        blob = await imagesToPdf(files && files.length > 0 ? files : [primaryFile], (p) => setProgress(p));
        filename = `Images_Converted.pdf`;
      } else if (titleLower.includes('png')) {
        const pngImages = await renderPdfToPngs(primaryFile, (p) => setProgress(p));
        if (pngImages.length === 1) {
          const res = await fetch(pngImages[0].dataUrl);
          blob = await res.blob();
          filename = `${baseName}_page1.png`;
        } else {
          blob = await createZipFromImages(pngImages, `${baseName}_png_images`);
          filename = `${baseName}_png_images.zip`;
        }
      } else if (titleLower.includes('powerpoint') || titleLower.includes('ppt')) {
        const { pageTexts } = await extractTextFromPdf(primaryFile, (p) => setProgress(Math.round(p * 0.4)));
        const pageImages = await renderPdfToPngs(primaryFile, (p) => setProgress(40 + Math.round(p * 0.5)));
        blob = await createPptxFile(pageTexts, pageImages, baseName);
        filename = `${baseName}_presentation.pptx`;
      } else if (titleLower.includes('excel')) {
        const { fullText } = await extractTextFromPdf(primaryFile, (p) => setProgress(p));
        blob = createExcelFile(fullText, baseName);
        filename = `${baseName}_converted.xlsx`;
      } else if (titleLower.includes('text')) {
        const { fullText } = await extractTextFromPdf(primaryFile, (p) => setProgress(p));
        blob = createTxtFile(fullText);
        filename = `${baseName}_converted.txt`;
      } else if (titleLower.includes('word')) {
        const { fullText } = await extractTextFromPdf(primaryFile, (p) => setProgress(p));
        blob = await createDocxFile(fullText, baseName);
        filename = `${baseName}_converted.docx`;
      } else {
        blob = await createPdfBlob(primaryFile, 'processed');
        filename = `${baseName}_processed.pdf`;
      }

      setProcessedResult({ blob, filename });
      setProgress(100);
      setStatus('success');
    } catch (err) {
      console.error('[Conversion Error]:', err);
      setError(err.message || 'Failed to process document. Please verify the file is valid.');
      setStatus('error');
    }
  };

  const handleDownload = () => {
    if (processedResult) {
      downloadFile(processedResult.blob, processedResult.filename);
    }
  };

  const handleReset = () => {
    setProcessedResult(null);
    setCompressMeta(null);
    setPassword('');
    setConfirmPassword('');
    reset();
  };

  const titleLower = title.toLowerCase();

  return (
    <div className="generic-tool-container container">
      {/* Top Breadcrumb */}
      <div className="tool-breadcrumb">
        <Link to="/#tools-catalog" className="breadcrumb-link">
          <ArrowLeft size={16} /> Back to All PDF Tools
        </Link>
      </div>

      {/* Tool Header */}
      <div className="generic-tool-hero">
        {ToolIcon && (
          <div className="generic-tool-icon">
            <ToolIcon size={32} />
          </div>
        )}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.2rem 0.65rem', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem', background: capability.status === 'AVAILABLE' ? 'rgba(16, 185, 129, 0.12)' : (capability.status === 'LIMITED' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)'), color: capability.status === 'AVAILABLE' ? '#10B981' : (capability.status === 'LIMITED' ? '#F59E0B' : '#EF4444'), border: `1px solid ${capability.status === 'AVAILABLE' ? 'rgba(16, 185, 129, 0.3)' : (capability.status === 'LIMITED' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)')}` }}>
          <Sparkles size={12} /> {capability.status}: {capability.engine}
        </div>
        <h1 className="generic-tool-title">{title}</h1>
        <p className="generic-tool-desc">{description}</p>
      </div>

      {/* Main Workspace Area */}
      <div className="tool-workspace">
        {!capability.available ? (
          <div className="unavailable-warning-card" style={{ padding: '2.5rem 1.5rem', background: 'var(--color-surface)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '16px', textAlign: 'center', margin: '1rem 0' }}>
            <AlertCircle size={48} style={{ color: '#EF4444', marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text)' }}>{title} is Temporarily Unavailable</h3>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.6rem', fontSize: '0.92rem', maxWidth: '540px', margin: '0.6rem auto 0' }}>{capability.reason}</p>
            <div style={{ marginTop: '1.75rem' }}>
              <Link to="/" className="btn btn-secondary btn-lg"><ArrowLeft size={16} /> Explore Available PDF Tools</Link>
            </div>
          </div>
        ) : (
          <>
            {/* Step 1: Idle Upload Box */}
            {status === 'idle' && (
              <UploadBox
                onFileSelect={(sel) => isMultipleTool ? selectMultipleFiles(Array.isArray(sel) ? sel : [sel], accept) : selectFile(sel, accept)}
                isDragging={isDragging}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                error={error}
                acceptedTypes={accept}
                multiple={isMultipleTool}
                title={isMultipleTool ? `Select 2 or more files for ${title}` : `Select file for ${title}`}
                subtitle={isMultipleTool ? "or drag and drop multiple files here" : "or drag and drop file here"}
              />
            )}

        {/* Step 2: Selected File State + Custom Options */}
        {status === 'selected' && (
          <div className="selected-workspace">
            <FileUploader
              file={file}
              files={files}
              onRemove={handleReset}
              onRemoveIndex={removeFileAtIndex}
              onAddMore={isMultipleTool ? (newFiles) => selectMultipleFiles(newFiles, accept) : null}
              onProcess={handleProcess}
              isProcessing={false}
              actionText={actionLabel}
              acceptedTypes={accept}
            />

            {/* Custom Tool Processing Options */}
            <div className="options-panel">
              <div className="options-header">
                <Settings size={18} className="options-icon" />
                <h3 className="options-title">Processing Options</h3>
              </div>

              {/* SPLIT PDF OPTIONS */}
              {titleLower.includes('split') ? (
                <div className="split-options-box" style={{ padding: '0.5rem 0' }}>
                  <label className="option-label" style={{ fontWeight: 700, display: 'block', marginBottom: '0.5rem' }}>
                    Pages to Extract:
                  </label>
                  <input 
                    type="text"
                    value={splitRange}
                    onChange={(e) => setSplitRange(e.target.value)}
                    placeholder="e.g. 1-3, 5 (or enter 1 for page 1)"
                    className="password-input"
                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '0.95rem' }}
                  />
                  <div style={{ marginTop: '0.6rem', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                    Enter individual page numbers or page ranges separated by commas (e.g., <code>1-3, 5</code>).
                  </div>
                </div>
              ) : titleLower.includes('compress') ? (
                /* COMPRESS PDF OPTIONS */
                <div className="options-grid">
                  <div 
                    className={`quality-card ${compressLevel === 'recommended' ? 'active' : ''}`}
                    onClick={() => setCompressLevel('recommended')}
                  >
                    <div className="quality-radio">
                      {compressLevel === 'recommended' && <Check size={14} />}
                    </div>
                    <div className="quality-text">
                      <span className="quality-name">Recommended Compression</span>
                      <span className="quality-desc">Good quality, balanced file size reduction (~40-60%).</span>
                    </div>
                  </div>

                  <div 
                    className={`quality-card ${compressLevel === 'extreme' ? 'active' : ''}`}
                    onClick={() => setCompressLevel('extreme')}
                  >
                    <div className="quality-radio">
                      {compressLevel === 'extreme' && <Check size={14} />}
                    </div>
                    <div className="quality-text">
                      <span className="quality-name">Extreme Compression</span>
                      <span className="quality-desc">Maximum size reduction (~60-80% smaller).</span>
                    </div>
                  </div>

                  <div 
                    className={`quality-card ${compressLevel === 'low' ? 'active' : ''}`}
                    onClick={() => setCompressLevel('low')}
                  >
                    <div className="quality-radio">
                      {compressLevel === 'low' && <Check size={14} />}
                    </div>
                    <div className="quality-text">
                      <span className="quality-name">Low Compression</span>
                      <span className="quality-desc">High image quality, subtle size reduction.</span>
                    </div>
                  </div>
                </div>
              ) : titleLower.includes('rotate') ? (
                /* ROTATE PDF OPTIONS */
                <div className="options-grid">
                  <div 
                    className={`quality-card ${rotateAngle === 90 ? 'active' : ''}`}
                    onClick={() => setRotateAngle(90)}
                  >
                    <div className="quality-radio">
                      {rotateAngle === 90 && <Check size={14} />}
                    </div>
                    <div className="quality-text">
                      <span className="quality-name">Rotate 90° Clockwise</span>
                      <span className="quality-desc">Turn pages 90 degrees to the right.</span>
                    </div>
                  </div>

                  <div 
                    className={`quality-card ${rotateAngle === 180 ? 'active' : ''}`}
                    onClick={() => setRotateAngle(180)}
                  >
                    <div className="quality-radio">
                      {rotateAngle === 180 && <Check size={14} />}
                    </div>
                    <div className="quality-text">
                      <span className="quality-name">Rotate 180°</span>
                      <span className="quality-desc">Flip pages upside down completely.</span>
                    </div>
                  </div>

                  <div 
                    className={`quality-card ${rotateAngle === 270 ? 'active' : ''}`}
                    onClick={() => setRotateAngle(270)}
                  >
                    <div className="quality-radio">
                      {rotateAngle === 270 && <Check size={14} />}
                    </div>
                    <div className="quality-text">
                      <span className="quality-name">Rotate 270° Counter-Clockwise</span>
                      <span className="quality-desc">Turn pages 90 degrees to the left.</span>
                    </div>
                  </div>
                </div>
              ) : titleLower.includes('protect') ? (
                /* PROTECT PDF OPTIONS (MATCHES SCREENSHOT 1) */
                <ProtectPasswordPanel
                  password={password}
                  setPassword={setPassword}
                  confirmPassword={confirmPassword}
                  setConfirmPassword={setConfirmPassword}
                  onValidationChange={setIsPassValid}
                />
              ) : (
                /* DEFAULT STANDARD/HIGH PRECISION OPTIONS */
                <div className="options-grid">
                  <div 
                    className={`quality-card ${optionValue === 'standard' ? 'active' : ''}`}
                    onClick={() => setOptionValue('standard')}
                  >
                    <div className="quality-radio">
                      {optionValue === 'standard' && <Check size={14} />}
                    </div>
                    <div className="quality-text">
                      <span className="quality-name">Standard Mode</span>
                      <span className="quality-desc">Recommended settings for optimal speed.</span>
                    </div>
                  </div>

                  <div 
                    className={`quality-card ${optionValue === 'pro' ? 'active' : ''}`}
                    onClick={() => setOptionValue('pro')}
                  >
                    <div className="quality-radio">
                      {optionValue === 'pro' && <Check size={14} />}
                    </div>
                    <div className="quality-text">
                      <span className="quality-name">High Precision Mode</span>
                      <span className="quality-desc">Maximum quality and vector layout retention.</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Processing State */}
        {status === 'processing' && (
          <ProgressBar
            progress={progress}
            statusText={`Processing document for ${title}...`}
            fileName={file ? file.name : ''}
          />
        )}

        {/* Step 4: Success State with Download Button */}
        {status === 'success' && (
          <div className="generic-success-card">
            <div className="success-badge">
              <FileCheck size={48} className="success-icon" />
            </div>
            <h2 className="success-title">Your file is ready!</h2>
            <p className="success-desc">
              Successfully processed <strong>{file ? file.name : (files && files[0] ? files[0].name : 'document')}</strong> into <strong>{processedResult ? processedResult.filename : 'file'}</strong>.
            </p>

            {/* Compress Statistics Showcase */}
            {compressMeta && (
              compressMeta.alreadyOptimized ? (
                <div style={{ padding: '0.85rem 1rem', margin: '1.25rem 0', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '10px', color: 'var(--color-text)', fontSize: '0.9rem', textAlign: 'center' }}>
                  <strong>Document is already highly optimized.</strong> Original file size ({formatFileSize(compressMeta.originalSize)}) could not be reduced further without visual quality loss.
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', margin: '1.25rem 0', padding: '1rem', background: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Original Size</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-text)' }}>{formatFileSize(compressMeta.originalSize)}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Compressed Size</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-primary)' }}>{formatFileSize(compressMeta.compressedSize)}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Size Reduction</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10B981' }}>-{compressMeta.reductionPercent}%</div>
                  </div>
                </div>
              )
            )}

            <div className="success-actions">
              <button className="btn btn-primary btn-lg" onClick={handleDownload}>
                <Download size={20} /> Download {processedResult ? processedResult.filename : 'File'}
              </button>
              <button className="btn btn-secondary btn-lg" onClick={handleReset}>
                <RotateCcw size={18} /> Convert Another File
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Error State */}
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
          </>
        )}
      </div>

      {/* SEO & Security Guarantee */}
      <section className="tool-seo-section">
        <h2 className="seo-section-title">Why Use Simatrix Academy {title}?</h2>
        <div className="seo-faq-grid">
          <div className="faq-card">
            <h4 className="faq-question"><ShieldCheck size={18} /> 100% Private & Secure</h4>
            <p className="faq-answer">
              Your document files are processed securely in your browser and deleted automatically from memory right after processing.
            </p>
          </div>
          <div className="faq-card">
            <h4 className="faq-question"><Sparkles size={18} /> High Performance Engine</h4>
            <p className="faq-answer">
              Our high-speed conversion pipeline ensures maximum document formatting retention and high resolution.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
