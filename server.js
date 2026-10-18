// Local preview only. Production is plain static hosting, with no build step.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const types = { 'index.html': 'text/html', 'styles.css': 'text/css', 'game.js': 'text/javascript', 'optics.js': 'text/javascript', 'levels.js': 'text/javascript' };
const port = Number(process.env.PORT || 4173);
createServer(async (request, response) => {
  const file = new URL(request.url, 'http://localhost').pathname.slice(1) || 'index.html';
  if (!Object.hasOwn(types, file)) { response.writeHead(404); response.end('Not found'); return; }
  try {
    const body = await readFile(new URL(file, import.meta.url));
    response.writeHead(200, { 'Content-Type': `${types[file]}; charset=utf-8`, 'Cache-Control': 'no-store' });
    response.end(body);
  } catch { response.writeHead(500); response.end('Unable to read file'); }
}).listen(port, '127.0.0.1', () => console.log(`Reflections: http://127.0.0.1:${port}`));
