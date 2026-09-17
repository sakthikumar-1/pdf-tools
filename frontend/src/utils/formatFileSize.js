/**
 * Formats bytes into a human readable file size string.
 * @param {number} bytes
 * @param {number} decimals
 * @returns {string}
 */
export function formatFileSize(bytes, decimals = 1) {
  if (bytes === 0 || !bytes) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
