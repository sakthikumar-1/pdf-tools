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
  xhr.timeout = 25000;

  const data = await new Promise((resolve, reject) => {
    xhr.ontimeout = () => {
      reject(new Error('Backend processing timed out. Falling back to Instant In-Browser Engine.'));
    };

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
 * Helper to retrieve stored auth token from localStorage.
 */
function getStoredAuthToken() {
  try {
    return localStorage.getItem('simatrix_auth_token') || localStorage.getItem('token') || '';
  } catch (e) {
    return '';
  }
}

/**
 * Generates an AI summary of a PDF document using the configured AI provider.
 * Supports explicit consent, user session auth, and two-phase quota settlement.
 * @param {File} file
 * @param {string} mode ('quick' | 'detailed' | 'key_points' | 'section_by_section')
 * @param {Function} onProgress
 * @param {Object} options ({ consent: boolean, idempotencyKey: string })
 * @returns {Promise<Object>}
 */
export async function summarizePdf(file, mode = 'quick', onProgress, options = {}) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mode', mode);

  if (options.consent !== false) {
    formData.append('consent', 'true');
  }
  if (options.idempotencyKey) {
    formData.append('idempotency_key', options.idempotencyKey);
  }

  const xhr = new XMLHttpRequest();
  const url = `${API_BASE_URL}/ai/summarize`;

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
          reject(new Error('Invalid JSON response received from AI Summarizer backend.'));
        }
      } else {
        try {
          const errData = JSON.parse(xhr.responseText);
          const message = errData.message || errData.detail || `Server returned error ${xhr.status}`;
          const err = new Error(message);
          err.code = errData.code;
          err.quota = errData.quota;
          reject(err);
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

    xhr.timeout = 90000;
    xhr.open('POST', url, true);

    const token = getStoredAuthToken();
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    if (options.consent !== false) {
      xhr.setRequestHeader('X-Simatrix-AI-Consent', 'true');
    }
    if (options.idempotencyKey) {
      xhr.setRequestHeader('X-Simatrix-Idempotency-Key', options.idempotencyKey);
    }

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
    quota: data.quota,
    isDemo: data.is_demo,
    quotaDeducted: data.quota_deducted,
    status: data.status
  };
}

/**
 * Signs a PDF document by stamping electronic signatures onto pages using the Python Django backend.
 * @param {File} file
 * @param {Array} signatures
 * @param {Function} onProgress
 * @returns {Promise<{ blob: Blob, filename: string, pageCount: number, sizeBytes: number }>}
 */
export async function signPdfPython(file, signatures, onProgress) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('signatures', JSON.stringify(signatures));

  const xhr = new XMLHttpRequest();
  const url = `${API_BASE_URL}/tools/sign-pdf`;

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
          reject(new Error('Invalid response from signing engine.'));
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
      reject(new Error('Unable to connect to Python signing backend.'));
    });

    xhr.open('POST', url, true);
    xhr.send(formData);
  });

  if (onProgress) onProgress(80);

  const downloadRes = await fetch(data.download_url);
  if (!downloadRes.ok) {
    throw new Error('Failed to retrieve signed PDF file from server.');
  }

  const blob = await downloadRes.blob();
  if (onProgress) onProgress(100);

  return {
    blob,
    filename: data.filename || `${file.name.replace(/\.[^/.]+$/, '')}_signed.pdf`,
    pageCount: data.page_count || 1,
    sizeBytes: data.size_bytes || blob.size,
  };
}


// ==============================================================================
// SIMATRIX AI DOCUMENT SUITE CLIENT SERVICES (PHASE 4)
// ==============================================================================

/**
 * Fetches account AI usage quota and remaining credits.
 * @returns {Promise<{ success: boolean, total_allowed: number, used_count: number, remaining: number, is_blocked: boolean, consent_given: boolean } | null>}
 */
