import 'dotenv/config';
import * as esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

await esbuild.build({
  entryPoints: [path.join(__dirname, 'src/index.tsx')],
  bundle: true,
  minify: true,
  sourcemap: true,
  target: 'es2020',
  outfile: path.join(__dirname, 'dist/bundle.js'),
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env.HAIDUTI_API_URL': JSON.stringify(process.env.HAIDUTI_API_URL ?? ''),
    'process.env.HAIDUTI_CDN_URL': JSON.stringify(process.env.HAIDUTI_CDN_URL ?? ''),
  },
  jsx: 'automatic',
  loader: {
    '.tsx': 'tsx',
    '.ts': 'ts',
    '.css': 'css',
    '.svg': 'dataurl',
    '.png': 'dataurl',
    '.jpg': 'dataurl',
    '.webp': 'dataurl',
  },
  alias: {
    '@': path.join(__dirname, 'src'),
    '@shared': path.join(__dirname, '..', 'shared'),
  },
});

console.log('Build complete: dist/bundle.js');
