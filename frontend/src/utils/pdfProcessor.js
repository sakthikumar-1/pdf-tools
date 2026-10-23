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
 * Safely reads the total page count of a PDF file
 */
export async function getPdfPageCount(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    return pdfDoc.getPageCount();
  } catch (err) {
    return null;
  }
}

/**
 * Real PDF Split engine: extracts specific pages or page ranges into a new PDF
 * Strictly validates requested ranges and prevents silent incorrect fallbacks.
 */
export async function splitPdf(file, pageRangeStr = '1', onProgress) {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const totalPages = pdfDoc.getPageCount();

  if (totalPages === 0) {
    throw new Error('This PDF document contains no pages to split.');
  }

  const rawInput = (pageRangeStr || '').trim();
  if (!rawInput) {
    throw new Error(`Please enter the page numbers or ranges to extract (Document has ${totalPages} page${totalPages === 1 ? '' : 's'}).`);
  }

  let pagesToExtract = [];

  if (rawInput.toLowerCase() === 'all') {
    for (let i = 0; i < totalPages; i++) {
      pagesToExtract.push(i);
    }
  } else {
    const parts = rawInput.split(',');
    for (let part of parts) {
      const item = part.trim();
      if (!item) continue;

      if (item.includes('-')) {
        const sides = item.split('-');
        if (sides.length !== 2) {
          throw new Error(`Invalid range format: "${item}". Expected format like 1-3.`);
        }
        const startStr = sides[0].trim();
        const endStr = sides[1].trim();

        if (!/^\d+$/.test(startStr) || !/^\d+$/.test(endStr)) {
          throw new Error(`Invalid numbers in range: "${item}". Please use positive numbers only.`);
        }

        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);

        if (start < 1 || end < 1) {
          throw new Error(`Page numbers must be 1 or greater (got range "${item}").`);
        }
        if (start > totalPages && end > totalPages) {
          throw new Error(`Requested range ${start}-${end} is out of range. Document contains only ${totalPages} page${totalPages === 1 ? '' : 's'}.`);
        }
        if (start > totalPages) {
          throw new Error(`Page range start (${start}) exceeds total document pages (${totalPages}).`);
        }

        const min = Math.min(start, end);
        const max = Math.min(totalPages, Math.max(start, end));

        for (let p = Math.max(1, min); p <= max; p++) {
          pagesToExtract.push(p - 1);
        }
      } else {
        if (!/^\d+$/.test(item)) {
          throw new Error(`Invalid page specification: "${item}". Please enter numeric page numbers (e.g. 1, 2-3).`);
        }
        const p = parseInt(item, 10);
        if (p < 1) {
          throw new Error(`Page numbers must be 1 or greater (got ${p}).`);
        }
        if (p > totalPages) {
          throw new Error(`Page ${p} is out of range. This document only contains ${totalPages} page${totalPages === 1 ? '' : 's'}.`);
        }
        pagesToExtract.push(p - 1);
      }
    }
  }

  // Deduplicate while preserving specified extraction order
  pagesToExtract = Array.from(new Set(pagesToExtract)).filter(idx => idx >= 0 && idx < totalPages);

  if (pagesToExtract.length === 0) {
    throw new Error(`No valid pages found in range "${pageRangeStr}". Document contains ${totalPages} page${totalPages === 1 ? '' : 's'} (valid range: 1-${totalPages}).`);
  }

  if (onProgress) onProgress(30);

  const newPdf = await PDFDocument.create();
  const copiedPages = await newPdf.copyPages(pdfDoc, pagesToExtract);
  copiedPages.forEach((page, idx) => {
    newPdf.addPage(page);
    if (onProgress) {
      onProgress(30 + Math.round(((idx + 1) / copiedPages.length) * 60));
    }
  });

  const pdfBytes = await newPdf.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Intelligent PDF Compress engine:
 * 1. Evaluates lossless object-stream vector compression via pdf-lib (preserving 100% of text and vector quality).
 * 2. Evaluates adaptive canvas downsampling for raster/image-heavy documents.
 * 3. Never inflates file size: if downsampling produces a larger file than original or vector,
 *    it chooses the smallest candidate and marks alreadyOptimized = true without corrupting or bloating the PDF.
 */
