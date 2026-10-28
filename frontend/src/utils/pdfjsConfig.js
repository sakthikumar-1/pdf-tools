import * as pdfjsDist from 'pdfjs-dist';

export const pdfjsLib = pdfjsDist.default || pdfjsDist;

if (typeof window !== 'undefined' && pdfjsLib?.GlobalWorkerOptions) {
  // Use locally hosted matching worker (v3.11.174) with zero CDN dependency
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
}

export default pdfjsLib;
