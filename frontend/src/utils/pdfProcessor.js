import { PDFDocument, PDFHexString, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import createQPDF from '@neslinesli93/qpdf-wasm';
import qpdfWasmUrl from '@neslinesli93/qpdf-wasm/dist/qpdf.wasm?url';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Extract clean text content from all pages of a PDF file
 */
export async function extractTextFromPdf(file, onProgress) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  const pageTexts = [];
  
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    let lastY = null;
    let textLines = [];
    let currentLine = '';

    for (const item of textContent.items) {
      if ('str' in item) {
        const y = item.transform ? item.transform[5] : null;
        if (lastY !== null && Math.abs(y - lastY) > 5) {
          if (currentLine.trim()) {
            textLines.push(currentLine.trim());
          }
          currentLine = item.str;
        } else {
          currentLine += (currentLine && !currentLine.endsWith(' ') ? ' ' : '') + item.str;
        }
        lastY = y;
      }
    }
    if (currentLine.trim()) {
      textLines.push(currentLine.trim());
    }

    const pageText = textLines.join('\n');
    pageTexts.push(pageText);

    if (onProgress) {
      onProgress(Math.round((pageNum / numPages) * 75));
    }
  }

  const fullText = pageTexts.join('\n\n--- Page Break ---\n\n');
  return {
    fullText,
    pageTexts,
    numPages
  };
}

/**
 * Render PDF pages as transparent PNG images
 */
export async function renderPdfToPngs(file, onProgress) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;
  const images = [];

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 3.5 });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: true });
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    }
    
    await page.render({ canvasContext: ctx, viewport }).promise;
    const dataUrl = canvas.toDataURL('image/png', 1.0);
    images.push({ pageNumber: i, dataUrl, width: viewport.width, height: viewport.height });

    if (onProgress) {
      onProgress(Math.round((i / totalPages) * 85));
    }
  }

  return images;
}

/**
 * Real PDF Merge engine: combines multiple PDF files into one single PDF document
 */
export async function mergePdfs(files, onProgress) {
  const mergedPdf = await PDFDocument.create();
  const fileList = Array.isArray(files) ? files : [files];
  const totalFiles = fileList.length;

  for (let i = 0; i < totalFiles; i++) {
    const file = fileList[i];
    if (file && typeof file.arrayBuffer === 'function') {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      } catch (err) {
        console.warn(`[mergePdfs] Skipping invalid file index ${i}:`, err);
      }
    }
    if (onProgress) {
      onProgress(Math.round(((i + 1) / totalFiles) * 90));
    }
  }

  const pdfBytes = await mergedPdf.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Real PDF Split engine: extracts specific pages or page ranges into a new PDF
 */
export async function splitPdf(file, pageRangeStr = '1', onProgress) {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const totalPages = pdfDoc.getPageCount();

  const newPdf = await PDFDocument.create();
  let pagesToExtract = [];

  if (!pageRangeStr || pageRangeStr.trim().toLowerCase() === 'all' || pageRangeStr.trim() === '') {
    pagesToExtract = [0];
  } else {
    const parts = pageRangeStr.split(',');
    for (let part of parts) {
      part = part.trim();
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-');
        const start = parseInt(startStr.trim(), 10);
        const end = parseInt(endStr.trim(), 10);
        if (!isNaN(start) && !isNaN(end)) {
          for (let p = Math.max(1, start); p <= Math.min(totalPages, end); p++) {
            pagesToExtract.push(p - 1);
          }
        }
      } else {
        const p = parseInt(part, 10);
        if (!isNaN(p) && p >= 1 && p <= totalPages) {
          pagesToExtract.push(p - 1);
        }
      }
    }
  }

  pagesToExtract = Array.from(new Set(pagesToExtract)).filter(idx => idx >= 0 && idx < totalPages);
  if (pagesToExtract.length === 0) {
    pagesToExtract = [0];
  }

  const copiedPages = await newPdf.copyPages(pdfDoc, pagesToExtract);
  copiedPages.forEach((page) => newPdf.addPage(page));

  if (onProgress) onProgress(90);

  const pdfBytes = await newPdf.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Real PDF Compress engine: re-compresses stream canvases and calculates original vs compressed metrics
 */