export async function compressPdf(file, compressionLevel = 'recommended', onProgress) {
  const originalSize = file.size;
  const arrayBuffer = await file.arrayBuffer();

  if (onProgress) onProgress(10);

  // 1. Lossless object-stream optimization
  let vectorBytes = null;
  let vectorSize = originalSize;
  try {
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    vectorBytes = await pdfDoc.save({ useObjectStreams: true });
    vectorSize = vectorBytes.byteLength;
  } catch (err) {
    console.warn('[compressPdf] Vector optimization bypass:', err);
  }

  if (onProgress) onProgress(25);

  // 2. Adaptive downsampling parameters
  let scale = 1.2;
  let quality = 0.65;
  if (compressionLevel === 'extreme') {
    scale = 0.85;
    quality = 0.45;
  } else if (compressionLevel === 'low') {
    scale = 1.4;
    quality = 0.80;
  }

  let rasterBlob = null;
  let rasterSize = Infinity;

  try {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;

    const rasterPdf = await PDFDocument.create();

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
      }

      await page.render({ canvasContext: ctx, viewport }).promise;
      const jpegDataUrl = canvas.toDataURL('image/jpeg', quality);
      const jpegBytes = await fetch(jpegDataUrl).then(res => res.arrayBuffer());

      const embeddedImage = await rasterPdf.embedJpg(jpegBytes);
      const newPage = rasterPdf.addPage([viewport.width, viewport.height]);
      newPage.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: viewport.width,
        height: viewport.height,
      });

      if (onProgress) {
        onProgress(25 + Math.round((i / numPages) * 65));
      }
    }

    const rasterBytes = await rasterPdf.save({ useObjectStreams: true });
    rasterBlob = new Blob([rasterBytes], { type: 'application/pdf' });
    rasterSize = rasterBlob.size;
  } catch (err) {
    console.warn('[compressPdf] Downsampling skipped:', err);
  }

  if (onProgress) onProgress(95);

  // 3. Candidate evaluation and anti-bloating guarantee:
  // Never pick a candidate larger than originalSize!
  let chosenBlob;
  let chosenSize;
  let alreadyOptimized = false;

  // If raster downsampling yielded genuine savings (at least 5% smaller than original and vector)
  if (rasterBlob && rasterSize < originalSize && rasterSize < (vectorSize * 0.95)) {
    chosenBlob = rasterBlob;
    chosenSize = rasterSize;
  } else if (vectorBytes && vectorSize < originalSize) {
    // Lossless vector stream compression is the best candidate
    chosenBlob = new Blob([vectorBytes], { type: 'application/pdf' });
    chosenSize = vectorSize;
  } else {
    // The document is already as small as possible (clean vector text or pre-optimized)
    // NEVER inflate file size! Return the original unmodified bytes.
    chosenBlob = new Blob([arrayBuffer], { type: 'application/pdf' });
    chosenSize = originalSize;
    alreadyOptimized = true;
  }

  if (onProgress) onProgress(100);

  const rawReduction = Math.round(((originalSize - chosenSize) / originalSize) * 100);

  return {
    blob: chosenBlob,
    originalSize,
    compressedSize: chosenSize,
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
 * Extract 2D-coordinate structured layout from PDF pages
 * Identifies lines, cells, table columns, headings, and paragraphs
 */
export async function extractStructuredPdfPages(fileOrBuffer, onProgress) {
  let arrayBuffer;
  if (fileOrBuffer instanceof ArrayBuffer) {
    arrayBuffer = fileOrBuffer;
  } else if (fileOrBuffer && typeof fileOrBuffer.arrayBuffer === 'function') {
    arrayBuffer = await fileOrBuffer.arrayBuffer();
  } else if (fileOrBuffer && fileOrBuffer.buffer) {
    arrayBuffer = fileOrBuffer.buffer.slice(fileOrBuffer.byteOffset, fileOrBuffer.byteOffset + fileOrBuffer.byteLength);
  } else {
    arrayBuffer = fileOrBuffer;
  }

  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const doc = await loadingTask.promise;
  const numPages = doc.numPages;
  const pages = [];
  let totalTextItems = 0;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const tc = await page.getTextContent();

    const rawItems = [];
    tc.items.forEach(it => {
      const text = (it.str || '').trim();
      if (!text) return;
      const x = it.transform ? it.transform[4] : 0;
      const y = it.transform ? it.transform[5] : 0;
      const width = it.width || 0;
      const height = Math.abs(it.transform ? it.transform[0] : 12) || it.height || 12;
      const fontName = it.fontName || '';
      const isBold = fontName.toLowerCase().includes('bold') || fontName.toLowerCase().includes('heavy') || fontName.toLowerCase().includes('black');
      rawItems.push({ text, x, y, width, height, isBold, fontSize: Math.round(height) });
      totalTextItems++;
    });

    // Group items into horizontal lines (Y descending)
    rawItems.sort((a, b) => b.y - a.y || a.x - b.x);

    const lines = [];
    rawItems.forEach(item => {
      let matchedLine = lines.find(l => Math.abs(l.y - item.y) <= 3.5);
      if (!matchedLine) {
        matchedLine = { y: item.y, items: [] };
        lines.push(matchedLine);
      }
      matchedLine.items.push(item);
    });

    lines.forEach(l => l.items.sort((a, b) => a.x - b.x));

    // Form cells per line
    const processedLines = lines.map(line => {
      const cells = [];
      let currentCell = null;

      line.items.forEach(item => {
        if (!currentCell) {
          currentCell = { text: item.text, x: item.x, width: item.width, height: item.height, isBold: item.isBold, fontSize: item.fontSize };
        } else {
          const gap = item.x - (currentCell.x + currentCell.width);
          if (gap <= 8) {
            currentCell.text += ' ' + item.text;
            currentCell.width = (item.x + item.width) - currentCell.x;
            if (item.isBold) currentCell.isBold = true;
          } else {
            cells.push(currentCell);
            currentCell = { text: item.text, x: item.x, width: item.width, height: item.height, isBold: item.isBold, fontSize: item.fontSize };
          }
        }
      });
      if (currentCell) cells.push(currentCell);

      return { y: line.y, cells };
    });

    // Detect column anchors for lines with >= 2 cells
    const multiCellLines = processedLines.filter(l => l.cells.length >= 2);
    const colAnchors = [];
    const tolerance = 14;

    multiCellLines.forEach(l => {
      l.cells.forEach(c => {
        let match = colAnchors.find(a => Math.abs(a - c.x) <= tolerance);
        if (match === undefined) {
          colAnchors.push(c.x);
        }
      });
    });
    colAnchors.sort((a, b) => a - b);

    // Build structured grid rows
    const gridRows = [];
    processedLines.forEach(l => {
      if (l.cells.length === 1 && colAnchors.length >= 2) {
        gridRows.push({
          type: 'heading',
          text: l.cells[0].text,
          fontSize: l.cells[0].fontSize,
          isBold: l.cells[0].isBold,
          rowCells: [l.cells[0].text]
        });
      } else if (colAnchors.length >= 2) {
        const row = new Array(colAnchors.length).fill('');
        l.cells.forEach(c => {
          let bestIdx = 0;
          let bestDist = Infinity;
          colAnchors.forEach((a, i) => {
            const dist = Math.abs(a - c.x);
            if (dist < bestDist) {
              bestDist = dist;
              bestIdx = i;
            }
          });
          row[bestIdx] = c.text;
        });
        const isHeader = l.cells.some(c => c.isBold) || gridRows.length === 0 || (gridRows.length === 1 && gridRows[0].type === 'heading');
        gridRows.push({
          type: 'table_row',
          isHeader,
          rowCells: row
        });
      } else {
        const lineText = l.cells.map(c => c.text).join(' ');
        const fSize = l.cells[0]?.fontSize || 12;
        const isB = l.cells.some(c => c.isBold);
        const isHeading = fSize >= 14 || isB;

        gridRows.push({
          type: isHeading ? 'heading' : 'paragraph',
          text: lineText,
          fontSize: fSize,
          isBold: isB,
          rowCells: [lineText]
        });
      }
    });

    pages.push({
      pageNum,
      hasTable: colAnchors.length >= 2,
      colCount: Math.max(1, colAnchors.length),
      colAnchors,
      gridRows,
      lineCount: processedLines.length
    });

    if (onProgress) {
      onProgress(Math.round((pageNum / numPages) * 70));
    }
  }

  return {
    numPages,
    totalTextItems,
    isScannedOnly: totalTextItems === 0,
    pages
  };
}