export async function fetchAIQuota() {
  const token = getStoredAuthToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/ai/quota`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('[API Service] Failed to fetch AI quota:', err);
    return null;
  }
}

/**
 * Ask PDF (AI Chat with PDF) with grounded BM25 chunk retrieval and multi-turn sessions.
 * @param {Object} params
 * @param {File} [params.file]
 * @param {string} [params.sessionId]
 * @param {string} params.query
 * @param {boolean} [params.consent=true]
 * @param {string} [params.idempotencyKey]
 * @param {Function} [params.onProgress]
 * @returns {Promise<Object>}
 */
export async function chatPdfAI({
  file,
  sessionId,
  query,
  consent = true,
  idempotencyKey,
  onProgress
}) {
  const formData = new FormData();
  if (file) formData.append('file', file);
  if (sessionId) formData.append('session_id', sessionId);
  formData.append('query', query);
  if (consent !== false) formData.append('consent', 'true');
  if (idempotencyKey) formData.append('idempotency_key', idempotencyKey);

  const xhr = new XMLHttpRequest();
  const url = `${API_BASE_URL}/ai/chat-pdf`;

  const data = await new Promise((resolve, reject) => {
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 40);
        onProgress(percent, 'Analyzing document context...');
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (err) {
          reject(new Error('Invalid response from Ask PDF engine.'));
        }
      } else {
        try {
          const errData = JSON.parse(xhr.responseText);
          const message = errData.message || errData.detail || `Server returned error ${xhr.status}`;
          const err = new Error(message);
          err.code = errData.code;
          err.quota = errData.quota;
          reject(err);
        } catch (e) {
          reject(new Error(`Server error (${xhr.status}): ${xhr.statusText}`));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error: Unable to reach Ask PDF service.'));
    });

    xhr.timeout = 90000;
    xhr.open('POST', url, true);

    const token = getStoredAuthToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    if (consent !== false) xhr.setRequestHeader('X-Simatrix-AI-Consent', 'true');
    if (idempotencyKey) xhr.setRequestHeader('X-Simatrix-Idempotency-Key', idempotencyKey);

    xhr.send(formData);
  });

  if (onProgress) onProgress(100, 'Complete');

  return {
    success: data.success,
    sessionId: data.session_id,
    query: data.query,
    answer: data.answer,
    citedPages: data.cited_pages || [],
    isGrounded: data.is_grounded,
    pageCount: data.page_count,
    processingTimeMs: data.processing_time_ms,
    provider: data.provider,
    model: data.model,
    quota: data.quota,
    isDemo: data.is_demo,
    quotaDeducted: data.quota_deducted,
    status: data.status
  };
}

/**
 * Retrieves conversational history and metadata for an Ask PDF session.
 * @param {string} sessionId
 * @returns {Promise<Object>}
 */
export async function getAIChatSession(sessionId) {
  const token = getStoredAuthToken();
  const res = await fetch(`${API_BASE_URL}/ai/chat-pdf/session/${sessionId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `Failed to fetch session (${res.status})`);
  }
  return await res.json();
}

/**
 * Deletes an active Ask PDF session and purges stored chunk data.
 * @param {string} sessionId
 * @returns {Promise<boolean>}
 */
