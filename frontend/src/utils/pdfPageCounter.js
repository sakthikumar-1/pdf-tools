/**
 * Lightweight PDF Page Counter Utility.
 * Dynamically loads pdf-lib on demand so pages importing getPdfPageCount
 * do not pull in heavy Excel (xlsx), ZIP (jszip), or canvas dependencies upfront.
 */

export async function getPdfPageCount(file) {
  if (!file) return null;
  try {
    const { PDFDocument } = await import('pdf-lib');
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    return pdfDoc.getPageCount();
  } catch (err) {
    console.warn('[pdfPageCounter] Could not determine page count:', err);
    return null;
  }
}