/**
 * Escape XML special characters
 */
function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate a rich, formatted Microsoft Word (.docx) document
 * Preserves native tables (<w:tbl>), headings, clean paragraph spacing, and page breaks
 */
export async function generateDocxDocument(structuredData, documentTitle = 'Document') {
  const zip = new JSZip();

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  let bodyXml = '';

  if (structuredData.isScannedOnly) {
    bodyXml = `
      <w:p>
        <w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr>
        <w:r>
          <w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="B91C1C"/></w:rPr>
          <w:t>Notice: Scanned / Image-Only Document</w:t>
        </w:r>
      </w:p>
      <w:p>
        <w:pPr><w:spacing w:after="160"/></w:pPr>
        <w:r>
          <w:rPr><w:sz w:val="22"/><w:color w:val="475569"/></w:rPr>
          <w:t>This PDF document contains scanned images without an embedded text layer. Optical Character Recognition (OCR) is required to convert image text into editable Word text.</w:t>
        </w:r>
      </w:p>
    `;
  } else {
    structuredData.pages.forEach((page, pIdx) => {
      if (pIdx > 0) {
        bodyXml += '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
      }

      let inTable = false;
      let tableRowsXml = '';

      const flushTable = () => {
        if (inTable && tableRowsXml) {
          bodyXml += `
            <w:tbl>
              <w:tblPr>
                <w:tblW w:w="0" w:type="auto"/>
                <w:tblBorders>
                  <w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
                  <w:left w:val="none"/>
                  <w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
                  <w:right w:val="none"/>
                  <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
                  <w:insideV w:val="none"/>
                </w:tblBorders>
              </w:tblPr>
              ${tableRowsXml}
            </w:tbl>
            <w:p><w:pPr><w:spacing w:after="120"/></w:pPr></w:p>
          `;
          tableRowsXml = '';
          inTable = false;
        }
      };

      page.gridRows.forEach(item => {
        if (item.type === 'table_row') {
          inTable = true;
          const isHdr = item.isHeader;
          const cellsXml = item.rowCells.map(val => {
            const escaped = escapeXml(val);
            const shdXml = isHdr ? '<w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>' : '';
            const boldXml = isHdr ? '<w:b/>' : '';
            const colorVal = isHdr ? '1E293B' : '334155';
            return `
              <w:tc>
                <w:tcPr>
                  ${shdXml}
                  <w:tcMar>
                    <w:top w:w="120" w:type="dxa"/>
                    <w:bottom w:w="120" w:type="dxa"/>
                    <w:left w:w="160" w:type="dxa"/>
                    <w:right w:w="160" w:type="dxa"/>
                  </w:tcMar>
                </w:tcPr>
                <w:p>
                  <w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>
                  <w:r>
                    <w:rPr>
                      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                      ${boldXml}
                      <w:sz w:val="20"/>
                      <w:color w:val="${colorVal}"/>
                    </w:rPr>
                    <w:t xml:space="preserve">${escaped}</w:t>
                  </w:r>
                </w:p>
              </w:tc>
            `;
          }).join('');

          tableRowsXml += `<w:tr>${cellsXml}</w:tr>`;
        } else {
          flushTable();
          if (item.type === 'heading') {
            const hSize = Math.min(36, Math.max(26, (item.fontSize || 16) * 2));
            bodyXml += `
              <w:p>
                <w:pPr>
                  <w:spacing w:before="240" w:after="140"/>
                </w:pPr>
                <w:r>
                  <w:rPr>
                    <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                    <w:b/>
                    <w:sz w:val="${hSize}"/>
                    <w:color w:val="0F172A"/>
                  </w:rPr>
                  <w:t xml:space="preserve">${escapeXml(item.text)}</w:t>
                </w:r>
              </w:p>
            `;
          } else {
            bodyXml += `
              <w:p>
                <w:pPr>
                  <w:spacing w:before="60" w:after="120" w:line="276" w:lineRule="auto"/>
                </w:pPr>
                <w:r>
                  <w:rPr>
                    <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                    <w:sz w:val="22"/>
                    <w:color w:val="334155"/>
                  </w:rPr>
                  <w:t xml:space="preserve">${escapeXml(item.text)}</w:t>
                </w:r>
              </w:p>
            `;
          }
        }
      });

      flushTable();
    });
  }

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${bodyXml}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  zip.file('[Content_Types].xml', contentTypesXml);
  zip.folder('_rels').file('.rels', relsXml);
  zip.folder('word').file('document.xml', documentXml);

  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
}

