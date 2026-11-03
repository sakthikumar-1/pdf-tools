/**
 * Simatrix PDF Tools - Editor Coordinate System & Geometry Utilities
 * 
 * Provides mathematical conversions between:
 * - Viewport Display Pixels (screen space, top-left origin, scaled by zoom & CSS)
 * - Canonical PDF Points (document space, 72 points = 1 inch, unscaled, rotation-aware)
 */

export const POINTS_PER_INCH = 72;
export const POINTS_PER_MM = 72 / 25.4; // ~2.83465 pt/mm
export const MM_PER_POINT = 25.4 / 72; // ~0.352778 mm/pt

/**
 * Standard PDF Page Sizes (width x height in points at 72 DPI)
 */
export const STANDARD_PAGE_SIZES = {
  LETTER: { name: 'Letter', width: 612, height: 792, dimensions: '8.5 × 11 in' },
  A4: { name: 'A4', width: 595.28, height: 841.89, dimensions: '210 × 297 mm' },
  LEGAL: { name: 'Legal', width: 612, height: 1008, dimensions: '8.5 × 14 in' },
  TABLOID: { name: 'Tabloid', width: 792, height: 1224, dimensions: '11 × 17 in' },
  A3: { name: 'A3', width: 841.89, height: 1190.55, dimensions: '297 × 420 mm' },
  A5: { name: 'A5', width: 419.53, height: 595.28, dimensions: '148 × 210 mm' },
};

/**
 * Detects the standard format name of a PDF page based on unscaled point dimensions.
 * Accounts for both portrait and landscape orientations with a tolerance threshold.
 * 
 * @param {number} widthPt 
 * @param {number} heightPt 
 * @param {number} tolerancePt Default tolerance is 4 points
 * @returns {string} e.g. "Letter", "A4", "Custom"
 */
export function detectPageFormat(widthPt, heightPt, tolerancePt = 4) {
  if (!widthPt || !heightPt) return 'Unknown';

  const minDim = Math.min(widthPt, heightPt);
  const maxDim = Math.max(widthPt, heightPt);

  for (const key of Object.keys(STANDARD_PAGE_SIZES)) {
    const size = STANDARD_PAGE_SIZES[key];
    const stdMin = Math.min(size.width, size.height);
    const stdMax = Math.max(size.width, size.height);

    if (
      Math.abs(minDim - stdMin) <= tolerancePt &&
      Math.abs(maxDim - stdMax) <= tolerancePt
    ) {
      return size.name;
    }
  }

  return 'Custom';
}

/**
 * Formats points into human-readable inches.
 * @param {number} pt 
 * @returns {string} e.g. "8.5 in"
 */
export function formatPtToInches(pt) {
  if (!pt && pt !== 0) return '0 in';
  return `${(pt / POINTS_PER_INCH).toFixed(1)} in`;
}

/**
 * Formats points into human-readable millimeters.
 * @param {number} pt 
 * @returns {string} e.g. "210 mm"
 */
export function formatPtToMm(pt) {
  if (!pt && pt !== 0) return '0 mm';
  return `${Math.round(pt * MM_PER_POINT)} mm`;
}

/**
 * Formats full dimensions description for inspector display.
 * @param {number} widthPt 
 * @param {number} heightPt 
 * @returns {string} e.g. "612 × 792 pt (8.5 × 11.0 in, Letter)"
 */
export function formatDimensionsDescription(widthPt, heightPt) {
  if (!widthPt || !heightPt) return 'Unknown';
  const formatName = detectPageFormat(widthPt, heightPt);
  const widthIn = (widthPt / POINTS_PER_INCH).toFixed(1);
  const heightIn = (heightPt / POINTS_PER_INCH).toFixed(1);
  const isLandscape = widthPt > heightPt;
  const orientation = isLandscape ? 'Landscape' : 'Portrait';

  return `${Math.round(widthPt)} × ${Math.round(heightPt)} pt (${widthIn} × ${heightIn} in, ${formatName} - ${orientation})`;
}

/**
 * Normalizes rotation angle to 0, 90, 180, or 270 degrees.
 * @param {number} angle 
 * @returns {number} 0, 90, 180, or 270
 */
export function normalizeRotation(angle = 0) {
  const mod = ((angle % 360) + 360) % 360;
  if (mod >= 45 && mod < 135) return 90;
  if (mod >= 135 && mod < 225) return 180;
  if (mod >= 225 && mod < 315) return 270;
  return 0;
}

