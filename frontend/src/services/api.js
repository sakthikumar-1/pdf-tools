/**
 * Centralized API Service for Simatrix Academy PDF Tools.
 * Communicates exclusively with the Python Django Ninja REST backend (/api/v1).
 */

const rawApiBase = import.meta.env.VITE_API_BASE_URL || '';
export const API_BASE_URL = rawApiBase
  ? (rawApiBase.endsWith('/api/v1') ? rawApiBase : `${rawApiBase.replace(/\/$/, '')}/api/v1`)
  : '/api/v1';

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
 * Converts a PDF to Microsoft PowerPoint (.pptx) using the Python Django backend with PyMuPDF + python-pptx.
 * @param {File} file
 * @param {string} mode ('editable' | 'visual')
 * @param {Function} onProgress
 * @returns {Promise<{ blob: Blob, filename: string, isScanned: boolean, pageCount: number, mode: string }>}
 */
export async function convertPdfToPowerpointPython(file, mode = 'editable', onProgress) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mode', mode);

  const xhr = new XMLHttpRequest();
  const url = `${API_BASE_URL}/convert/pdf-to-powerpoint`;

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
          reject(new Error('Invalid response from Python PowerPoint engine.'));
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
    throw new Error('Failed to retrieve converted PPTX file from server.');
  }

  const blob = await downloadRes.blob();
  if (onProgress) onProgress(100);

  return {
    blob,
    filename: data.filename || `${file.name.replace(/\.[^/.]+$/, '')}_presentation.pptx`,
    isScanned: Boolean(data.is_scanned),
    pageCount: data.page_count || 1,
    mode: mode,
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

/**
 * Generic helper to execute Python utility tool endpoint with progress tracking and secure token download.
 */
async function executePythonUtility(url, formData, file, defaultSuffix, onProgress) {
  const xhr = new XMLHttpRequest();

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
          reject(new Error('Invalid JSON response from server utility engine.'));
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
      reject(new Error('Unable to connect to Python processing backend.'));
    });

    xhr.open('POST', url, true);
    xhr.send(formData);
  });

  if (onProgress) onProgress(80);

  const downloadRes = await fetch(data.download_url);
  if (!downloadRes.ok) {
    throw new Error('Failed to retrieve processed PDF from server.');
  }

  const blob = await downloadRes.blob();
  if (onProgress) onProgress(100);

  const baseName = file.name ? file.name.replace(/\.[^/.]+$/, '') : 'document';
  return {
    blob,
    filename: data.filename || `${baseName}_${defaultSuffix}.pdf`,
    pageCount: data.page_count || 1,
  };
}

/**
 * Adds page numbers to a PDF using Python PyMuPDF.
 */
export async function addPageNumbersPython(file, options = {}, onProgress) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('start_number', String(options.startNumber || 1));
  formData.append('format', options.format || 'Page {n}');
  formData.append('position', options.position || 'bottom-right');
  formData.append('font_size', String(options.fontSize || 11));
  formData.append('font_color', options.fontColor || '#334155');
  formData.append('margin_pt', String(options.marginPt || 36));
  formData.append('page_range', options.pageRange || 'all');

  return executePythonUtility(`${API_BASE_URL}/tools/add-page-numbers`, formData, file, 'numbered', onProgress);
}

/**
 * Watermarks a PDF using Python PyMuPDF.
 */
export async function watermarkPdfPython(file, options = {}, onProgress) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('text', options.text || 'CONFIDENTIAL');
  formData.append('opacity', String(options.opacity !== undefined ? options.opacity : 0.35));
  formData.append('rotation', String(options.rotation !== undefined ? options.rotation : 45));
  formData.append('font_size', String(options.fontSize || 48));
  formData.append('color', options.color || '#EF4444');
  formData.append('position', options.position || 'center');
  formData.append('page_range', options.pageRange || 'all');

  return executePythonUtility(`${API_BASE_URL}/tools/watermark`, formData, file, 'watermarked', onProgress);
}

/**
 * Crops a PDF using Python PyMuPDF.
 */
export async function cropPdfPython(file, options = {}, onProgress) {
  const formData = new FormData();
  formData.append('file', file);
  const margins = options.cropMargins || {};
  formData.append('top', String(margins.top !== undefined ? margins.top : (options.top || 36)));
  formData.append('bottom', String(margins.bottom !== undefined ? margins.bottom : (options.bottom || 36)));
  formData.append('left', String(margins.left !== undefined ? margins.left : (options.left || 36)));
  formData.append('right', String(margins.right !== undefined ? margins.right : (options.right || 36)));
  formData.append('page_range', options.pageRange || 'all');

  return executePythonUtility(`${API_BASE_URL}/tools/crop`, formData, file, 'cropped', onProgress);
}

/**
 * Updates PDF metadata properties using Python PyMuPDF.
 */
export async function editPdfMetadataPython(file, metadata = {}, onProgress) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', metadata.title || '');
  formData.append('author', metadata.author || '');
  formData.append('subject', metadata.subject || '');
  formData.append('keywords', metadata.keywords || '');

  return executePythonUtility(`${API_BASE_URL}/tools/metadata`, formData, file, 'updated_metadata', onProgress);
}

/**
 * Reorders PDF pages using Python PyMuPDF.
 */
export async function reorderPdfPagesPython(file, pageOrderArray, onProgress) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('page_order', JSON.stringify(pageOrderArray));

  return executePythonUtility(`${API_BASE_URL}/tools/reorder`, formData, file, 'reordered', onProgress);
}