/**
 * High-level PDF to Microsoft Word (.docx) converter
 */
export async function pdfToDocx(file, onProgress) {
  const structured = await extractStructuredPdfPages(file, (p) => {
    if (onProgress) onProgress(Math.round(p * 0.7));
  });

  const blob = await generateDocxDocument(structured, file?.name || 'Document');
  if (onProgress) onProgress(100);

  return {
    blob,
    isScannedOnly: structured.isScannedOnly,
    pageCount: structured.numPages,
    tableDetected: structured.pages.some(p => p.hasTable)
  };
}

/**
 * Generate a valid Microsoft Word (.docx) file containing extracted text or structured content
 */
export async function createDocxFile(input, documentTitle = 'Document') {
  if (input && typeof input === 'object' && input.pages) {
    return await generateDocxDocument(input, documentTitle);
  }

  const text = String(input || '');
  const paragraphs = text.split('\n');
  const paragraphsXml = paragraphs.map(p => {
    const trimmed = p.trim();
    if (!trimmed) {
      return '<w:p><w:r><w:t xml:space="preserve"></w:t></w:r></w:p>';
    }
    if (trimmed.startsWith('--- Page Break ---')) {
      return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
    }
    return `<w:p><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/><w:color w:val="334155"/></w:rPr><w:t xml:space="preserve">${escapeXml(trimmed)}</w:t></w:r></w:p>`;
  }).join('');

  const zip = new JSZip();
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
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

  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
}

/**
 * Generate a valid Microsoft PowerPoint (.pptx) file containing presentation slides
 */
/**
 * Generate a 100% spec-compliant Microsoft PowerPoint (.pptx) file
 * Supports:
 * - Structured 2D coordinate layout with native DrawingML text boxes (<p:sp>) and tables (<a:tbl>)
 * - High-fidelity visual slide images (<p:pic>)
 * - Legacy text/image fallback arrays
 */
