import * as pdfjsDist from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

export const pdfjsLib = { ...pdfjsDist };

if (typeof window !== 'undefined') {
  // CVE-2024-4367 mitigation: disable eval at module level where applicable
  if (pdfjsLib && typeof pdfjsLib === 'object' && 'isEvalSupported' in pdfjsLib) {
    pdfjsLib.isEvalSupported = false;
  }

  // Use Vite resolved worker URL or local public worker fallback
  const origin = window.location.origin || '';
  const version = pdfjsDist.version || '4.10.38';
  const resolvedWorker = workerUrl || `${origin}/pdf.worker.min.mjs`;

  if (pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = resolvedWorker;
  }
  if (pdfjsDist.GlobalWorkerOptions) {
    pdfjsDist.GlobalWorkerOptions.workerSrc = resolvedWorker;
  }

  // Guarantee isEvalSupported: false is passed through actual document-loading options
  // Also configure standardFontDataUrl and cMapUrl for offline CMap and font resolution
  const originalGetDocument = pdfjsDist.getDocument;
  if (originalGetDocument) {
    pdfjsLib.getDocument = function (src) {
      const defaultOptions = {
        isEvalSupported: false,
        cMapUrl: `${origin}/cmaps/`,
        cMapPacked: true,
        standardFontDataUrl: `${origin}/standard_fonts/`,
      };
      if (typeof src === 'string') {
        src = { url: src, ...defaultOptions };
      } else if (src instanceof Uint8Array || src instanceof ArrayBuffer) {
        src = { data: src, ...defaultOptions };
      } else if (src && typeof src === 'object') {
        src = { ...defaultOptions, ...src, isEvalSupported: false };
      }
      return originalGetDocument.call(pdfjsDist, src);
    };
  }
}

export default pdfjsLib;
