import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const distDir = path.resolve('dist');

function compressDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      compressDir(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (['.js', '.css', '.html', '.svg', '.json', '.wasm'].includes(ext) && !entry.name.endsWith('.gz') && !entry.name.endsWith('.br')) {
        const content = fs.readFileSync(fullPath);
        
        // 1. Gzip Level 9
        const gzipped = zlib.gzipSync(content, { level: 9 });
        fs.writeFileSync(`${fullPath}.gz`, gzipped);

        // 2. Brotli Quality 11 (Max compression)
        const brotli = zlib.brotliCompressSync(content, {
          params: {
            [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
          },
        });
        fs.writeFileSync(`${fullPath}.br`, brotli);
      }
    }
  }
}

compressDir(distDir);
console.log('✓ Pre-compressed all dist assets with Gzip (level 9) and Brotli (level 11).');