/**
 * Converts screen/viewport pixel coordinates into canonical unscaled PDF points.
 * 
 * @param {Object} params
 * @param {number} params.screenX - X coordinate relative to rendered page top-left (px)
 * @param {number} params.screenY - Y coordinate relative to rendered page top-left (px)
 * @param {number} params.screenWidth - Width on screen (px)
 * @param {number} params.screenHeight - Height on screen (px)
 * @param {number} params.scale - Current viewport zoom scale factor (e.g. 1.0, 1.25)
 * @param {number} params.pagePtWidth - Unscaled page width in points (72 DPI)
 * @param {number} params.pagePtHeight - Unscaled page height in points (72 DPI)
 * @param {number} params.rotation - Page rotation (0, 90, 180, 270)
 * @returns {Object} { ptX, ptY, ptWidth, ptHeight, pdfX, pdfY }
 */
export function screenToPdfCoordinates({
  screenX,
  screenY,
  screenWidth,
  screenHeight,
  scale = 1.0,
  pagePtWidth,
  pagePtHeight,
  rotation = 0,
}) {
  const safeScale = scale > 0 ? scale : 1.0;

  // Viewport point equivalents (top-left origin, unscaled)
  const ptX = screenX / safeScale;
  const ptY = screenY / safeScale;
  const ptWidth = screenWidth / safeScale;
  const ptHeight = screenHeight / safeScale;

  const rot = normalizeRotation(rotation);

  // PDF-lib standard coordinates (bottom-left origin relative to rotated page)
  let pdfX = ptX;
  let pdfY = pagePtHeight - ptY - ptHeight;

  if (rot === 90) {
    pdfX = ptY;
    pdfY = ptX;
  } else if (rot === 180) {
    pdfX = pagePtWidth - ptX - ptWidth;
    pdfY = ptY;
  } else if (rot === 270) {
    pdfX = pagePtWidth - ptY - ptHeight;
    pdfY = pagePtHeight - ptX - ptWidth;
  }

  return {
    ptX: Math.round(ptX * 100) / 100,
    ptY: Math.round(ptY * 100) / 100,
    ptWidth: Math.round(ptWidth * 100) / 100,
    ptHeight: Math.round(ptHeight * 100) / 100,
    pdfX: Math.round(pdfX * 100) / 100,
    pdfY: Math.round(pdfY * 100) / 100,
  };
}

/**
 * Converts canonical unscaled PDF points into screen/viewport pixel coordinates.
 * 
 * @param {Object} params
 * @param {number} params.ptX - Top-left X in points (unscaled)
 * @param {number} params.ptY - Top-left Y in points (unscaled)
 * @param {number} params.ptWidth - Width in points (unscaled)
 * @param {number} params.ptHeight - Height in points (unscaled)
 * @param {number} params.scale - Current viewport zoom scale factor
 * @returns {Object} { screenX, screenY, screenWidth, screenHeight }
 */
export function pdfToScreenCoordinates({
  ptX,
  ptY,
  ptWidth,
  ptHeight,
  scale = 1.0,
}) {
  const safeScale = scale > 0 ? scale : 1.0;

  return {
    screenX: Math.round(ptX * safeScale),
    screenY: Math.round(ptY * safeScale),
    screenWidth: Math.round(ptWidth * safeScale),
    screenHeight: Math.round(ptHeight * safeScale),
  };
}

/**
 * Clamps coordinates so an element stays entirely inside the page boundaries.
 * 
 * @param {Object} box - { ptX, ptY, ptWidth, ptHeight }
 * @param {number} pagePtWidth 
 * @param {number} pagePtHeight 
 * @returns {Object} Clamped { ptX, ptY, ptWidth, ptHeight }
 */
export function clampToPageBounds(box, pagePtWidth, pagePtHeight) {
  const width = Math.min(box.ptWidth, pagePtWidth);
  const height = Math.min(box.ptHeight, pagePtHeight);
  const x = Math.max(0, Math.min(box.ptX, pagePtWidth - width));
  const y = Math.max(0, Math.min(box.ptY, pagePtHeight - height));

  return {
    ptX: Math.round(x),
    ptY: Math.round(y),
    ptWidth: Math.round(width),
    ptHeight: Math.round(height),
  };
}

