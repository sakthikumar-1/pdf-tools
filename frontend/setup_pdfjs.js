import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const buildDir = path.join(__dirname, 'node_modules', 'pdfjs-dist', 'build');

if (fs.existsSync(buildDir)) {
  const pdfJs = path.join(buildDir, 'pdf.js');
  if (!fs.existsSync(pdfJs)) {
    fs.writeFileSync(pdfJs, "export * from './pdf.mjs';\nimport * as pdfjs from './pdf.mjs';\nexport default pdfjs;\n", 'utf8');
    console.log('[setup_pdfjs] Created pdfjs-dist/build/pdf.js');
  }
  const workerJs = path.join(buildDir, 'pdf.worker.js');
  if (!fs.existsSync(workerJs)) {
    fs.writeFileSync(workerJs, "export * from './pdf.worker.mjs';\n", 'utf8');
    console.log('[setup_pdfjs] Created pdfjs-dist/build/pdf.worker.js');
  }
}