/**
 * Generates an AI summary of a PDF document using the configured AI provider.
 * @param {File} file
 * @param {string} mode ('quick' | 'detailed' | 'key_points' | 'section_by_section')
 * @param {Function} onProgress
 * @returns {Promise<{
 *   success: boolean,
 *   mode: string,
 *   summary: string,
 *   pageCount: number,
 *   charCount: number,
 *   wordCount: number,
 *   estimatedReadingTimeMinutes: number,
 *   processingTimeMs: number,
 *   isChunked: boolean,
 *   warning?: string,
 *   provider: string,
 *   model: string
 * }>}
 */
export async function summarizePdf(file, mode = 'quick', onProgress) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mode', mode);

  const xhr = new XMLHttpRequest();
  const url = `${API_BASE_URL}/ai/summarize`;

  const data = await new Promise((resolve, reject) => {
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        // Upload occupies the first 40% of perceived progress
        const percent = Math.round((e.loaded / e.total) * 40);
        onProgress(percent, 'Uploading document...');
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (err) {
          reject(new Error('Invalid JSON response received from AI Summarizer backend.'));
        }
      } else {
        try {
          const errData = JSON.parse(xhr.responseText);
          const message = errData.detail || errData.message || `Server returned error ${xhr.status}`;
          reject(new Error(message));
        } catch (e) {
          reject(new Error(`Server error (${xhr.status}): ${xhr.statusText || 'Request failed'}`));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error: Unable to reach the AI Summarizer backend service.'));
    });

    xhr.addEventListener('timeout', () => {
      reject(new Error('Request timed out while waiting for AI document analysis.'));
    });

    // 90 second timeout for complex/long multi-chunk documents
    xhr.timeout = 90000;
    xhr.open('POST', url, true);
    xhr.send(formData);
  });

  if (onProgress) onProgress(100, 'Complete');

  return {
    success: data.success,
    mode: data.mode,
    summary: data.summary,
    pageCount: data.page_count,
    charCount: data.char_count,
    wordCount: data.word_count,
    estimatedReadingTimeMinutes: data.estimated_reading_time_minutes,
    processingTimeMs: data.processing_time_ms,
    isChunked: data.is_chunked,
    warning: data.warning,
    provider: data.provider,
    model: data.model,
  };
}



/**
 * Checks local Ollama runtime and llama3.2:3b model availability.
 * @returns {Promise<{ available: boolean, model: string, model_installed: boolean, base_url: string, error?: string }>}
 */
export async function checkOllamaStatus() {
  try {
    const res = await fetch(`${API_BASE_URL}/ai/ollama-status`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[API Service] Ollama status check failed:', err);
  }
  return {
    available: false,
    model: 'llama3.2:3b',
    model_installed: false,
    base_url: 'http://127.0.0.1:11434',
    error: 'Unable to reach backend service.'
  };
}

/**
 * Interprets a natural language instruction using local Ollama llama3.2:3b.
 * @param {string} instruction
 * @returns {Promise<{
 *   success: boolean,
 *   tool: string | null,
 *   requires_file: boolean,
 *   confidence: number,
 *   explanation: string,
 *   parameters: Object,
 *   is_supported: boolean,
 *   suggested_action: string | null,
 *   model: string
 * }>}
 */
export async function interpretAIIntent(instruction) {
  const payload = { instruction: (instruction || '').trim() };

  let res;
  try {
    res = await fetch(`${API_BASE_URL}/ai/interpret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (fetchErr) {
    try {
      res = await fetch('/api/ai/interpret/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      throw new Error('Unable to connect to AI service. Please verify backend and Ollama are running.');
    }
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const message = errData.detail || errData.message || `AI interpretation failed with status ${res.status}`;
    throw new Error(message);
  }

  return await res.json();
}

/**
 * Executes a confirmed AI tool operation for an uploaded PDF file.
 * @param {File} file
 * @param {string} tool
 * @param {Object} parameters
 * @param {Function} onProgress
 * @returns {Promise<{
 *   success: boolean,
 *   tool: string,
 *   filename: string,
 *   download_url: string,
 *   download_token: string,
 *   page_count: number,
 *   size_bytes: number,
 *   is_zip: boolean,
 *   images: Array,
 *   summary: Object,
 *   execution_time_ms: number
 * }>}
 */
export async function executeAITool(file, tool, parameters = {}, onProgress) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('tool', tool);
  formData.append('parameters', JSON.stringify(parameters));

  const xhr = new XMLHttpRequest();
  const url = `${API_BASE_URL}/ai/execute`;

  const data = await new Promise((resolve, reject) => {
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 40);
        onProgress(percent, 'Uploading document...');
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (err) {
          reject(new Error('Invalid response received from document execution engine.'));
        }
      } else {
        try {
          const errData = JSON.parse(xhr.responseText);
          const message = errData.detail || errData.message || `Server returned error ${xhr.status}`;
          reject(new Error(message));
        } catch (e) {
          reject(new Error(`Server error (${xhr.status}): ${xhr.statusText || 'Execution failed'}`));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error: Unable to connect to PDF processing backend.'));
    });

    xhr.addEventListener('timeout', () => {
      reject(new Error('Request timed out while executing document operation.'));
    });

    xhr.timeout = 120000;
    xhr.open('POST', url, true);
    xhr.send(formData);
  });

  if (onProgress) onProgress(100, 'Processing complete');
  return data;
}
