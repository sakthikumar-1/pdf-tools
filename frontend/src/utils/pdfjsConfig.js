import * as pdfjsDist from 'pdfjs-dist';

export const pdfjsLib = { ...pdfjsDist };

if (typeof window !== 'undefined' && pdfjsLib) {
  // CVE-2024-4367 mitigation: disable eval at module level where applicable
  if ('isEvalSupported' in pdfjsLib) {
    pdfjsLib.isEvalSupported = false;
  }
  if (pdfjsLib.GlobalWorkerOptions) {
    // Use locally hosted matching worker (v4.10.38) with zero CDN dependency
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  }

  // Guarantee isEvalSupported: false is passed through actual document-loading options
  const originalGetDocument = pdfjsDist.getDocument;
  if (originalGetDocument) {
    pdfjsLib.getDocument = function (src) {
      if (typeof src === 'string' || src instanceof Uint8Array || src instanceof ArrayBuffer) {
        src = { data: src, isEvalSupported: false };
      } else if (src && typeof src === 'object') {
        src = { ...src, isEvalSupported: false };
      }
      return originalGetDocument.call(pdfjsDist, src);
    };
  }
}

export default pdfjsLib;