export async function createPptxFile(inputOrTexts = [], pageImages = [], documentTitle = 'Presentation', mode = 'editable') {
  const zip = new JSZip();

  const escapeXml = (str) => String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  const isStructured = inputOrTexts && typeof inputOrTexts === 'object' && Array.isArray(inputOrTexts.pages);
  const numSlides = isStructured 
    ? inputOrTexts.pages.length 
    : Math.max(1, Math.max((inputOrTexts || []).length, (pageImages || []).length));

  const slideOverrides = [];
  const slideRels = [];
  const slideIdList = [];

  // Determine slide dimensions from structured page, first image, or defaults
  let slideWidth = 12192000;
  let slideHeight = 6858000;

  if (isStructured && inputOrTexts.pages[0]) {
    const p = inputOrTexts.pages[0];
    slideWidth = Math.round(p.pageWidth * 12700);
    slideHeight = Math.round(p.pageHeight * 12700);
  } else if (pageImages && pageImages.length > 0 && pageImages[0]) {
    const firstImg = pageImages.find(img => img && img.dataUrl);
    const isPortrait = firstImg ? (firstImg.height > firstImg.width) : true;
    slideWidth = isPortrait ? 7920000 : 12192000;
    slideHeight = isPortrait ? 10252800 : 6858000;
  }

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

  for (let i = 1; i <= numSlides; i++) {
    slideOverrides.push(`<Override PartName="/ppt/slides/slide${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`);
    slideRels.push(`<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i}.xml"/>`);
    slideIdList.push(`<p:sldId id="${255 + i}" r:id="rId${i + 1}"/>`);

    let imageRelXml = '';
    let slideShapesXml = '';
    let shapeId = 2;

    const imgObj = pageImages && pageImages[i - 1];

    if ((mode === 'visual' || !isStructured) && imgObj && imgObj.dataUrl) {
      // 1. High-Fidelity Visual Mode: Full-bleed slide image
      const base64Data = imgObj.dataUrl.replace(/^data:image\/(png|jpeg);base64,/, '');
      zip.folder('ppt/media').file(`image${i}.png`, base64Data, { base64: true });

      imageRelXml = `<Relationship Id="rIdImg${i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${i}.png"/>`;

      slideShapesXml = `
      <p:pic>
        <p:nvPicPr>
          <p:cNvPr id="${shapeId++}" name="Slide Image ${i}"/>
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
    } else if (isStructured) {
      // 2. Editable Mode: 2D Structured Layout with native shapes & tables
      const page = inputOrTexts.pages[i - 1];

      if (!page || !page.hasText) {
        // Scanned / Image-only slide notice
        slideShapesXml = `
          <p:sp>
            <p:nvSpPr>
              <p:cNvPr id="${shapeId++}" name="Scanned Notice"/>
              <p:cNvSpPr txBox="1"/>
              <p:nvPr/>
            </p:nvSpPr>
            <p:spPr>
              <a:xfrm><a:off x="635000" y="635000"/><a:ext cx="${slideWidth - 1270000}" cy="1270000"/></a:xfrm>
              <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
              <a:solidFill><a:srgbClr val="FEF3C7"/></a:solidFill>
              <a:ln w="12700"><a:solidFill><a:srgbClr val="F59E0B"/></a:solidFill></a:ln>
            </p:spPr>
            <p:txBody>
              <a:bodyPr lIns="182880" tIns="182880" rIns="182880" bIns="182880"/>
              <a:lstStyle/>
              <a:p>
                <a:r>
                  <a:rPr lang="en-US" sz="1600" b="1">
                    <a:solidFill><a:srgbClr val="B45309"/></a:solidFill>
                    <a:latin typeface="Calibri"/>
                  </a:rPr>
                  <a:t>Notice: Scanned / Image-Only Slide</a:t>
                </a:r>
              </a:p>
              <a:p>
                <a:r>
                  <a:rPr lang="en-US" sz="1300">
                    <a:solidFill><a:srgbClr val="475569"/></a:solidFill>
                    <a:latin typeface="Calibri"/>
                  </a:rPr>
                  <a:t>This page contains scanned imagery without an embedded text layer. Optical Character Recognition (OCR) is required to convert image text into editable PowerPoint text boxes.</a:t>
                </a:r>
              </a:p>
            </p:txBody>
          </p:sp>
        `;
      } else if (page.hasTable) {
        // Native DrawingML Table Slide
        const titleRows = page.gridRows.filter(r => r.type === 'heading');
        const tableRows = page.gridRows.filter(r => r.type === 'table_row');
        const noteRows = page.gridRows.filter(r => r.type === 'paragraph');

        // Title Box
        if (titleRows.length > 0) {
          const titleText = titleRows.map(r => r.text).join(' ');
          slideShapesXml += `
            <p:sp>
              <p:nvSpPr>
                <p:cNvPr id="${shapeId++}" name="Slide Title ${i}"/>
                <p:cNvSpPr txBox="1"/>
                <p:nvPr/>
              </p:nvSpPr>
              <p:spPr>
                <a:xfrm><a:off x="635000" y="500000"/><a:ext cx="${slideWidth - 1270000}" cy="800000"/></a:xfrm>
                <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                <a:noFill/>
              </p:spPr>
              <p:txBody>
                <a:bodyPr wrap="square" rtlCol="0"><a:spAutoFit/></a:bodyPr>
                <a:lstStyle/>
                <a:p>
                  <a:r>
                    <a:rPr lang="en-US" sz="2200" b="1">
                      <a:solidFill><a:srgbClr val="0F172A"/></a:solidFill>
                      <a:latin typeface="Calibri"/>
                    </a:rPr>
                    <a:t>${escapeXml(titleText)}</a:t>
                  </a:r>
                </a:p>
              </p:txBody>
            </p:sp>
          `;
        }

        // Native Table Frame
        if (tableRows.length > 0) {
          const colCount = page.colCount;
          const tableWidthEmu = slideWidth - 1270000;
          const colWidthEmu = Math.round(tableWidthEmu / colCount);
          const rowHeightEmu = 400000;
          const tableTopEmu = titleRows.length > 0 ? 1500000 : 800000;

          const trXml = tableRows.map((tr, rIdx) => {
            const isHdr = tr.isHeader;
            const tcXml = tr.rowCells.map(val => `
              <a:tc>
                <a:txBody>
                  <a:bodyPr lIns="91440" tIns="91440" rIns="91440" bIns="91440"/>
                  <a:lstStyle/>
                  <a:p>
                    <a:pPr algn="${isHdr ? 'ctr' : 'l'}"/>
                    <a:r>
                      <a:rPr lang="en-US" sz="1300" b="${isHdr ? '1' : '0'}">
                        <a:solidFill><a:srgbClr val="${isHdr ? '1E293B' : '334155'}"/></a:solidFill>
                        <a:latin typeface="Calibri"/>
                      </a:rPr>
                      <a:t>${escapeXml(val)}</a:t>
                    </a:r>
                  </a:p>
                </a:txBody>
                <a:tcPr>
                  ${isHdr ? '<a:solidFill><a:srgbClr val="F1F5F9"/></a:solidFill>' : ''}
                  <a:lnL w="12700"><a:solidFill><a:srgbClr val="CBD5E1"/></a:solidFill></a:lnL>
                  <a:lnR w="12700"><a:solidFill><a:srgbClr val="CBD5E1"/></a:solidFill></a:lnR>
                  <a:lnT w="12700"><a:solidFill><a:srgbClr val="CBD5E1"/></a:solidFill></a:lnT>
                  <a:lnB w="12700"><a:solidFill><a:srgbClr val="CBD5E1"/></a:solidFill></a:lnB>
                </a:tcPr>
              </a:tc>
            `).join('');

            return `<a:tr h="${rowHeightEmu}">${tcXml}</a:tr>`;
          }).join('');

          slideShapesXml += `
            <p:graphicFrame>
              <p:nvGraphicFramePr>
                <p:cNvPr id="${shapeId++}" name="Table ${i}"/>
                <p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr>
                <p:nvPr/>
              </p:nvGraphicFramePr>
              <p:xfrm>
                <a:off x="635000" y="${tableTopEmu}"/>
                <a:ext cx="${tableWidthEmu}" cy="${rowHeightEmu * tableRows.length}"/>
              </p:xfrm>
              <a:graphic>
                <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table">
                  <a:tbl>
                    <a:tblPr firstRow="1" bandRow="1">
                      <a:tableStyleId>{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}</a:tableStyleId>
                    </a:tblPr>
                    <a:tblGrid>
                      ${new Array(colCount).fill(`<a:gridCol w="${colWidthEmu}"/>`).join('')}
                    </a:tblGrid>
                    ${trXml}
                  </a:tbl>
                </a:graphicData>
              </a:graphic>
            </p:graphicFrame>
          `;
        }

        // Notes Box below Table
        if (noteRows.length > 0) {
          const noteText = noteRows.map(r => r.text).join(' ');
          const noteTopEmu = 1500000 + (400000 * tableRows.length) + 250000;
          slideShapesXml += `
            <p:sp>
              <p:nvSpPr>
                <p:cNvPr id="${shapeId++}" name="Notes ${i}"/>
                <p:cNvSpPr txBox="1"/>
                <p:nvPr/>
              </p:nvSpPr>
              <p:spPr>
                <a:xfrm><a:off x="635000" y="${noteTopEmu}"/><a:ext cx="${slideWidth - 1270000}" cy="500000"/></a:xfrm>
                <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                <a:noFill/>
              </p:spPr>
              <p:txBody>
                <a:bodyPr wrap="square" rtlCol="0"><a:spAutoFit/></a:bodyPr>
                <a:lstStyle/>
                <a:p>
                  <a:r>
                    <a:rPr lang="en-US" sz="1300">
                      <a:solidFill><a:srgbClr val="475569"/></a:solidFill>
                      <a:latin typeface="Calibri"/>
                    </a:rPr>
                    <a:t>${escapeXml(noteText)}</a:t>
                  </a:r>
                </a:p>
              </p:txBody>
            </p:sp>
          `;
        }
      } else {
        // Standard Text Slide: Group into paragraphs / blocks
        const blocks = [];
        let curBlock = null;

        page.gridRows.forEach(item => {
          if (!curBlock) {
            curBlock = {
              type: item.type,
              fontSize: item.fontSize || 12,
              isBold: item.isBold,
              topY: item.y,
              bottomY: item.y,
              lines: [item]
            };
          } else {
            const sameType = curBlock.type === item.type;
            const yDist = Math.abs(curBlock.bottomY - item.y);
            if (sameType && yDist <= (item.fontSize || 12) * 2.8) {
              curBlock.lines.push(item);
              curBlock.bottomY = item.y;
            } else {
              blocks.push(curBlock);
              curBlock = {
                type: item.type,
                fontSize: item.fontSize || 12,
                isBold: item.isBold,
                topY: item.y,
                bottomY: item.y,
                lines: [item]
              };
            }
          }
        });
        if (curBlock) blocks.push(curBlock);

        blocks.forEach((blk, bIdx) => {
          const isHeading = blk.type === 'heading';
          const fontSizeHundreths = Math.round(Math.min(48, Math.max(10, blk.fontSize || 12)) * 100);
          const colorHex = isHeading ? '0F172A' : '334155';
          const isB = blk.isBold || isHeading;

          const topEmu = Math.max(0, Math.round((page.pageHeight - blk.topY - (blk.fontSize || 12)) * 12700));
          const heightEmu = Math.max(450000, Math.round(((blk.topY - blk.bottomY) + (blk.fontSize || 12) + 12) * 12700));
          const widthEmu = slideWidth - 1270000;

          const pXml = blk.lines.map(line => `
            <a:p>
              <a:r>
                <a:rPr lang="en-US" sz="${fontSizeHundreths}" b="${isB ? '1' : '0'}">
                  <a:solidFill><a:srgbClr val="${colorHex}"/></a:solidFill>
                  <a:latin typeface="Calibri"/>
                </a:rPr>
                <a:t>${escapeXml(line.text)}</a:t>
              </a:r>
            </a:p>
          `).join('');

          slideShapesXml += `
            <p:sp>
              <p:nvSpPr>
                <p:cNvPr id="${shapeId++}" name="TextBlock ${bIdx + 1}"/>
                <p:cNvSpPr txBox="1"/>
                <p:nvPr/>
              </p:nvSpPr>
              <p:spPr>
                <a:xfrm><a:off x="635000" y="${topEmu}"/><a:ext cx="${widthEmu}" cy="${heightEmu}"/></a:xfrm>
                <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                <a:noFill/>
              </p:spPr>
              <p:txBody>
                <a:bodyPr wrap="square" rtlCol="0"><a:spAutoFit/></a:bodyPr>
                <a:lstStyle/>
                ${pXml}
              </p:txBody>
            </p:sp>
          `;
        });
      }
    } else {
      // 3. Fallback text frame for legacy string input
      const slideText = (Array.isArray(inputOrTexts) ? inputOrTexts[i - 1] : '') || '';
      if (slideText.trim()) {
        const lines = slideText.split('\n').filter(l => l.trim()).slice(0, 15);
        const textParagraphs = lines.map(line => 
          `<a:p><a:r><a:rPr lang="en-US" sz="1800"/><a:t>${escapeXml(line)}</a:t></a:r></a:p>`
        ).join('');

        slideShapesXml = `
        <p:sp>
          <p:nvSpPr><p:cNvPr id="${shapeId++}" name="Text Content"/><p:cSpPr/><p:nvPr/></p:nvSpPr>
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

  // Mandatory OpenXML PresentationML Structural Files
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
    <p:spTree>${groupTransformXml}</p:spTree>
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
    <p:spTree>${groupTransformXml}</p:spTree>
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

  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  });
}

