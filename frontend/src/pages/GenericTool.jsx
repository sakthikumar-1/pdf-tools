import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowLeft, 
  faGear, 
  faShieldHalved, 
  faCheck, 
  faDownload,
  faArrowRotateLeft,
  faWandMagicSparkles,
  faCircleCheck,
  faCircleExclamation,
  faTriangleExclamation
} from '@fortawesome/free-solid-svg-icons';
import UploadBox from '../components/UploadBox';
import FileUploader from '../components/FileUploader';
import DemoPaperPreview from '../components/DemoPaperPreview';
import ProgressBar from '../components/ProgressBar';
import ProtectPasswordPanel from '../components/ProtectPasswordPanel';
import { useFileUpload } from '../hooks/useFileUpload';
import { downloadFile } from '../utils/fileUtils';
import { formatFileSize } from '../utils/formatFileSize';
import { 
  convertPdfToWordPython, 
  convertPdfToPowerpointPython, 
  protectPdfPython,
  addPageNumbersPython,
  watermarkPdfPython,
  cropPdfPython,
  editPdfMetadataPython
} from '../services/api';
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
  protectPdf,
  getPdfPageCount,
  pdfToExcel,
  pdfToDocx,
  pdfToPptx,
  addPageNumbersToPdf,
  watermarkPdf,
  cropPdf,
  readPdfMetadata,
  editPdfMetadata,
  compressPdf
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
    setFiles,
    reorderFiles,
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
  const [docPageCount, setDocPageCount] = useState(null);
  const [scannedWarning, setScannedWarning] = useState(false);
  const [pptMode, setPptMode] = useState('editable');
  const [pptMeta, setPptMeta] = useState(null);

  // Phase 2A: Add Page Numbers States
  const [startNumber, setStartNumber] = useState(1);
  const [numFormat, setNumFormat] = useState('Page {n}');
  const [numPosition, setNumPosition] = useState('bottom-right');
  const [numFontSize, setNumFontSize] = useState(11);
  const [numFontColor, setNumFontColor] = useState('#334155');
  const [numMarginPt, setNumMarginPt] = useState(36);
  const [numPageRange, setNumPageRange] = useState('all');

  // Phase 2A: Watermark PDF States
  const [wmText, setWmText] = useState('CONFIDENTIAL');
  const [wmOpacity, setWmOpacity] = useState(0.35);
  const [wmRotation, setWmRotation] = useState(45);
  const [wmFontSize, setWmFontSize] = useState(48);
  const [wmColor, setWmColor] = useState('#EF4444');
  const [wmPosition, setWmPosition] = useState('center');
  const [wmPageRange, setWmPageRange] = useState('all');

  // Phase 2A: Crop PDF States
  const [cropTop, setCropTop] = useState(36);
  const [cropBottom, setCropBottom] = useState(36);
  const [cropLeft, setCropLeft] = useState(36);
  const [cropRight, setCropRight] = useState(36);
  const [cropPageRange, setCropPageRange] = useState('all');

  // Phase 2A: Edit Metadata States
  const [metaTitle, setMetaTitle] = useState('');
  const [metaAuthor, setMetaAuthor] = useState('');
  const [metaSubject, setMetaSubject] = useState('');
  const [metaKeywords, setMetaKeywords] = useState('');
  const [isReadingMeta, setIsReadingMeta] = useState(false);

  useEffect(() => {
    const targetFile = file || (files && files[0]);
    if (targetFile && (targetFile.type === 'application/pdf' || targetFile.name?.toLowerCase().endsWith('.pdf'))) {
      getPdfPageCount(targetFile).then((count) => setDocPageCount(count));

      // Auto-read metadata if tool is Edit Metadata
      if (title.toLowerCase().includes('metadata')) {
        setIsReadingMeta(true);
        readPdfMetadata(targetFile)
          .then((data) => {
            if (data) {
              setMetaTitle(data.title || '');
              setMetaAuthor(data.author || '');
              setMetaSubject(data.subject || '');
              setMetaKeywords(data.keywords || '');
            }
          })
          .catch((err) => console.warn('[Metadata Read Error]:', err))
          .finally(() => setIsReadingMeta(false));
      }
    } else {
      setDocPageCount(null);
    }
  }, [file, files, title]);

  const handleProcess = async () => {
    const targetFile = file || (files && files[0]);
    if (!targetFile && (!files || files.length === 0)) return;

    setStatus('processing');
    setProgress(15);
    setError(null);
    setCompressMeta(null);
    setPptMeta(null);

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
        const mergeFileList = (files && files.length > 0) ? files : (primaryFile ? [primaryFile] : []);
        if (mergeFileList.length < 2) {
          setError('Please select at least 2 PDF files to merge together.');
          setStatus('selected');
          return;
        }
        blob = await mergePdfs(mergeFileList, (p) => setProgress(p));
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
        let res;
        try {
          res = await protectPdfPython(primaryFile, password, (p) => setProgress(p));
          blob = res.blob;
          filename = res.filename;
        } catch (backendErr) {
          console.warn('[ProtectPDF] Python backend error or offline, running client fallback:', backendErr);
          blob = await protectPdf(primaryFile, password, (p) => setProgress(p));
          filename = `${baseName}_protected.pdf`;
        }
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
        let res;
        try {
          res = await convertPdfToPowerpointPython(primaryFile, pptMode, (p) => setProgress(p));
        } catch (backendErr) {
          console.warn('[PDFToPPTX] Python backend error or offline, running client fallback:', backendErr);
          res = await pdfToPptx(primaryFile, pptMode, (p) => setProgress(p));
        }
        blob = res.blob;
        filename = res.filename || `${baseName}_presentation.pptx`;
        setPptMeta(res);
        if (res.isScannedOnly || res.isScanned) {
          setScannedWarning(true);
        }
      } else if (titleLower.includes('excel')) {
        const res = await pdfToExcel(primaryFile, (p) => setProgress(p));
        blob = res.blob;
        filename = `${baseName}_converted.xlsx`;
        if (res.isScannedOnly) {
          setScannedWarning(true);
        }
      } else if (titleLower.includes('text')) {
        const { fullText } = await extractTextFromPdf(primaryFile, (p) => setProgress(p));
        blob = createTxtFile(fullText);
        filename = `${baseName}_converted.txt`;
      } else if (titleLower.includes('word')) {
        let res;
        try {
          res = await convertPdfToWordPython(primaryFile, (p) => setProgress(p));
        } catch (backendErr) {
          console.warn('[PDFToWord] Python backend error or offline, running client fallback:', backendErr);
          res = await pdfToDocx(primaryFile, (p) => setProgress(p));
        }
        blob = res.blob;
        filename = res.filename || `${baseName}_converted.docx`;
        if (res.isScanned || res.isScannedOnly) {
          setScannedWarning(true);
        }
      } else if (titleLower.includes('number') || titleLower.includes('page-number')) {
        const numOptions = {
          startNumber: Number(startNumber) || 1,
          format: numFormat,
          position: numPosition,
          fontSize: Number(numFontSize) || 11,
          fontColor: numFontColor,
          marginPt: Number(numMarginPt) || 36,
          pageRange: numPageRange
        };
        try {
          const res = await addPageNumbersPython(primaryFile, numOptions, (p) => setProgress(p));
          blob = res.blob;
          filename = res.filename || `${baseName}_numbered.pdf`;
        } catch (backendErr) {
          console.warn('[AddPageNumbers] Backend API error or offline, running client fallback:', backendErr);
          blob = await addPageNumbersToPdf(primaryFile, numOptions, (p) => setProgress(p));
          filename = `${baseName}_numbered.pdf`;
        }
      } else if (titleLower.includes('watermark')) {
        if (!wmText || !wmText.trim()) {
          throw new Error('Please enter watermark text.');
        }
        const wmOptions = {
          text: wmText,
          opacity: Number(wmOpacity),
          rotation: Number(wmRotation),
          fontSize: Number(wmFontSize) || 48,
          color: wmColor,
          position: wmPosition,
          pageRange: wmPageRange
        };
        try {
          const res = await watermarkPdfPython(primaryFile, wmOptions, (p) => setProgress(p));
          blob = res.blob;
          filename = res.filename || `${baseName}_watermarked.pdf`;
        } catch (backendErr) {
          console.warn('[WatermarkPDF] Backend API error or offline, running client fallback:', backendErr);
          blob = await watermarkPdf(primaryFile, wmOptions, (p) => setProgress(p));
          filename = `${baseName}_watermarked.pdf`;
        }
      } else if (titleLower.includes('crop')) {
        const top = Number(cropTop) || 0;
        const bottom = Number(cropBottom) || 0;
        const left = Number(cropLeft) || 0;
        const right = Number(cropRight) || 0;
        if (top < 0 || bottom < 0 || left < 0 || right < 0) {
          throw new Error('Crop margins cannot be negative values.');
        }
        const cropOptions = {
          cropMargins: { top, bottom, left, right },
          pageRange: cropPageRange
        };
        try {
          const res = await cropPdfPython(primaryFile, cropOptions, (p) => setProgress(p));
          blob = res.blob;
          filename = res.filename || `${baseName}_cropped.pdf`;
        } catch (backendErr) {
          console.warn('[CropPDF] Backend API error or offline, running client fallback:', backendErr);
          blob = await cropPdf(primaryFile, cropOptions, (p) => setProgress(p));
          filename = `${baseName}_cropped.pdf`;
        }
      } else if (titleLower.includes('metadata')) {
        const metaOptions = {
          title: metaTitle,
          author: metaAuthor,
          subject: metaSubject,
          keywords: metaKeywords
        };
        try {
          const res = await editPdfMetadataPython(primaryFile, metaOptions, (p) => setProgress(p));
          blob = res.blob;
          filename = res.filename || `${baseName}_metadata.pdf`;
        } catch (backendErr) {
          console.warn('[EditMetadata] Backend API error or offline, running client fallback:', backendErr);
          blob = await editPdfMetadata(primaryFile, metaOptions, (p) => setProgress(p));
          filename = `${baseName}_metadata.pdf`;
        }
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
      setStatus('selected');
    }
  };

  const handleDownload = () => {
    if (processedResult) {
      downloadFile(processedResult.blob, processedResult.filename, title);
    }
  };

  const handleReset = () => {
    setProcessedResult(null);
    setCompressMeta(null);
    setPptMeta(null);
    setPassword('');
    setConfirmPassword('');
    setDocPageCount(null);
    setScannedWarning(false);
    reset();
  };

  const titleLower = title.toLowerCase();

  return (
    <div className="generic-tool-container container">
      {/* Top Navigation Row with Back Button */}
      <div className="tool-top-nav-row">
        <Link to="/" className="tool-back-link">
          <FontAwesomeIcon icon={faArrowLeft} /> Back to Tools
        </Link>
      </div>

      {/* Tool Header */}
      <div className="generic-tool-hero">
        {ToolIcon && (
          <div className="generic-tool-icon">
            {typeof ToolIcon === 'function' ? <ToolIcon size={32} /> : <FontAwesomeIcon icon={ToolIcon} />}
          </div>
        )}
        <div className="generic-tool-info">
          <h1 className="generic-tool-title">{title}</h1>
          <p className="generic-tool-desc">{description}</p>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="tool-workspace">
        {!capability.available ? (
          <div className="unavailable-warning-card" style={{ padding: '2.5rem 1.5rem', background: 'var(--color-surface)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '16px', textAlign: 'center', margin: '1rem 0' }}>
            <FontAwesomeIcon icon={faCircleExclamation} size="3x" style={{ color: "var(--color-error)", marginBottom: "1rem" }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text)' }}>{title} is Temporarily Unavailable</h3>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.6rem', fontSize: '0.92rem', maxWidth: '540px', margin: '0.6rem auto 0' }}>{capability.reason}</p>
            <div style={{ marginTop: '1.75rem' }}>
              <Link to="/" className="btn btn-secondary btn-lg"><FontAwesomeIcon icon={faArrowLeft} /> Explore Available PDF Tools</Link>
            </div>
          </div>
        ) : (
          <>
            {/* Step 1: Idle or Error Upload Box */}
            {(status === 'idle' || status === 'error') && (
              <UploadBox
                onFileSelect={(sel) => isMultipleTool ? selectMultipleFiles(Array.isArray(sel) ? sel : [sel], accept) : selectFile(sel, accept)}
                isDragging={isDragging}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e, mult) => handleDrop(e, mult, accept)}
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
            <div className="workspace-file-column">
              <FileUploader
                file={file}
                files={files}
                onRemove={handleReset}
                onRemoveIndex={removeFileAtIndex}
                onReorderFiles={setFiles}
                onMoveFile={reorderFiles}
                onAddMore={isMultipleTool ? (newFiles) => selectMultipleFiles(newFiles, accept) : null}
                onProcess={handleProcess}
                isProcessing={false}
                isProcessDisabled={
                  (titleLower.includes('protect') && (!isPassValid || password !== confirmPassword)) ||
                  (titleLower.includes('merge') && ((files ? files.length : (file ? 1 : 0)) < 2))
                }
                actionText={actionLabel}
                acceptedTypes={accept}
              />

              {/* Interactive Demo Paper Preview (occupies the whitespace) */}
              <DemoPaperPreview
                file={file || (files && files[0])}
                title={title}
                // Watermark Props
                wmText={wmText}
                wmOpacity={wmOpacity}
                wmRotation={wmRotation}
                wmFontSize={wmFontSize}
                wmColor={wmColor}
                wmPosition={wmPosition}
                onWmPositionChange={(newPos) => setWmPosition(newPos)}
                // Page Numbers Props
                startNumber={startNumber}
                numFormat={numFormat}
                numPosition={numPosition}
                numFontSize={numFontSize}
                numFontColor={numFontColor}
                numMarginPt={numMarginPt}
                onNumPositionChange={(newPos) => setNumPosition(newPos)}
                // Rotate Props
                rotateAngle={rotateAngle}
                onRotateChange={(newAngle) => setRotateAngle(newAngle)}
                // Split & Doc Stats
                splitRange={splitRange}
                docPageCount={docPageCount}
              />
            </div>

            {/* Custom Tool Processing Options */}
            <div className="options-panel">
              {error && (
                <div 
                  className="process-error-banner" 
                  style={{ 
                    padding: '0.85rem 1.15rem', 
                    background: 'rgba(239, 68, 68, 0.1)', 
                    border: '1px solid rgba(239, 68, 68, 0.35)', 
                    borderRadius: '10px', 
                    color: '#EF4444', 
                    marginBottom: '1.25rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.65rem', 
                    fontSize: '0.92rem', 
                    fontWeight: 600,
                    animation: 'fadeIn 0.2s ease-in-out'
                  }}
                >
                  <FontAwesomeIcon icon={faCircleExclamation} style={{ flexShrink: 0, color: "var(--color-error)" }} />
                  <span>{error}</span>
                </div>
              )}

              <div className="options-header">
                <FontAwesomeIcon icon={faGear} className="options-icon" />
                <h3 className="options-title">Processing Options</h3>
              </div>

              {/* SPLIT PDF OPTIONS */}
              {titleLower.includes('split') ? (
                <div className="split-options-box" style={{ padding: '0.5rem 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label className="option-label" style={{ fontWeight: 700, margin: 0 }}>
                      Pages to Extract:
                    </label>
                    {docPageCount !== null && (
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)', background: 'var(--color-primary-light)', padding: '0.15rem 0.55rem', borderRadius: '6px' }}>
                        Total Pages: {docPageCount}
                      </span>
                    )}
                  </div>
                  <input 
                    type="text"
                    value={splitRange}
                    onChange={(e) => {
                      setSplitRange(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder={docPageCount ? `e.g. 1-${Math.min(docPageCount, 3)}, or 1` : "e.g. 1-3, 5 (or enter 1 for page 1)"}
                    className="password-input"
                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: error ? '1px solid #EF4444' : '1px solid var(--color-border)', fontSize: '0.95rem' }}
                  />
                  <div style={{ marginTop: '0.6rem', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                    {docPageCount 
                      ? `Enter individual page numbers or ranges between 1 and ${docPageCount} (e.g., 1-${docPageCount}, or 1, 2).`
                      : 'Enter individual page numbers or page ranges separated by commas (e.g., 1-3, 5).'}
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
                      {compressLevel === 'recommended' && <FontAwesomeIcon icon={faCheck} />}
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
                      {compressLevel === 'extreme' && <FontAwesomeIcon icon={faCheck} />}
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
                      {compressLevel === 'low' && <FontAwesomeIcon icon={faCheck} />}
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
                      {rotateAngle === 90 && <FontAwesomeIcon icon={faCheck} />}
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
                      {rotateAngle === 180 && <FontAwesomeIcon icon={faCheck} />}
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
                      {rotateAngle === 270 && <FontAwesomeIcon icon={faCheck} />}
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
              ) : (titleLower.includes('powerpoint') || titleLower.includes('ppt')) ? (
                /* POWERPOINT CONVERSION OPTIONS */
                <div>
                  <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                    Select how you want your slides to be generated. You can choose native editable shapes and tables, or pixel-perfect visual slides.
                  </div>
                  <div className="options-grid">
                    <div 
                      className={`quality-card ${pptMode === 'editable' ? 'active' : ''}`}
                      onClick={() => setPptMode('editable')}
                    >
                      <div className="quality-radio">
                        {pptMode === 'editable' && <FontAwesomeIcon icon={faCheck} />}
                      </div>
                      <div className="quality-text">
                        <span className="quality-name">Editable Text &amp; Layout (Recommended)</span>
                        <span className="quality-desc">Generates native PowerPoint text shapes and tables using 2D coordinates. Scanned or image-only pages automatically fallback to visual slides so no content is lost.</span>
                      </div>
                    </div>

                    <div 
                      className={`quality-card ${pptMode === 'visual' ? 'active' : ''}`}
                      onClick={() => setPptMode('visual')}
                    >
                      <div className="quality-radio">
                        {pptMode === 'visual' && <FontAwesomeIcon icon={faCheck} />}
                      </div>
                      <div className="quality-text">
                        <span className="quality-name">High-Fidelity Visual Slides</span>
                        <span className="quality-desc">Renders pages as crisp, full-bleed slide images. Preserves 100% of complex graphics, charts, and fonts (slides are image-based, not text-editable).</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'var(--color-primary-light)', border: '1px solid var(--color-primary-border)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                    <strong style={{ color: 'var(--color-primary)' }}>Layout Note:</strong> Standard PDF text, titles, and data tables are extracted into editable PowerPoint elements. For scanned PDFs or documents containing intricate vector artwork, visual slide rendering preserves the exact visual appearance.
                  </div>
                </div>
              ) : titleLower.includes('excel') ? (
                /* EXCEL CONVERSION INFO */
                <div className="tool-feature-box" style={{ padding: '0.75rem 0', color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', color: 'var(--color-text-main)', fontWeight: 600 }}>
                    <FontAwesomeIcon icon={faCheck} style={{ color: "var(--color-success)" }} />
                    <span>Intelligent Table & Coordinate Grid Extraction</span>
                  </div>
                  <div>
                    Extracts genuine multi-column spreadsheets by calculating 2D visual alignments, formatting table headers, setting dynamic column widths, and separating multi-page documents into clean Excel worksheets.
                  </div>
                </div>
              ) : titleLower.includes('word') ? (
                /* WORD CONVERSION INFO */
                <div className="tool-feature-box" style={{ padding: '0.75rem 0', color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', color: 'var(--color-text-main)', fontWeight: 600 }}>
                    <FontAwesomeIcon icon={faCheck} style={{ color: "var(--color-success)" }} />
                    <span>Structured Document & Table Conversion</span>
                  </div>
                  <div>
                    Converts PDF content into rich Microsoft Word (.docx) format preserving document hierarchy, bold headings, font sizing, page breaks, and genuine formatted Word tables with clean borders and cell padding.
                  </div>
                </div>
              ) : (titleLower.includes('number') || titleLower.includes('page-number')) ? (
                /* ADD PAGE NUMBERS OPTIONS */
                <div className="utility-options-form">
                  <div className="utility-form-row">
                    <div className="utility-form-group">
                      <label className="option-label">Numbering Format:</label>
                      <select 
                        className="utility-select-control"
                        value={numFormat}
                        onChange={(e) => setNumFormat(e.target.value)}
                      >
                        <option value="Page {n}">Page {`{n}`} (e.g. Page 1)</option>
                        <option value="{n}">{`{n}`} (e.g. 1)</option>
                        <option value="Page {n} of {total}">Page {`{n}`} of {`{total}`} (e.g. Page 1 of 5)</option>
                        <option value="{n} / {total}">{`{n}`} / {`{total}`} (e.g. 1 / 5)</option>
                        <option value="- {n} -">- {`{n}`} - (e.g. - 1 -)</option>
                      </select>
                    </div>

                    <div className="utility-form-group">
                      <label className="option-label">Starting Page Number:</label>
                      <input 
                        type="number" 
                        min="1" 
                        max="9999"
                        className="utility-input-control"
                        value={startNumber}
                        onChange={(e) => setStartNumber(Math.max(1, parseInt(e.target.value) || 1))}
                      />
                    </div>
                  </div>

                  <div className="utility-form-group">
                    <label className="option-label">Position on Page:</label>
                    <div className="utility-position-grid">
                      <button 
                        type="button" 
                        className={`position-grid-btn ${numPosition === 'top-left' ? 'active' : ''}`}
                        onClick={() => setNumPosition('top-left')}
                      >
                        Top Left
                      </button>
                      <button 
                        type="button" 
                        className={`position-grid-btn ${numPosition === 'top-center' ? 'active' : ''}`}
                        onClick={() => setNumPosition('top-center')}
                      >
                        Top Center
                      </button>
                      <button 
                        type="button" 
                        className={`position-grid-btn ${numPosition === 'top-right' ? 'active' : ''}`}
                        onClick={() => setNumPosition('top-right')}
                      >
                        Top Right
                      </button>
                      <button 
                        type="button" 
                        className={`position-grid-btn ${numPosition === 'bottom-left' ? 'active' : ''}`}
                        onClick={() => setNumPosition('bottom-left')}
                      >
                        Bottom Left
                      </button>
                      <button 
                        type="button" 
                        className={`position-grid-btn ${numPosition === 'bottom-center' ? 'active' : ''}`}
                        onClick={() => setNumPosition('bottom-center')}
                      >
                        Bottom Center
                      </button>
                      <button 
                        type="button" 
                        className={`position-grid-btn ${numPosition === 'bottom-right' ? 'active' : ''}`}
                        onClick={() => setNumPosition('bottom-right')}
                      >
                        Bottom Right
                      </button>
                    </div>
                  </div>

                  <div className="utility-form-row">
                    <div className="utility-form-group">
                      <label className="option-label">Font Size (pt):</label>
                      <select 
                        className="utility-select-control"
                        value={numFontSize}
                        onChange={(e) => setNumFontSize(parseInt(e.target.value) || 11)}
                      >
                        <option value="9">9 pt (Small)</option>
                        <option value="10">10 pt (Compact)</option>
                        <option value="11">11 pt (Standard)</option>
                        <option value="12">12 pt (Medium)</option>
                        <option value="14">14 pt (Large)</option>
                      </select>
                    </div>

                    <div className="utility-form-group">
                      <label className="option-label">Text Color:</label>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input 
                          type="color" 
                          value={numFontColor}
                          onChange={(e) => setNumFontColor(e.target.value)}
                          style={{ width: '42px', height: '38px', borderRadius: '6px', border: '1px solid var(--color-border)', cursor: 'pointer', padding: 0 }}
                        />
                        <input 
                          type="text" 
                          value={numFontColor}
                          onChange={(e) => setNumFontColor(e.target.value)}
                          className="utility-input-control"
                          style={{ fontFamily: 'monospace' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="utility-form-row">
                    <div className="utility-form-group">
                      <label className="option-label">Page Margins (pt):</label>
                      <select 
                        className="utility-select-control"
                        value={numMarginPt}
                        onChange={(e) => setNumMarginPt(parseInt(e.target.value) || 36)}
                      >
                        <option value="18">0.25 inch (18 pt) - Narrow</option>
                        <option value="36">0.50 inch (36 pt) - Standard</option>
                        <option value="54">0.75 inch (54 pt) - Wide</option>
                        <option value="72">1.00 inch (72 pt) - Extra Wide</option>
                      </select>
                    </div>

                    <div className="utility-form-group">
                      <label className="option-label">Page Range:</label>
                      <input 
                        type="text" 
                        value={numPageRange}
                        onChange={(e) => setNumPageRange(e.target.value)}
                        placeholder="all, or e.g. 1-5, 8"
                        className="utility-input-control"
                      />
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                        Enter "all" or specific pages (e.g. 1-10)
                      </span>
                    </div>
                  </div>

                  {/* Placement Preview */}
                  <div className="utility-preview-card">
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>SAMPLE PLACEMENT PREVIEW</span>
                    <span style={{ fontSize: `${numFontSize}px`, color: numFontColor, fontWeight: 600, fontFamily: 'Helvetica, Arial, sans-serif' }}>
                      {numFormat.replace(/\{n\}/g, String(startNumber)).replace(/\{total\}/g, String(docPageCount || 1))}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      Aligned at {numPosition.replace('-', ' ')} with rotation correction for portrait and landscape pages.
                    </span>
                  </div>
                </div>
              ) : titleLower.includes('watermark') ? (
                /* WATERMARK PDF OPTIONS */
                <div className="utility-options-form">
                  <div className="utility-form-group">
                    <label className="option-label">Watermark Text:</label>
                    <input 
                      type="text" 
                      value={wmText}
                      onChange={(e) => setWmText(e.target.value)}
                      placeholder="e.g. CONFIDENTIAL, DRAFT, COPY"
                      className="utility-input-control"
                    />
                    <div className="preset-pills-row">
                      {['CONFIDENTIAL', 'DRAFT', 'TOP SECRET', 'DO NOT COPY', 'SAMPLE'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          className={`preset-pill-btn ${wmText === preset ? 'active' : ''}`}
                          onClick={() => setWmText(preset)}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="utility-form-row">
                    <div className="utility-form-group">
                      <label className="option-label">Opacity: {Math.round(wmOpacity * 100)}%</label>
                      <input 
                        type="range" 
                        min="0.10" 
                        max="0.90" 
                        step="0.05"
                        value={wmOpacity}
                        onChange={(e) => setWmOpacity(parseFloat(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                      />
                    </div>

                    <div className="utility-form-group">
                      <label className="option-label">Rotation Angle:</label>
                      <select 
                        className="utility-select-control"
                        value={wmRotation}
                        onChange={(e) => setWmRotation(parseInt(e.target.value))}
                      >
                        <option value="45">45° Diagonal (Standard)</option>
                        <option value="0">0° Horizontal</option>
                        <option value="90">90° Vertical</option>
                        <option value="-45">-45° Reverse Diagonal</option>
                      </select>
                    </div>
                  </div>

                  <div className="utility-form-row">
                    <div className="utility-form-group">
                      <label className="option-label">Font Size:</label>
                      <select 
                        className="utility-select-control"
                        value={wmFontSize}
                        onChange={(e) => setWmFontSize(parseInt(e.target.value))}
                      >
                        <option value="32">32 pt (Small)</option>
                        <option value="48">48 pt (Medium)</option>
                        <option value="60">60 pt (Large)</option>
                        <option value="72">72 pt (Extra Large)</option>
                      </select>
                    </div>

                    <div className="utility-form-group">
                      <label className="option-label">Watermark Color:</label>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input 
                          type="color" 
                          value={wmColor}
                          onChange={(e) => setWmColor(e.target.value)}
                          style={{ width: '42px', height: '38px', borderRadius: '6px', border: '1px solid var(--color-border)', cursor: 'pointer', padding: 0 }}
                        />
                        <input 
                          type="text" 
                          value={wmColor}
                          onChange={(e) => setWmColor(e.target.value)}
                          className="utility-input-control"
                          style={{ fontFamily: 'monospace' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="utility-form-row">
                    <div className="utility-form-group">
                      <label className="option-label">Position:</label>
                      <select 
                        className="utility-select-control"
                        value={wmPosition}
                        onChange={(e) => setWmPosition(e.target.value)}
                      >
                        <option value="center">Center of Page</option>
                        <option value="top-left">Top Left</option>
                        <option value="top-right">Top Right</option>
                        <option value="bottom-left">Bottom Left</option>
                        <option value="bottom-right">Bottom Right</option>
                      </select>
                    </div>

                    <div className="utility-form-group">
                      <label className="option-label">Target Page Range:</label>
                      <input 
                        type="text" 
                        value={wmPageRange}
                        onChange={(e) => setWmPageRange(e.target.value)}
                        placeholder="all, or e.g. 1-3"
                        className="utility-input-control"
                      />
                    </div>
                  </div>

                  {/* Visual Preview */}
                  <div className="utility-preview-card" style={{ minHeight: '110px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        transform: `rotate(${wmRotation}deg)`, 
                        opacity: wmOpacity, 
                        color: wmColor, 
                        fontSize: `${Math.min(32, wmFontSize * 0.65)}px`, 
                        fontWeight: 900, 
                        letterSpacing: '2px', 
                        fontFamily: 'Helvetica, Arial, sans-serif',
                        userSelect: 'none'
                      }}
                    >
                      {wmText || 'WATERMARK'}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                      Visual watermark preview (Opacity: {Math.round(wmOpacity * 100)}%, Angle: {wmRotation}°)
                    </span>
                  </div>
                </div>
              ) : titleLower.includes('crop') ? (
                /* CROP PDF OPTIONS */
                <div className="utility-options-form">
                  <div className="utility-form-group">
                    <label className="option-label">Quick Margin Presets:</label>
                    <div className="preset-pills-row">
                      <button
                        type="button"
                        className="preset-pill-btn"
                        onClick={() => { setCropTop(36); setCropBottom(36); setCropLeft(36); setCropRight(36); }}
                      >
                        0.5 in (36 pt)
                      </button>
                      <button
                        type="button"
                        className="preset-pill-btn"
                        onClick={() => { setCropTop(54); setCropBottom(54); setCropLeft(54); setCropRight(54); }}
                      >
                        0.75 in (54 pt)
                      </button>
                      <button
                        type="button"
                        className="preset-pill-btn"
                        onClick={() => { setCropTop(72); setCropBottom(72); setCropLeft(72); setCropRight(72); }}
                      >
                        1.0 in (72 pt)
                      </button>
                      <button
                        type="button"
                        className="preset-pill-btn"
                        onClick={() => { setCropTop(18); setCropBottom(18); setCropLeft(18); setCropRight(18); }}
                      >
                        0.25 in (18 pt)
                      </button>
                    </div>
                  </div>

                  <div className="utility-form-row">
                    <div className="utility-form-group">
                      <label className="option-label">Top Margin (pt):</label>
                      <input 
                        type="number" 
                        min="0" 
                        max="300"
                        value={cropTop}
                        onChange={(e) => setCropTop(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="utility-input-control"
                      />
                    </div>
                    <div className="utility-form-group">
                      <label className="option-label">Bottom Margin (pt):</label>
                      <input 
                        type="number" 
                        min="0" 
                        max="300"
                        value={cropBottom}
                        onChange={(e) => setCropBottom(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="utility-input-control"
                      />
                    </div>
                  </div>

                  <div className="utility-form-row">
                    <div className="utility-form-group">
                      <label className="option-label">Left Margin (pt):</label>
                      <input 
                        type="number" 
                        min="0" 
                        max="300"
                        value={cropLeft}
                        onChange={(e) => setCropLeft(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="utility-input-control"
                      />
                    </div>
                    <div className="utility-form-group">
                      <label className="option-label">Right Margin (pt):</label>
                      <input 
                        type="number" 
                        min="0" 
                        max="300"
                        value={cropRight}
                        onChange={(e) => setCropRight(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="utility-input-control"
                      />
                    </div>
                  </div>

                  <div className="utility-form-group">
                    <label className="option-label">Target Pages:</label>
                    <input 
                      type="text" 
                      value={cropPageRange}
                      onChange={(e) => setCropPageRange(e.target.value)}
                      placeholder="all, or e.g. 1-3, 5"
                      className="utility-input-control"
                    />
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                      Apply crop box trimming to all pages or specify selected page numbers.
                    </span>
                  </div>

                  <div style={{ padding: '0.75rem 1rem', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                    <strong style={{ color: '#10B981' }}>Lossless PDF Crop:</strong> Trimming adjusts the document viewing boundaries (CropBox &amp; MediaBox) conforming to ISO 32000-1 standards without rasterizing or degrading the underlying vector graphics and text.
                  </div>
                </div>
              ) : titleLower.includes('metadata') ? (
                /* EDIT METADATA OPTIONS */
                <div className="utility-options-form">
                  {isReadingMeta && (
                    <div style={{ padding: '0.5rem', background: 'var(--color-primary-light)', borderRadius: '6px', fontSize: '0.82rem', color: 'var(--color-primary)' }}>
                      Reading existing PDF properties...
                    </div>
                  )}

                  <div className="utility-form-group">
                    <label className="option-label">Document Title:</label>
                    <input 
                      type="text" 
                      value={metaTitle}
                      onChange={(e) => setMetaTitle(e.target.value)}
                      placeholder="e.g. Quarterly Financial Report"
                      className="utility-input-control"
                    />
                  </div>

                  <div className="utility-form-group">
                    <label className="option-label">Author / Creator:</label>
                    <input 
                      type="text" 
                      value={metaAuthor}
                      onChange={(e) => setMetaAuthor(e.target.value)}
                      placeholder="e.g. Jane Doe, Acme Corporation"
                      className="utility-input-control"
                    />
                  </div>

                  <div className="utility-form-group">
                    <label className="option-label">Subject / Topic:</label>
                    <input 
                      type="text" 
                      value={metaSubject}
                      onChange={(e) => setMetaSubject(e.target.value)}
                      placeholder="e.g. Annual Audit & Compliance Overview"
                      className="utility-input-control"
                    />
                  </div>

                  <div className="utility-form-group">
                    <label className="option-label">Keywords (comma-separated):</label>
                    <input 
                      type="text" 
                      value={metaKeywords}
                      onChange={(e) => setMetaKeywords(e.target.value)}
                      placeholder="e.g. finance, audit, 2026, compliance"
                      className="utility-input-control"
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem' }}
                      onClick={() => {
                        setMetaTitle('');
                        setMetaAuthor('');
                        setMetaSubject('');
                        setMetaKeywords('');
                      }}
                    >
                      Clear All Fields
                    </button>
                  </div>
                </div>
              ) : (
                /* DEFAULT STANDARD/HIGH PRECISION OPTIONS */
                <div className="options-grid">
                  <div 
                    className={`quality-card ${optionValue === 'standard' ? 'active' : ''}`}
                    onClick={() => setOptionValue('standard')}
                  >
                    <div className="quality-radio">
                      {optionValue === 'standard' && <FontAwesomeIcon icon={faCheck} />}
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
                      {optionValue === 'pro' && <FontAwesomeIcon icon={faCheck} />}
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
            fileName={file ? file.name : (files && files[0] ? files[0].name : '')}
            isIndeterminate={titleLower.includes('word') || titleLower.includes('protect')}
          />
        )}

        {/* Step 4: Success State with Download Button */}
        {status === 'success' && (
          <div className="generic-success-card">
            <div className="success-badge">
              <FontAwesomeIcon icon={faCircleCheck} size="3x" className="success-icon" />
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

            {/* PowerPoint Summary & Mode Notice */}
            {pptMeta && (
              <div style={{ margin: '1.25rem 0', padding: '1rem 1.25rem', background: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-text)' }}>
                    Presentation Details
                  </div>
                  <span style={{ 
                    padding: '0.2rem 0.65rem', 
                    borderRadius: '100px', 
                    fontSize: '0.75rem', 
                    fontWeight: 700, 
                    textTransform: 'uppercase',
                    background: pptMeta.mode === 'editable' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                    color: pptMeta.mode === 'editable' ? '#10B981' : '#3B82F6',
                    border: `1px solid ${pptMeta.mode === 'editable' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`
                  }}>
                    {pptMeta.mode === 'editable' ? 'Editable Shapes & Tables' : 'High-Fidelity Visual Deck'}
                  </span>
                </div>
                <div style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  {pptMeta.mode === 'editable' ? (
                    <>
                      Generated <strong>{pptMeta.pageCount} slide{pptMeta.pageCount === 1 ? '' : 's'}</strong> with native editable text boxes and PowerPoint layout coordinates.
                      {pptMeta.tableDetected && <span> Detected tabular data was converted into native PowerPoint tables.</span>}
                    </>
                  ) : (
                    <>
                      Generated <strong>{pptMeta.pageCount} slide{pptMeta.pageCount === 1 ? '' : 's'}</strong> using high-resolution visual rendering. 100% of original visual appearance, diagrams, and typography preserved as image-based slides.
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Scanned Image Document Notice */}
            {scannedWarning && (
              <div 
                style={{ 
                  margin: '1.25rem 0', 
                  padding: '0.85rem 1.15rem', 
                  background: 'rgba(245, 158, 11, 0.1)', 
                  border: '1px solid rgba(245, 158, 11, 0.35)', 
                  borderRadius: '10px', 
                  color: '#D97706', 
                  fontSize: '0.88rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.65rem',
                  textAlign: 'left'
                }}
              >
                <FontAwesomeIcon icon={faTriangleExclamation} style={{ flexShrink: 0, color: "#D97706" }} />
                <span>
                  <strong>Scanned Document Notice:</strong> This document contains scanned pages or images without an embedded text layer.
                  {(titleLower.includes('powerpoint') || titleLower.includes('ppt'))
                    ? ' Slides were generated as high-fidelity visual images so no content was lost. OCR (Optical Character Recognition) is required to convert scanned images into editable text.'
                    : ' An informational notice has been included in your converted file.'}
                </span>
              </div>
            )}

            <div className="success-actions">
              <button type="button" className="btn btn-primary" onClick={handleDownload}>
                <FontAwesomeIcon icon={faDownload} /> Download {processedResult ? processedResult.filename : 'File'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleReset}>
                <FontAwesomeIcon icon={faArrowRotateLeft} />
                <span>
                  {titleLower.includes('merge') ? 'Merge Another Document' :
                   titleLower.includes('split') ? 'Split Another Document' :
                   titleLower.includes('compress') ? 'Compress Another Document' :
                   titleLower.includes('protect') ? 'Protect Another Document' :
                   titleLower.includes('watermark') ? 'Watermark Another Document' :
                   titleLower.includes('number') ? 'Add Numbers to Another PDF' :
                   titleLower.includes('meta') ? 'Edit Another Document' :
                   titleLower.includes('crop') ? 'Crop Another Document' :
                   titleLower.includes('word') || titleLower.includes('ppt') || titleLower.includes('excel') || titleLower.includes('jpg') ? 'Convert Another Document' :
                   'Process Another Document'}
                </span>
              </button>
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}
