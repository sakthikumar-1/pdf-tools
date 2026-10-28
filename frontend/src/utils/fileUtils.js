/**
 * Validates if a file is valid based on expected file types.
 * @param {File} file 
 * @param {string} acceptType 
 * @returns {{ valid: boolean, error?: string }}
 */
export function validatePdfFile(file, acceptType = '.pdf') {
  if (!file) {
    return { valid: false, error: 'Please select a file to upload.' };
  }

  const nameLower = file.name ? file.name.toLowerCase() : '';
  const isImageAccept = acceptType.includes('image') || acceptType.includes('.jpg') || acceptType.includes('.png') || acceptType.includes('.webp');

  if (isImageAccept) {
    // Images to PDF: strictly accept ONLY images, reject PDFs!
    if (nameLower.endsWith('.pdf') || file.type === 'application/pdf') {
      return { 
        valid: false, 
        error: 'PDF files are not allowed here. Images to PDF accepts only image files (JPG, PNG, WebP).' 
      };
    }
    const isImageExt = nameLower.endsWith('.jpg') || nameLower.endsWith('.jpeg') || nameLower.endsWith('.png') || nameLower.endsWith('.webp') || nameLower.endsWith('.bmp');
    const isImageMime = file.type && file.type.startsWith('image/');
    if (!isImageExt && !isImageMime) {
      return { 
        valid: false, 
        error: 'Invalid file type. Please select a valid image (JPG, PNG, WebP) file.' 
      };
    }
  } else {
    // PDF tools: strictly accept ONLY PDF files, reject images!
    const isImageFile = nameLower.endsWith('.jpg') || nameLower.endsWith('.jpeg') || nameLower.endsWith('.png') || nameLower.endsWith('.webp') || (file.type && file.type.startsWith('image/'));
    if (isImageFile) {
      return { 
        valid: false, 
        error: 'Image files are not supported for this tool. Please upload a valid PDF document (or use the Images to PDF tool).' 
      };
    }
    const isPdfExtension = nameLower.endsWith('.pdf');
    const isPdfMime = file.type === 'application/pdf' || file.type === '';
    if (!isPdfExtension && !isPdfMime) {
      return { valid: false, error: 'Invalid file type. Please select a valid PDF file.' };
    }
  }

  // Max size limit: 50MB
  const MAX_SIZE_MB = 50;
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return { valid: false, error: `File size exceeds maximum limit of ${MAX_SIZE_MB}MB.` };
  }

  return { valid: true };
}

import { addHistoryItem } from './historyManager.js';

/**
 * Triggers a browser file download for a given Blob or Data URL and logs to history.
 * @param {Blob|string} content 
 * @param {string} filename 
 * @param {string} [toolName] - Optional name of the tool creating this download
 */
export function downloadFile(content, filename, toolName) {
  const link = document.createElement('a');
  let url = '';
  let fileSize = 0;

  if (typeof content === 'string') {
    url = content;
  } else if (content instanceof Blob) {
    url = URL.createObjectURL(content);
    fileSize = content.size;
  }

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Auto-record to user's history
  try {
    let resolvedToolName = toolName;
    if (!resolvedToolName) {
      // Derive tool from filename or active pathname
      const path = typeof window !== 'undefined' ? window.location.pathname.replace('/', '') : '';
      if (path.includes('reorder')) resolvedToolName = 'Reorder PDF';
      else if (path.includes('remove')) resolvedToolName = 'Remove Pages';
      else if (path.includes('crop')) resolvedToolName = 'Crop PDF';
      else if (path.includes('merge')) resolvedToolName = 'Merge PDF';
      else if (path.includes('split')) resolvedToolName = 'Split PDF';
      else if (path.includes('compress')) resolvedToolName = 'Compress PDF';
      else if (path.includes('word')) resolvedToolName = 'PDF to Word';
      else if (path.includes('jpg')) resolvedToolName = 'PDF to JPG';
      else if (path.includes('protect')) resolvedToolName = 'Protect PDF';
      else if (path.includes('watermark')) resolvedToolName = 'Watermark PDF';
      else resolvedToolName = 'PDF Utility';
    }

    addHistoryItem({
      fileName: filename,
      fileSize: fileSize,
      toolName: resolvedToolName,
      status: 'Completed'
    });
  } catch (e) {
    console.warn('[downloadFile] History record error:', e);
  }

  if (content instanceof Blob) {
    setTimeout(() => URL.revokeObjectURL(url), 120000);
  }
}

/**
 * Formats a byte number into human-readable string (e.g. 1.2 MB).
 * @param {number} bytes 
 * @param {number} decimals 
 * @returns {string}
 */
export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

