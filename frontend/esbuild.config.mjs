import 'dotenv/config';
import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, 'dist');

const result = await esbuild.build({
  entryPoints: [path.join(__dirname, 'src/index.tsx')],
  bundle: true,
  minify: true,
  sourcemap: true,
  target: 'es2020',
  outdir: distDir,
  entryNames: 'bundle-[hash]',
  metafile: true,
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env.HAIDUTI_API_URL': JSON.stringify(process.env.HAIDUTI_API_URL ?? ''),
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

// Extract hashed JS filename from metafile
const outputs = Object.keys(result.metafile.outputs);
const jsFile = outputs.find(f => f.endsWith('.js') && !f.endsWith('.map'));
const jsName = path.basename(jsFile);

// Hash-rename the Tailwind CSS (built by build:css before this script)
import crypto from 'crypto';
const cssPath = path.join(distDir, 'bundle.css');
let cssName = 'bundle.css';
if (fs.existsSync(cssPath)) {
  const cssContent = fs.readFileSync(cssPath);
  const cssHash = crypto.createHash('md5').update(cssContent).digest('hex').slice(0, 8).toUpperCase();
  cssName = `bundle-${cssHash}.css`;
  fs.renameSync(cssPath, path.join(distDir, cssName));
}

// Generate index.html with hashed references
const template = fs.readFileSync(path.join(__dirname, 'public/index.template.html'), 'utf-8');
const html = template
  .replace('{{BUNDLE_CSS}}', `/${cssName}`)
  .replace('{{BUNDLE_JS}}', `/${jsName}`);

fs.writeFileSync(path.join(distDir, 'index.html'), html);

console.log(`Build complete: ${jsName}, ${cssName}`);
