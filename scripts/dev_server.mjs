import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {readFile, stat} from 'node:fs/promises';
import {extname, join, resolve, sep} from 'node:path';
import {loadAvailability} from '../js/availability.js';

const root = new URL('..', import.meta.url).pathname;
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4',
  '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon',
};

function localEnv() {
  const env = {};
  try {
    for (const line of readFileSync(join(root, '.dev.vars'), 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const mark = trimmed.indexOf('=');
      if (mark > 0) env[trimmed.slice(0, mark)] = trimmed.slice(mark + 1);
    }
  } catch { /* Missing local secrets: the API returns the same unavailable state as production. */ }
  return env;
}

const env = localEnv();
createServer(async (request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  if (url.pathname === '/api/availability') {
    try {
      const body = JSON.stringify(await loadAvailability(env));
      response.writeHead(200, {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store'});
      response.end(body);
    } catch {
      response.writeHead(503, {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store'});
      response.end(JSON.stringify({error: 'unavailable'}));
    }
    return;
  }
  const base = resolve(root);
  let file = resolve(base, '.' + decodeURIComponent(url.pathname));
  if (file !== base && !file.startsWith(base + sep)) {response.writeHead(403); response.end(); return;}
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    response.writeHead(200, {'content-type': types[extname(file)] || 'application/octet-stream'});
    response.end(body);
  } catch {
    response.writeHead(404, {'content-type': 'text/plain; charset=utf-8'});
    response.end('Not found');
  }
}).listen(8765, '127.0.0.1');
