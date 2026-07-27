#!/usr/bin/env node

import http from 'node:http';

const port = Number.parseInt(process.argv[2] ?? '', 10);
if (!Number.isInteger(port) || port <= 0) {
  throw new Error('A valid fixture port is required.');
}

const server = http.createServer((request, response) => {
  response.writeHead(request.url === '/health' ? 200 : 404, {
    'content-type': 'application/json',
  });
  response.end(JSON.stringify({
    status: request.url === '/health' ? 'ok' : 'not_found',
    pid: process.pid,
  }));
});

server.listen(port, '127.0.0.1');

function shutdown() {
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
