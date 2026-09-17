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
