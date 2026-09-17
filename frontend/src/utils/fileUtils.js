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

  const nameLower = file.name.toLowerCase();
  const isImageAccept = acceptType.includes('image') || acceptType.includes('.jpg') || acceptType.includes('.png');

  if (isImageAccept) {
    const isImageExt = nameLower.endsWith('.jpg') || nameLower.endsWith('.jpeg') || nameLower.endsWith('.png') || nameLower.endsWith('.webp') || nameLower.endsWith('.pdf');
    const isImageMime = file.type.startsWith('image/') || file.type === 'application/pdf' || file.type === '';
    if (!isImageExt && !isImageMime) {
      return { valid: false, error: 'Invalid file type. Please select a valid image (JPG, PNG, WebP) file.' };
    }
  } else {
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

/**
 * Triggers a browser file download for a given Blob or Data URL.
 * @param {Blob|string} content 
 * @param {string} filename 
 */
export function downloadFile(content, filename) {
  const link = document.createElement('a');
  let url = '';

  if (typeof content === 'string') {
    url = content;
  } else if (content instanceof Blob) {
    url = URL.createObjectURL(content);
  }

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  if (content instanceof Blob) {
    setTimeout(() => URL.revokeObjectURL(url), 120000);
  }
}