/**
 * High-level PDF to Microsoft PowerPoint (.pptx) converter
 * Supports:
 * - 'editable' mode: extracts 2D text coordinates, font hierarchy, and tables into native PowerPoint text shapes and tables.
 * - 'visual' mode: renders high-fidelity visual slides preserving 100% of charts, drawings, and images.
 */
export async function pdfToPptx(file, conversionMode = 'editable', onProgress) {
  if (!file || file.size === 0) {
    throw new Error('Please select a valid, non-empty PDF document.');
  }

  let arrayBuffer;
  try {
    arrayBuffer = await file.arrayBuffer();
  } catch (err) {
    throw new Error('Failed to read file data: ' + err.message);
  }

  // Verify valid PDF header
  const headerBytes = new Uint8Array(arrayBuffer.slice(0, 5));
  const headerStr = String.fromCharCode(...headerBytes);
  if (!headerStr.startsWith('%PDF-')) {
    throw new Error('Invalid file format. The uploaded file is not a valid PDF document.');
  }

  let loadingTask;
  let pdf;
  try {
    loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    pdf = await loadingTask.promise;
  } catch (err) {
    if (err && err.name === 'PasswordException') {
      throw new Error('This PDF is password-protected. Please unlock or remove password protection first.');
    }
    throw new Error('Unable to open PDF document: ' + (err.message || 'File may be corrupted.'));
  }

  const numPages = pdf.numPages;
  if (numPages === 0) {
    throw new Error('This PDF document contains no pages.');
  }

  if (onProgress) onProgress(20);

  if (conversionMode === 'visual') {
    // High-Fidelity Visual Mode: Render high-res slide images
    const images = await renderPdfToPngs(file, (p) => {
      if (onProgress) onProgress(20 + Math.round(p * 0.6));
    });
    const blob = await createPptxFile(null, images, file?.name || 'Presentation', 'visual');
    if (onProgress) onProgress(100);
    return {
      blob,
      mode: 'visual',
      isScannedOnly: false,
      hasScannedSlides: true,
      pageCount: images.length,
      tableDetected: false
    };
  }

  // Editable Mode: 2D coordinate extraction of text blocks, hierarchy, and tables
  const structured = await extractStructuredPdfPages(file, (p) => {
    if (onProgress) onProgress(20 + Math.round(p * 0.5));
  });

  let images = null;
  let hasScanned = structured.isScannedOnly;

  // If document has no extractable text layer (scanned/image-only), render visual images so no content is lost!
  if (structured.isScannedOnly) {
    try {
      images = await renderPdfToPngs(file, (p) => {
        if (onProgress) onProgress(70 + Math.round(p * 0.2));
      });
      hasScanned = true;
    } catch (err) {
      console.warn('[pdfToPptx] Visual rendering fallback notice:', err);
    }
  }

  if (onProgress) onProgress(85);

  const blob = await createPptxFile(structured, images, file?.name || 'Presentation', structured.isScannedOnly ? 'visual' : 'editable');
  if (onProgress) onProgress(100);

  return {
    blob,
    mode: structured.isScannedOnly ? 'visual' : 'editable',
    isScannedOnly: structured.isScannedOnly,
    hasScannedSlides: hasScanned,
    pageCount: structured.numPages,
    tableDetected: structured.pages.some(p => p.hasTable)
  };
}

