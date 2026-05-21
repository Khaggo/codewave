import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.mjs', 'application/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.ico', 'image/x-icon'],
  ['.ttf', 'font/ttf'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

function resolveFilePath(rootDir, urlPath) {
  const resolvedRoot = path.resolve(rootDir);
  const normalizedPath = decodeURIComponent(String(urlPath || '/').split('?')[0]);
  const candidatePath = normalizedPath === '/' ? '/index.html' : normalizedPath;
  const joinedPath = path.join(resolvedRoot, candidatePath);
  const normalizedJoinedPath = path.normalize(joinedPath);

  if (!normalizedJoinedPath.startsWith(resolvedRoot)) {
    return null;
  }

  if (fs.existsSync(normalizedJoinedPath) && fs.statSync(normalizedJoinedPath).isFile()) {
    return normalizedJoinedPath;
  }

  const fallbackPath = path.join(resolvedRoot, 'index.html');
  return fs.existsSync(fallbackPath) ? fallbackPath : null;
}

export function createStaticServer(rootDir) {
  const resolvedRoot = path.resolve(rootDir);

  return http.createServer((request, response) => {
    const filePath = resolveFilePath(resolvedRoot, request.url);

    if (!filePath) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const contentType = contentTypes.get(extension) ?? 'application/octet-stream';

    response.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(response);
  });
}

export async function startStaticServer(rootDir, port = 8090) {
  const server = createStaticServer(rootDir);

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });

  return server;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const rootDir = process.argv[2];
  const port = Number(process.argv[3] ?? '8090');

  if (!rootDir) {
    console.error('Usage: node serve-static.mjs <rootDir> [port]');
    process.exit(1);
  }

  startStaticServer(rootDir, port)
    .then(() => {
      console.log(`Static server running at http://127.0.0.1:${port}`);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
