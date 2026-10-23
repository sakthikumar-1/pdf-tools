/**
 * Centralized API Service for Simatrix Academy PDF Tools.
 * Maps endpoints to backend PHP APIs or handles fallback execution.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Uploads a file to the PHP backend.
 * @param {File} file 
 * @param {string} endpoint 
 * @param {Function} onProgress 
 * @returns {Promise<Object>}
 */
export async function uploadAndConvertPdf(file, endpoint = '/pdf/pdf-to-jpg.php', onProgress) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('quality', 'high');

  try {
    const xhr = new XMLHttpRequest();
    const url = `${API_BASE_URL}${endpoint}`;

    const response = await new Promise((resolve, reject) => {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data);
          } catch (err) {
            reject(new Error('Invalid JSON response from server.'));
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText);
            reject(new Error(errorData.message || `Server error: ${xhr.status}`));
          } catch (e) {
            reject(new Error(`Server error: ${xhr.status} ${xhr.statusText}`));
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error. Unable to connect to server backend.'));
      });

      xhr.open('POST', url, true);
      xhr.send(formData);
    });

    return response;
  } catch (error) {
    console.warn('[API Service] Backend API request failed:', error.message);
    throw error;
  }
}

/**
 * Checks server backend status
 */
export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/health.php`);
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === 'ok';
  } catch (err) {
    return false;
  }
}

/**
 * Converts a PDF to Microsoft Word using the Python Django backend.
 * Streams the upload, tracks progress, and fetches the resulting DOCX via the secure download token.
 * @param {File} file
 * @param {Function} onProgress
 * @returns {Promise<{ blob: Blob, filename: string, isScanned: boolean, pageCount: number }>}
 */
export async function convertPdfToWordPython(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);

  const xhr = new XMLHttpRequest();
  const url = '/api/v1/convert/pdf-to-word';

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
          const json = JSON.parse(xhr.responseText);
          resolve(json);
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

  // Fetch the resulting DOCX from the secure download token URL
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