/**
 * Generate a rich multi-sheet Microsoft Excel (.xlsx) workbook from structured PDF data
 * Auto-aligns 2D coordinate table columns and sets dynamic column widths
 */
export function generateExcelWorkbook(structuredData, documentTitle = 'Spreadsheet') {
  const workbook = XLSX.utils.book_new();

  if (structuredData.isScannedOnly) {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Notice: Scanned / Image-Only Document'],
      ['This PDF contains scanned images without an extractable text layer.'],
      ['Optical Character Recognition (OCR) is required to convert image text into spreadsheet data.']
    ]);
    XLSX.utils.book_append_sheet(workbook, ws, 'Notice');
    return workbook;
  }

  structuredData.pages.forEach((page, pIdx) => {
    const sheetData = [];
    const maxCols = page.colCount;
    const colWidths = new Array(maxCols).fill(10);

    page.gridRows.forEach(item => {
      const row = item.rowCells;
      sheetData.push(row);
      row.forEach((cellVal, colIdx) => {
        const len = String(cellVal || '').length;
        if (len > (colWidths[colIdx] || 10)) {
          colWidths[colIdx] = Math.min(len + 3, 50);
        }
      });
    });

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    worksheet['!cols'] = colWidths.map(w => ({ wch: w }));

    const sheetName = structuredData.numPages === 1 ? 'Sheet1' : `Page ${pIdx + 1}`;
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });

  return workbook;
}

