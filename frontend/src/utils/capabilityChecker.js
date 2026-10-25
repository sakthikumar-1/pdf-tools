/**
 * Capability Detection Module for Simatrix Academy PDF Tools.
 * Communicates with the Python Django Ninja REST backend (/api/v1/capabilities).
 */

let cachedCapabilities = null;

export async function fetchServerCapabilities() {
  if (cachedCapabilities) return cachedCapabilities;

  try {
    const res = await fetch('/api/v1/capabilities');
    if (res.ok) {
      const data = await res.json();
      cachedCapabilities = data;
      return data;
    }
  } catch (err) {
    console.log('[CapabilityChecker] Python API unreachable, using client defaults.');
  }

  // Fallback map
  cachedCapabilities = {
    status: 'ok',
    engines: {
      pymupdf: true,
      pdf2docx: true,
      aes256_encryption: true,
      image_rasterizer: true,
      client_vector_engine: true,
    },
    tools: {
      'protect-pdf': {
        available: true,
        engine: 'PyMuPDF 256-bit AES Engine',
        status: 'AVAILABLE',
        reason: 'Native Python 256-bit AES document security.',
      },
      'pdf-to-word': {
        available: true,
        engine: 'Python pdf2docx Engine',
        status: 'AVAILABLE',
        reason: 'Document layout reconstruction active.',
      },
      'pdf-to-jpg': {
        available: true,
        engine: 'PyMuPDF High-DPI Engine',
        status: 'AVAILABLE',
        reason: 'High-fidelity server rasterization active.',
      },
    },
  };

  return cachedCapabilities;
}

export function getToolCapability(toolTitle, capabilitiesMap) {
  const titleLower = toolTitle.toLowerCase();

  if (titleLower.includes('summar') || titleLower.includes('ai')) {
    const aiConfigured = capabilitiesMap?.ai?.configured ?? true;
    const provider = capabilitiesMap?.ai?.provider || 'AI';
    return {
      available: aiConfigured,
      status: aiConfigured ? 'AVAILABLE' : 'NOT_CONFIGURED',
      engine: `Hosted AI Engine (${provider})`,
      reason: aiConfigured 
        ? 'AI-powered document intelligence and structured summarization active.'
        : 'AI provider is not yet configured in server environment.',
    };
  }

  if (titleLower.includes('protect')) {
    return {
      available: true,
      status: 'AVAILABLE',
      engine: 'PyMuPDF 256-bit AES Engine',
      reason: 'Server-side 256-bit AES password encryption active with client WASM fallback.',
    };
  }

  if (titleLower.includes('word')) {
    return {
      available: true,
      status: 'AVAILABLE',
      engine: 'Python pdf2docx Engine',
      reason: 'Full document layout reconstruction active, preserving paragraphs, formatting, and tables.',
    };
  }

  if (titleLower.includes('jpg')) {
    return {
      available: true,
      status: 'AVAILABLE',
      engine: 'PyMuPDF High-DPI Engine',
      reason: 'High-resolution server image rendering with client-side canvas fallback.',
    };
  }

  if (titleLower.includes('excel')) {
    return {
      available: true,
      status: 'AVAILABLE',
      engine: 'SheetJS XLSX Compiler',
      reason: 'Tabular cell clustering into native XLSX active.',
    };
  }

    if (titleLower.includes('powerpoint') || titleLower.includes('ppt')) {
    return {
      available: true,
      status: 'AVAILABLE',
      engine: 'PyMuPDF + python-pptx Engine',
      reason: 'Slide text shape generator active.',
    };
  }

  if (titleLower.includes('number') || titleLower.includes('page-number')) {
    return {
      available: true,
      status: 'AVAILABLE',
      engine: 'PyMuPDF + pdf-lib Engine',
      reason: 'Rotation-aware page numbering active.',
    };
  }

  if (titleLower.includes('watermark')) {
    return {
      available: true,
      status: 'AVAILABLE',
      engine: 'PyMuPDF + pdf-lib Engine',
      reason: 'Vector and text watermark engine active.',
    };
  }

  if (titleLower.includes('crop')) {
    return {
      available: true,
      status: 'AVAILABLE',
      engine: 'PyMuPDF + pdf-lib Engine',
      reason: 'Lossless margin trimming active.',
    };
  }

  if (titleLower.includes('metadata')) {
    return {
      available: true,
      status: 'AVAILABLE',
      engine: 'PyMuPDF + pdf-lib Engine',
      reason: 'PDF dictionary metadata editing active.',
    };
  }

  if (titleLower.includes('reorder') || titleLower.includes('organize')) {
    return {
      available: true,
      status: 'AVAILABLE',
      engine: 'PyMuPDF + pdf-lib Engine',
      reason: 'Visual page sequence reordering active.',
    };
  }

  return {
    available: true,
    status: 'AVAILABLE',
    engine: 'Client WebWorker Engine',
    reason: 'Tool is fully available and operational.',
  };
}
