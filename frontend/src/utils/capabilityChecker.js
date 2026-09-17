/**
 * Capability Detection Module for Simatrix Academy PDF Tools.
 * Inspects server binaries and browser capabilities to provide accurate tool availability states.
 */

let cachedCapabilities = null;

export async function fetchServerCapabilities() {
  if (cachedCapabilities) return cachedCapabilities;

  try {
    const res = await fetch('/api/capabilities.php');
    if (res.ok) {
      const data = await res.json();
      cachedCapabilities = data;
      return data;
    }
  } catch (err) {
    console.log('[CapabilityChecker] Server API endpoint unreachable, using client engine capabilities.');
  }

  // Fallback map when server binary status endpoint is offline
  cachedCapabilities = {
    status: 'ok',
    binaries: {
      qpdf: false,
      libreoffice: false,
      ghostscript: false,
      tesseract: false,
      poppler: false
    },
    tools: {
      'protect-pdf': {
        available: false,
        engine: 'qpdf',
        status: 'TEMPORARILY UNAVAILABLE',
        reason: 'Protect PDF requires the qpdf server binary for 256-bit AES PDF password encryption.'
      }
    }
  };

  return cachedCapabilities;
}

export function getToolCapability(toolTitle, capabilitiesMap) {
  const titleLower = toolTitle.toLowerCase();

  if (titleLower.includes('protect')) {
    const protectCap = capabilitiesMap?.tools?.['protect-pdf'];
    const hasServerQpdf = protectCap && protectCap.available;
    return {
      available: true,
      status: 'AVAILABLE',
      engine: hasServerQpdf ? 'qpdf 256-bit AES Engine' : 'Client Cryptographic Security Engine',
      reason: hasServerQpdf 
        ? 'Server qpdf 256-bit AES encryption engine active.' 
        : 'Client-side cryptographic PDF password security active.'
    };
  }

  if (titleLower.includes('word')) {
    const hasLo = capabilitiesMap?.binaries?.libreoffice;
    return {
      available: true,
      status: hasLo ? 'AVAILABLE' : 'LIMITED',
      engine: hasLo ? 'LibreOffice Server Engine' : 'Client OpenXML AST',
      reason: hasLo 
        ? 'Full document layout engine active.' 
        : 'Client-side text block & paragraph AST generator active. Multi-column magazine layouts require LibreOffice server engine for exact visual parity.'
    };
  }

  if (titleLower.includes('excel')) {
    const hasLo = capabilitiesMap?.binaries?.libreoffice;
    return {
      available: true,
      status: hasLo ? 'AVAILABLE' : 'LIMITED',
      engine: hasLo ? 'LibreOffice Server Engine' : 'SheetJS XLSX Compiler',
      reason: hasLo 
        ? 'Full table structure engine active.' 
        : 'Tabular cell clustering into native XLSX active. Complex merged table cells require LibreOffice server engine.'
    };
  }

  if (titleLower.includes('powerpoint') || titleLower.includes('ppt')) {
    const hasLo = capabilitiesMap?.binaries?.libreoffice;
    return {
      available: true,
      status: hasLo ? 'AVAILABLE' : 'LIMITED',
      engine: hasLo ? 'LibreOffice Server Engine' : 'OpenXML Slide AST',
      reason: hasLo 
        ? 'Presentation layout engine active.' 
        : 'Slide text shape generator active. Complex page visuals use appearance-preserving rendering.'
    };
  }

  return {
    available: true,
    status: 'AVAILABLE',
    engine: 'Client WebWorker Engine',
    reason: 'Tool is fully available and operational.'
  };
}
