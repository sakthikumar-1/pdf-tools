/**
 * Centralized API Service for Simatrix Academy PDF Tools.
 * Communicates exclusively with the Python Django Ninja REST backend (/api/v1).
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

/**
 * Checks server backend health and MySQL database connectivity.
 * @returns {Promise<boolean>}
 */
export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === 'healthy';
  } catch (err) {
    return false;
  }
}

/**
 * Fetches server capabilities from the Python backend.
 * @returns {Promise<Object>}
 */
export async function fetchServerCapabilities() {
  try {
    const res = await fetch(`${API_BASE_URL}/capabilities`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.log('[API Service] Capabilities endpoint unreachable, using client defaults.');
  }

  return {
    status: 'ok',
    engines: {
      pymupdf: true,
      pdf2docx: true,
      aes256_encryption: true,
      image_rasterizer: true,
      client_vector_engine: true,
    },
    tools: {
      'pdf-to-word': { available: true, engine: 'Python pdf2docx Engine', status: 'AVAILABLE' },
      'protect-pdf': { available: true, engine: 'PyMuPDF 256-bit AES Engine', status: 'AVAILABLE' },
      'pdf-to-jpg': { available: true, engine: 'PyMuPDF High-DPI Engine', status: 'AVAILABLE' },
    },
  };
}

/**
 * Converts a PDF to Microsoft Word using the Python Django backend.
 * @param {File} file
 * @param {Function} onProgress
 * @returns {Promise<{ blob: Blob, filename: string, isScanned: boolean, pageCount: number }>}
 */
export async function convertPdfToWordPython(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);

  const xhr = new XMLHttpRequest();
  const url = `${API_BASE_URL}/convert/pdf-to-word`;

  const data = await new Promise((resolve, reject) => {
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 60);
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (err) {
          reject(new Error('Invalid response from Python conversion engine.'));
        }
      } else {
        try {
          const errData = JSON.parse(xhr.responseText);
          reject(new Error(errData.detail || errData.message || `Server error: ${xhr.status}`));
        } catch (e) {
          reject(new Error(`Server error: ${xhr.status} ${xhr.statusText}`));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Unable to connect to Python conversion backend.'));
    });

    xhr.open('POST', url, true);
    xhr.send(formData);
  });

  if (onProgress) onProgress(80);

  const downloadRes = await fetch(data.download_url);
  if (!downloadRes.ok) {
    throw new Error('Failed to retrieve converted DOCX file from server.');
  }

  const blob = await downloadRes.blob();
  if (onProgress) onProgress(100);

  return {
    blob,
    filename: data.filename || `${file.name.replace(/\.[^/.]+$/, '')}_converted.docx`,
    isScanned: Boolean(data.is_scanned),
    pageCount: data.page_count || 1,
  };
}

/**
 * Encrypts a PDF document with strong 256-bit AES password encryption using Python PyMuPDF.
 * @param {File} file
 * @param {string} password
 * @param {Function} onProgress
 * @returns {Promise<{ blob: Blob, filename: string, pageCount: number }>}
 */
export async function protectPdfPython(file, password, onProgress) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('password', password);

  const xhr = new XMLHttpRequest();
  const url = `${API_BASE_URL}/security/protect-pdf`;

  const data = await new Promise((resolve, reject) => {
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 60);
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (err) {
          reject(new Error('Invalid response from Python protection engine.'));
        }
      } else {
        try {
          const errData = JSON.parse(xhr.responseText);
          reject(new Error(errData.detail || errData.message || `Server error: ${xhr.status}`));
        } catch (e) {
          reject(new Error(`Server error: ${xhr.status} ${xhr.statusText}`));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Unable to connect to Python security backend.'));
    });

    xhr.open('POST', url, true);
    xhr.send(formData);
  });

  if (onProgress) onProgress(80);

  const downloadRes = await fetch(data.download_url);
  if (!downloadRes.ok) {
    throw new Error('Failed to retrieve protected PDF from server.');
  }

  const blob = await downloadRes.blob();
  if (onProgress) onProgress(100);

  return {
    blob,
    filename: data.filename || `${file.name.replace(/\.[^/.]+$/, '')}_protected.pdf`,
    pageCount: data.page_count || 1,
  };
}

/**
 * Converts a PDF to high-resolution JPG images using Python PyMuPDF.
 * @param {File} file
 * @param {number} dpi (default 150)
 * @param {Function} onProgress
 * @returns {Promise<{ success: boolean, isZip: boolean, downloadUrl: string, filename: string, images: Array, pageCount: number }>}
 */
export async function convertPdfToJpgPython(file, dpi = 150, onProgress) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('dpi', String(dpi));

  const xhr = new XMLHttpRequest();
  const url = `${API_BASE_URL}/convert/pdf-to-jpg`;

  const data = await new Promise((resolve, reject) => {
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 60);
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (err) {
          reject(new Error('Invalid response from Python image engine.'));
        }
      } else {
        try {
          const errData = JSON.parse(xhr.responseText);
          reject(new Error(errData.detail || errData.message || `Server error: ${xhr.status}`));
        } catch (e) {
          reject(new Error(`Server error: ${xhr.status} ${xhr.statusText}`));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Unable to connect to Python image backend.'));
    });

    xhr.open('POST', url, true);
    xhr.send(formData);
  });

  if (onProgress) onProgress(100);

  return {
    success: true,
    isZip: data.is_zip,
    downloadUrl: data.download_url,
    downloadToken: data.download_token,
    filename: data.filename,
    images: data.images || [],
    pageCount: data.page_count || 1,
  };
}

/**
 * Compatibility wrapper for PDF to JPG conversion.
 * Routes to Python convertPdfToJpgPython endpoint.
 */
export async function uploadAndConvertPdf(file, endpoint = '', onProgress) {
  return convertPdfToJpgPython(file, 150, onProgress);
}