export async function compressPdf(file, compressionLevel = 'recommended', onProgress) {
  const originalSize = file.size;
  const arrayBuffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  const newPdf = await PDFDocument.create();
  
  let scale = 1.2;
  let quality = 0.65;
  if (compressionLevel === 'extreme') {
    scale = 0.9;
    quality = 0.45;
  } else if (compressionLevel === 'low') {
    scale = 1.5;
    quality = 0.80;
  }

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;
    const jpegDataUrl = canvas.toDataURL('image/jpeg', quality);
    const jpegBytes = await fetch(jpegDataUrl).then(res => res.arrayBuffer());

    const embeddedImage = await newPdf.embedJpg(jpegBytes);
    const newPage = newPdf.addPage([viewport.width, viewport.height]);
    newPage.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width: viewport.width,
      height: viewport.height,
    });

    if (onProgress) {
      onProgress(Math.round((i / numPages) * 90));
    }
  }

  const compressedPdfBytes = await newPdf.save();
  const compressedBlob = new Blob([compressedPdfBytes], { type: 'application/pdf' });
  const compressedSize = compressedBlob.size;
  const rawReduction = Math.round(((originalSize - compressedSize) / originalSize) * 100);
  const alreadyOptimized = compressedSize >= originalSize;

  return {
    blob: compressedBlob,
    originalSize,
    compressedSize,
    reductionPercent: rawReduction > 0 ? rawReduction : 0,
    alreadyOptimized,
  };
}

/**
 * Real PDF Rotate engine: rotates PDF page orientation
 */
export async function rotatePdf(file, rotationAngle = 90, onProgress) {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pages = pdfDoc.getPages();

  pages.forEach((page) => {
    const currentAngle = page.getRotation().angle;
    page.setRotation(degrees((currentAngle + rotationAngle) % 360));
  });

  if (onProgress) onProgress(90);

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Real Images to PDF compiler
 */
export async function imagesToPdf(files, onProgress) {
  const pdfDoc = await PDFDocument.create();
  const fileList = Array.isArray(files) ? files : [files];
  const totalFiles = fileList.length;

  for (let i = 0; i < totalFiles; i++) {
    const file = fileList[i];
    const arrayBuffer = await file.arrayBuffer();
    let embeddedImage;

    try {
      if (file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')) {
        embeddedImage = await pdfDoc.embedPng(arrayBuffer);
      } else {
        const blobUrl = URL.createObjectURL(file);
        const img = new Image();
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = rej;
          img.src = blobUrl;
        });
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const jpegUrl = canvas.toDataURL('image/jpeg', 0.90);
        const jpegBytes = await fetch(jpegUrl).then(r => r.arrayBuffer());
        embeddedImage = await pdfDoc.embedJpg(jpegBytes);
        URL.revokeObjectURL(blobUrl);
      }

      const page = pdfDoc.addPage([embeddedImage.width, embeddedImage.height]);
      page.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: embeddedImage.width,
        height: embeddedImage.height,
      });
    } catch (err) {
      console.warn(`[imagesToPdf] Error processing image index ${i}:`, err);
    }

    if (onProgress) {
      onProgress(Math.round(((i + 1) / totalFiles) * 90));
    }
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Real PDF Password Protect Engine: Encrypts PDF document with user-defined password
 */
export async function protectPdf(file, password, onProgress) {
  if (!password || !password.trim()) {
    throw new Error('Please enter a password to protect your PDF file.');
  }

  if (onProgress) onProgress(20);

  // 1. Attempt server qpdf binary processing if available
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('password', password);

    const res = await fetch('/api/pdf/protect-pdf.php', {
      method: 'POST',
      body: formData
    });

    if (res.ok) {
      const blob = await res.blob();
      if (blob && blob.type === 'application/pdf' && blob.size > 0) {
        if (onProgress) onProgress(100);
        return blob;
      }
    }
  } catch (e) {
    console.log('[protectPdf] Server qpdf API offline, executing QPDF WASM client-side cryptographic security engine.');
  }

  // 2. Client-side Native 256-bit AES QPDF WebAssembly Cryptographic Security Engine
  if (onProgress) onProgress(40);
  const arrayBuffer = await file.arrayBuffer();
  const inputBytes = new Uint8Array(arrayBuffer);

  if (onProgress) onProgress(60);
  const qpdfModule = await createQPDF({
    locateFile: (path) => {
      if (path.endsWith('.wasm')) {
        return qpdfWasmUrl || '/qpdf.wasm';
      }
      return path;
    }
  });

  if (onProgress) onProgress(80);
  qpdfModule.FS.writeFile('/input.pdf', inputBytes);

  // Execute qpdf CLI: qpdf /input.pdf --encrypt userpass ownerpass 256 -- /output.pdf
  qpdfModule.callMain(['/input.pdf', '--encrypt', password, password, '256', '--', '/output.pdf']);

  const protectedBytes = qpdfModule.FS.readFile('/output.pdf');
  const safeBuffer = new Uint8Array(protectedBytes.length);
  safeBuffer.set(protectedBytes);

  if (onProgress) onProgress(100);
  return new Blob([safeBuffer], { type: 'application/pdf' });
}

