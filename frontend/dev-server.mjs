import 'dotenv/config';
import * as esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import fs from 'fs';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 5173;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

// Start Tailwind CSS in watch mode
const tailwindProc = spawn(
  'npx',
  ['tailwindcss', '-i', 'src/index.css', '-o', 'public/bundle.css', '--watch'],
  { cwd: __dirname, stdio: 'inherit', shell: true }
);

// Start esbuild context with watch
const ctx = await esbuild.context({
  entryPoints: [path.join(__dirname, 'src/index.tsx')],
  bundle: true,
  sourcemap: true,
  target: 'es2020',
  outfile: path.join(__dirname, 'public/bundle.js'),
  define: {
    'process.env.NODE_ENV': '"development"',
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

await ctx.watch();
console.log('esbuild watching for changes...');

// Create dev server with proxy and SPA fallback
const indexHtml = path.join(__dirname, 'public', 'index.html');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.map': 'application/json',
};

function proxyRequest(req, res, targetUrl) {
  const url = new URL(targetUrl + req.url);
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname + url.search,
    method: req.method,
    headers: { ...req.headers, host: url.host },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err.message);
    res.writeHead(502);
    res.end('Bad Gateway');
  });

  req.pipe(proxyReq);
}

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];

  // Proxy /api/* to backend
  if (urlPath.startsWith('/api/')) {
    return proxyRequest(req, res, BACKEND_URL);
  }

  // Try to serve static file from public/
  const filePath = path.join(__dirname, 'public', urlPath);
  const ext = path.extname(filePath);

  if (ext && fs.existsSync(filePath)) {
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mimeType });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // SPA fallback: serve index.html for all other routes
  res.writeHead(200, { 'Content-Type': 'text/html' });
  fs.createReadStream(indexHtml).pipe(res);
});

// Handle WebSocket upgrade for /ws
server.on('upgrade', (req, socket, head) => {
  if (req.url === '/ws' || req.url.startsWith('/ws?')) {
    const backendUrl = new URL(BACKEND_URL);
    const options = {
      hostname: backendUrl.hostname,
      port: backendUrl.port,
      path: req.url,
      method: 'GET',
      headers: req.headers,
    };

    const proxyReq = http.request(options);
    proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
      socket.write(
        'HTTP/1.1 101 Switching Protocols\r\n' +
        Object.entries(proxyRes.headers)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\r\n') +
        '\r\n\r\n'
      );
      proxySocket.pipe(socket);
      socket.pipe(proxySocket);
    });

    proxyReq.on('error', (err) => {
      console.error('WebSocket proxy error:', err.message);
      socket.destroy();
    });

    proxyReq.end();
  }
});

server.listen(PORT, () => {
  console.log(`Dev server running at http://localhost:${PORT}`);
  console.log(`Proxying /api/* and /ws to ${BACKEND_URL}`);
});

// Cleanup on exit
process.on('SIGINT', () => {
  tailwindProc.kill();
  ctx.dispose();
  process.exit();
});

process.on('SIGTERM', () => {
  tailwindProc.kill();
  ctx.dispose();
  process.exit();
});
