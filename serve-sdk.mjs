#!/usr/bin/env node

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = dirname(fileURLToPath(import.meta.url));
const port = Math.max(1, Math.trunc(Number(process.env.MARSOON_SDK_PORT) || 4173));
const url = `http://127.0.0.1:${port}/runtime/`;
const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.wasm', 'application/wasm'],
  ['.md', 'text/markdown; charset=utf-8'],
]);

const openBrowser = () => {
  const command = process.platform === 'darwin'
    ? ['open', [url]]
    : process.platform === 'win32'
      ? ['cmd', ['/c', 'start', '', url]]
      : ['xdg-open', [url]];
  spawn(command[0], command[1], { detached: true, stdio: 'ignore' }).unref();
};

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url || '/', url).pathname);
    const requested = pathname === '/' ? '/runtime/index.html' : pathname;
    let file = resolve(root, `.${normalize(requested)}`);
    if (file !== root && !file.startsWith(`${root}${sep}`)) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    const name = file.split(sep).at(-1) || '';
    const immutable = /-[0-9a-f]{16}(?:_bg)?\.(?:js|wasm)$/.test(name);
    response.writeHead(200, {
      'content-type': mime.get(extname(file)) || 'application/octet-stream',
      'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
      'cross-origin-opener-policy': 'same-origin',
      'x-content-type-options': 'nosniff',
    });
    response.end(body);
  } catch (error) {
    response.writeHead(error?.code === 'ENOENT' ? 404 : 500).end('Not Found');
  }
});

server.on('error', (error) => {
  console.error(`Marsoon SDK local server failed: ${error.message}`);
  process.exitCode = 1;
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Marsoon Chart SDK: ${url}`);
  console.log('Press Ctrl+C to stop.');
  if (process.env.MARSOON_SDK_NO_OPEN !== '1') openBrowser();
});