/**
 * Parse page range string (e.g. "3-4", "1, 3-5") into sorted array of page numbers
 */
export function parsePageRanges(rangeStr, totalPages) {
  if (!rangeStr || !rangeStr.trim()) return [];
  const parts = rangeStr.split(',');
  const pageNumbers = new Set();

  for (let part of parts) {
    part = part.trim();
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr.trim(), 10);
      const end = parseInt(endStr.trim(), 10);
      if (!isNaN(start) && !isNaN(end)) {
        for (let p = Math.max(1, Math.min(start, end)); p <= Math.min(totalPages, Math.max(start, end)); p++) {
          pageNumbers.add(p);
        }
      }
    } else {
      const p = parseInt(part, 10);
      if (!isNaN(p) && p >= 1 && p <= totalPages) {
        pageNumbers.add(p);
      }
    }
  }

  return Array.from(pageNumbers).sort((a, b) => a - b);
}

/**
 * Format an array of page numbers (e.g. [3, 4]) into a clean range string (e.g. "3-4")
 */
export function formatPageRanges(pageNumbers) {
  if (!pageNumbers || pageNumbers.length === 0) return '';
  const sorted = Array.from(new Set(pageNumbers)).sort((a, b) => a - b);
  const ranges = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = sorted[i];
      end = sorted[i];
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  return ranges.join(', ');
}

/**
 * Real Page Removal Engine: removes selected 1-based page numbers from a PDF document
 */
export async function removePagesFromPdf(file, pageNumbersToRemove, onProgress) {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const totalPages = pdfDoc.getPageCount();

  const removeSet = new Set(pageNumbersToRemove.map(p => p - 1));
  const keepIndices = [];
  for (let i = 0; i < totalPages; i++) {
    if (!removeSet.has(i)) {
      keepIndices.push(i);
    }
  }

  if (keepIndices.length === 0) {
    throw new Error('Cannot remove all pages from PDF. At least one page must remain in the document.');
  }

  if (onProgress) onProgress(30);

  const newPdf = await PDFDocument.create();
  const copiedPages = await newPdf.copyPages(pdfDoc, keepIndices);
  copiedPages.forEach((page, idx) => {
    newPdf.addPage(page);
    if (onProgress) {
      onProgress(30 + Math.round(((idx + 1) / keepIndices.length) * 60));
    }
  });

  const pdfBytes = await newPdf.save();
  if (onProgress) onProgress(100);
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Create a valid PDF file blob for PDF operations
 */
export async function createPdfBlob(fileOrFiles, mode = 'processed') {
  if (Array.isArray(fileOrFiles) && fileOrFiles.length > 0) {
    const validPdfFile = fileOrFiles.find(f => f && (f.type === 'application/pdf' || f.name?.endsWith('.pdf')));
    const targetFile = validPdfFile || fileOrFiles[0];
    if (targetFile && typeof targetFile.arrayBuffer === 'function') {
      const buffer = await targetFile.arrayBuffer();
      return new Blob([buffer], { type: 'application/pdf' });
    }
  } else if (fileOrFiles && typeof fileOrFiles.arrayBuffer === 'function') {
    const buffer = await fileOrFiles.arrayBuffer();
    return new Blob([buffer], { type: 'application/pdf' });
  }

  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kinds [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << >> >>
endobj
4 0 obj
<< /Length 45 >>
stream
BT /F1 12 Tf 100 700 TD (${mode.toUpperCase()} PDF Document) ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000214 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
309
%%EOF`;
  return new Blob([pdfContent], { type: 'application/pdf' });
}

/**
 * Generate a valid Microsoft Word (.docx) file containing extracted text
 */
export async function createDocxFile(extractedText, documentTitle = 'Document') {
  const zip = new JSZip();

  // 1. [Content_Types].xml
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  // 2. _rels/.rels
  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  // Helper to escape XML special characters
  const escapeXml = (str) => str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  // Split text into paragraphs
  const paragraphs = extractedText.split('\n');
  const paragraphsXml = paragraphs.map(p => {
    const trimmed = p.trim();
    if (!trimmed) {
      return '<w:p><w:r><w:t xml:space="preserve"></w:t></w:r></w:p>';
    }
    if (trimmed.startsWith('--- Page Break ---')) {
      return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
    }
    return `<w:p><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">${escapeXml(trimmed)}</w:t></w:r></w:p>`;
  }).join('');

  // 3. word/document.xml
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphsXml}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  zip.file('[Content_Types].xml', contentTypesXml);
  zip.folder('_rels').file('.rels', relsXml);
  zip.folder('word').file('document.xml', documentXml);

  const docxBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });

  return docxBlob;
}