/**
 * High-level PDF to Microsoft Excel (.xlsx) converter
 */
export async function pdfToExcel(file, onProgress) {
  const structured = await extractStructuredPdfPages(file, (p) => {
    if (onProgress) onProgress(Math.round(p * 0.7));
  });

  const workbook = generateExcelWorkbook(structured, file?.name || 'Spreadsheet');
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  if (onProgress) onProgress(100);

  return {
    blob,
    isScannedOnly: structured.isScannedOnly,
    pageCount: structured.numPages,
    tableDetected: structured.pages.some(p => p.hasTable)
  };
}

/**
 * Generate a real Microsoft Excel (.xlsx) workbook file containing detected tabular data
 */
export function createExcelFile(input, documentTitle = 'Spreadsheet') {
  if (input && typeof input === 'object' && input.pages) {
    const workbook = generateExcelWorkbook(input, documentTitle);
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  const text = String(input || '');
  const lines = text.split('\n');
  const rows = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return [''];
    return trimmed.split(/\s{2,}|\t/);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const maxCols = Math.max(...rows.map(r => r.length), 1);
  const colWidths = new Array(maxCols).fill(12);
  rows.forEach(r => {
    r.forEach((val, i) => {
      const len = String(val || '').length;
      if (len > colWidths[i]) colWidths[i] = Math.min(len + 3, 50);
    });
  });
  worksheet['!cols'] = colWidths.map(w => ({ wch: w }));

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