export async function deleteAIChatSession(sessionId) {
  const token = getStoredAuthToken();
  const res = await fetch(`${API_BASE_URL}/ai/chat-pdf/session/${sessionId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  return res.ok;
}

/**
 * Translates a PDF document into target language with DOCX export.
 * @param {Object} params
 * @param {File} params.file
 * @param {string} [params.targetLanguage='tamil']
 * @param {boolean} [params.consent=true]
 * @param {string} [params.idempotencyKey]
 * @param {Function} [params.onProgress]
 * @returns {Promise<Object>}
 */
export async function translatePdfAI({
  file,
  targetLanguage = 'tamil',
  consent = true,
  idempotencyKey,
  onProgress
}) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('target_language', targetLanguage);
  if (consent !== false) formData.append('consent', 'true');
  if (idempotencyKey) formData.append('idempotency_key', idempotencyKey);

  const xhr = new XMLHttpRequest();
  const url = `${API_BASE_URL}/ai/translate`;

  const data = await new Promise((resolve, reject) => {
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 50);
        onProgress(percent, 'Translating document text...');
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (err) {
          reject(new Error('Invalid response from PDF Translator engine.'));
        }
      } else {
        try {
          const errData = JSON.parse(xhr.responseText);
          const message = errData.message || errData.detail || `Server returned error ${xhr.status}`;
          const err = new Error(message);
          err.code = errData.code;
          err.quota = errData.quota;
          reject(err);
        } catch (e) {
          reject(new Error(`Server error (${xhr.status}): ${xhr.statusText}`));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error: Unable to reach PDF Translator service.'));
    });

    xhr.timeout = 120000;
    xhr.open('POST', url, true);

    const token = getStoredAuthToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    if (consent !== false) xhr.setRequestHeader('X-Simatrix-AI-Consent', 'true');
    if (idempotencyKey) xhr.setRequestHeader('X-Simatrix-Idempotency-Key', idempotencyKey);

    xhr.send(formData);
  });

  if (onProgress) onProgress(100, 'Complete');

  return {
    success: data.success,
    targetLanguage: data.target_language,
    translatedText: data.translated_text,
    pageCount: data.page_count,
    charCount: data.char_count,
    wordCount: data.word_count,
    processingTimeMs: data.processing_time_ms,
    downloadUrl: data.download_url,
    downloadToken: data.download_token,
    notice: data.notice,
    provider: data.provider,
    model: data.model,
    quota: data.quota,
    isDemo: data.is_demo,
    quotaDeducted: data.quota_deducted,
    status: data.status
  };
}


/**
 * Generic internal caller for multipart AI endpoints.
 */
async function callGenericAITool({
  endpoint,
  file,
  file2,
  extraParams = {},
  consent = true,
  idempotencyKey,
  onProgress,
  progressMsg = 'Processing document...'
}) {
  const formData = new FormData();
  if (file) formData.append('file', file);
  if (file2) formData.append('file2', file2);
  if (consent !== false) formData.append('consent', 'true');
  if (idempotencyKey) formData.append('idempotency_key', idempotencyKey);

  Object.entries(extraParams).forEach(([k, v]) => {
    if (v !== undefined && v !== null) {
      formData.append(k, v);
    }
  });

  const xhr = new XMLHttpRequest();
  const url = `${API_BASE_URL}/ai/${endpoint}`;

  const data = await new Promise((resolve, reject) => {
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 45);
        onProgress(percent, progressMsg);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (err) {
          reject(new Error(`Invalid response from AI ${endpoint} engine.`));
        }
      } else {
        try {
          const errData = JSON.parse(xhr.responseText);
          const message = errData.message || errData.detail || `Server returned error ${xhr.status}`;
          const err = new Error(message);
          err.code = errData.code;
          err.quota = errData.quota;
          reject(err);
        } catch (e) {
          reject(new Error(`Server error (${xhr.status}): ${xhr.statusText}`));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error(`Network error: Unable to reach AI ${endpoint} service.`));
    });

    xhr.timeout = 90000;
    xhr.open('POST', url, true);

    const token = getStoredAuthToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    if (consent !== false) xhr.setRequestHeader('X-Simatrix-AI-Consent', 'true');
    if (idempotencyKey) xhr.setRequestHeader('X-Simatrix-Idempotency-Key', idempotencyKey);

    xhr.send(formData);
  });

  if (onProgress) onProgress(100, 'Complete');
  return data;
}

/**
 * Extracts structured key takeaways, metrics, and action items.
 */
export async function extractKeyPointsAI({ file, consent = true, idempotencyKey, onProgress }) {
  return callGenericAITool({
    endpoint: 'key-points',
    file,
    consent,
    idempotencyKey,
    onProgress,
    progressMsg: 'Extracting key points and takeaways...'
  });
}

/**
 * Extracts tabular data and key-value metrics.
 */
export async function extractDataAI({ file, consent = true, idempotencyKey, onProgress }) {
  return callGenericAITool({
    endpoint: 'extract-data',
    file,
    consent,
    idempotencyKey,
    onProgress,
    progressMsg: 'Extracting tables and structured data...'
  });
}

/**
 * Generates quizzes, FAQs, and study cards.
 */
export async function generateQuestionsAI({ file, consent = true, idempotencyKey, onProgress }) {
  return callGenericAITool({
    endpoint: 'generate-qns',
    file,
    consent,
    idempotencyKey,
    onProgress,
    progressMsg: 'Synthesizing comprehension questions...'
  });
}

/**
 * Rewrites document text in chosen tone/style.
 */
export async function rewritePdfAI({ file, style = 'professional', consent = true, idempotencyKey, onProgress }) {
  return callGenericAITool({
    endpoint: 'rewrite',
    file,
    extraParams: { style },
    consent,
    idempotencyKey,
    onProgress,
    progressMsg: `Rewriting document in ${style} style...`
  });
}

/**
 * Compares two PDF documents.
 */
export async function comparePdfAI({ file, file2, consent = true, idempotencyKey, onProgress }) {
  return callGenericAITool({
    endpoint: 'compare',
    file,
    file2,
    consent,
    idempotencyKey,
    onProgress,
    progressMsg: 'Comparing structural and semantic differences...'
  });
}