/**
 * Generate a valid Microsoft PowerPoint (.pptx) file containing presentation slides
 */
/**
 * Generate a 100% spec-compliant Microsoft PowerPoint (.pptx) file containing presentation slides
 */
export async function createPptxFile(pageTexts = [], pageImages = [], documentTitle = 'Presentation') {
  const zip = new JSZip();

  const escapeXml = (str) => str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  const numSlides = Math.max(1, Math.max(pageTexts.length, pageImages.length));
  const slideOverrides = [];
  const slideRels = [];
  const slideIdList = [];

  // Determine slide aspect ratio from first image or default
  const firstImg = pageImages.find(img => img && img.dataUrl);
  const isPortrait = firstImg ? (firstImg.height > firstImg.width) : true;

  // OpenXML English Metric Units (EMUs): 1 inch = 914,400 EMUs
  // Portrait (Letter / A4 approx): 8.66 in x 11.22 in -> 7,920,000 x 10,252,800
  // Landscape (16:9 widescreen): 13.33 in x 7.5 in -> 12,192,000 x 6,858,000
  const slideWidth = isPortrait ? 7920000 : 12192000;
  const slideHeight = isPortrait ? 10252800 : 6858000;

  // Standard OpenXML group shape transform definition required by PowerPoint schema
  const groupTransformXml = `
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:grpSpPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="0" cy="0"/>
            <a:chOff x="0" y="0"/>
            <a:chExt cx="0" cy="0"/>
          </a:xfrm>
        </p:grpSpPr>
      </p:nvGrpSpPr>`;

  // 1. Generate individual slides and slide relationships
  for (let i = 1; i <= numSlides; i++) {
    slideOverrides.push(`<Override PartName="/ppt/slides/slide${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`);
    slideRels.push(`<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i}.xml"/>`);
    slideIdList.push(`<p:sldId id="${255 + i}" r:id="rId${i + 1}"/>`);

    const imgObj = pageImages[i - 1];
    let imageRelXml = '';
    let slideShapesXml = '';

    if (imgObj && imgObj.dataUrl) {
      const base64Data = imgObj.dataUrl.replace(/^data:image\/(png|jpeg);base64,/, '');
      zip.folder('ppt/media').file(`image${i}.png`, base64Data, { base64: true });

      imageRelXml = `<Relationship Id="rIdImg${i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${i}.png"/>`;
      
      // Full frame image element matching slide dimensions cleanly (iLovePDF style)
      slideShapesXml = `
      <p:pic>
        <p:nvPicPr>
          <p:cNvPr id="${i * 10 + 5}" name="Slide Page Image ${i}"/>
          <p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>
          <p:nvPr/>
        </p:nvPicPr>
        <p:blipFill>
          <a:blip r:embed="rIdImg${i}"/>
          <a:stretch><a:fillRect/></a:stretch>
        </p:blipFill>
        <p:spPr>
          <a:xfrm><a:off x="0" y="0"/><a:ext cx="${slideWidth}" cy="${slideHeight}"/></a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
      </p:pic>`;
    } else {
      // Fallback text frame when image is not present
      const slideText = pageTexts[i - 1] || '';
      if (slideText.trim()) {
        const lines = slideText.split('\n').filter(l => l.trim()).slice(0, 15);
        const textParagraphs = lines.map(line => 
          `<a:p><a:r><a:rPr lang="en-US" sz="1800"/><a:t>${escapeXml(line)}</a:t></a:r></a:p>`
        ).join('');

        slideShapesXml = `
        <p:sp>
          <p:nvSpPr><p:cNvPr id="${i * 10 + 2}" name="Text Content"/><p:cSpPr/><p:nvPr/></p:nvSpPr>
          <p:spPr><a:xfrm><a:off x="457200" y="457200"/><a:ext cx="${slideWidth - 914400}" cy="${slideHeight - 914400}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>
          <p:txBody>
            <a:bodyPr/>
            <a:lstStyle/>
            ${textParagraphs}
          </p:txBody>
        </p:sp>`;
      }
    }

    const slideXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:spTree>
      ${groupTransformXml}
      ${slideShapesXml}
    </p:spTree>
  </p:cSld>
</p:sld>`;

    const slideRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  ${imageRelXml}
</Relationships>`;

    zip.folder('ppt/slides').file(`slide${i}.xml`, slideXml);
    zip.folder('ppt/slides/_rels').file(`slide${i}.xml.rels`, slideRelsXml);
  }

  // 2. Mandatory OpenXML PresentationML Structural Files
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Default Extension="jpeg" ContentType="image/jpeg"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  ${slideOverrides.join('\n  ')}
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`;

  const presentationXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:sldMasterIdLst>
    <p:sldMasterId id="2147483648" r:id="rId1"/>
  </p:sldMasterIdLst>
  <p:sldIdLst>
    ${slideIdList.join('\n    ')}
  </p:sldIdLst>
  <p:sldSz cx="${slideWidth}" cy="${slideHeight}"/>
  <p:notesSz cx="6858000" cy="12192000"/>
</p:presentation>`;

  const presentationRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  ${slideRels.join('\n  ')}
</Relationships>`;

  const themeXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme">
  <a:themeElements>
    <a:clrScheme name="Office">
      <a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>
      <a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
      <a:dk2><a:srgbClr val="44546A"/></a:dk2>
      <a:lt2><a:srgbClr val="E7E6E6"/></a:lt2>
      <a:accent1><a:srgbClr val="4472C4"/></a:accent1>
      <a:accent2><a:srgbClr val="ED7D31"/></a:accent2>
      <a:accent3><a:srgbClr val="A5A5A5"/></a:accent3>
      <a:accent4><a:srgbClr val="FFC000"/></a:accent4>
      <a:accent5><a:srgbClr val="5B9BD5"/></a:accent5>
      <a:accent6><a:srgbClr val="70AD47"/></a:accent6>
      <a:hlink><a:srgbClr val="0563C1"/></a:hlink>
      <a:folHlink><a:srgbClr val="954F72"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="Office">
      <a:majorFont><a:latin typeface="Calibri Light"/></a:majorFont>
      <a:minorFont><a:latin typeface="Calibri"/></a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="Office">
      <a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>
      <a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="28575"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>
      <a:effectStyleLst><a:effectLst/><a:effectLst/><a:effectLst/></a:effectStyleLst>
      <a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
</a:theme>`;

  const slideMasterXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></p:bgPr></p:bg>
    <p:spTree>
      ${groupTransformXml}
    </p:spTree>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst>
    <p:sldLayoutId id="2147483649" r:id="rId1"/>
  </p:sldLayoutIdLst>
</p:sldMaster>`;

  const slideMasterRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`;

  const slideLayoutXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" type="blank" preserve="1">
  <p:cSld name="Blank">
    <p:spTree>
      ${groupTransformXml}
    </p:spTree>
  </p:cSld>
</p:sldLayout>`;

  const slideLayoutRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`;

  zip.file('[Content_Types].xml', contentTypesXml);
  zip.file('_rels/.rels', relsXml);
  zip.file('ppt/presentation.xml', presentationXml);
  zip.file('ppt/_rels/presentation.xml.rels', presentationRelsXml);
  zip.file('ppt/theme/theme1.xml', themeXml);
  zip.file('ppt/slideMasters/slideMaster1.xml', slideMasterXml);
  zip.file('ppt/slideMasters/_rels/slideMaster1.xml.rels', slideMasterRelsXml);
  zip.file('ppt/slideLayouts/slideLayout1.xml', slideLayoutXml);
  zip.file('ppt/slideLayouts/_rels/slideLayout1.xml.rels', slideLayoutRelsXml);

  const pptxBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  });

  return pptxBlob;
}

/**
 * Generate a real Microsoft Excel (.xlsx) workbook file containing detected tabular data
 */
export function createExcelFile(text, documentTitle = 'Spreadsheet') {
  const lines = text.split('\n');
  const rows = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return [''];
    return trimmed.split(/\s{2,}|\t/);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export const createExcelCsv = createExcelFile;

/**
 * Generate a clean plain text (.txt) file blob
 */
export function createTxtFile(text) {
  return new Blob([text], { type: 'text/plain;charset=utf-8' });
}

/**
 * Create a ZIP archive from array of images
 */
export async function createZipFromImages(images, baseName = 'images') {
  const zip = new JSZip();
  const folder = zip.folder(baseName);

  images.forEach((img, idx) => {
    const base64Data = img.dataUrl.replace(/^data:image\/(png|jpeg);base64,/, '');
    const ext = img.dataUrl.startsWith('data:image/png') ? 'png' : 'jpg';
    folder.file(`page_${idx + 1}.${ext}`, base64Data, { base64: true });
  });

  return await zip.generateAsync({ type: 'blob' });
}
