import http from 'node:http';

export function startHealthServer({ port, logger, getStatus }) {
  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      const status = getStatus();
      res.writeHead(status.ok ? 200 : 503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ...status, timestamp: new Date().toISOString() }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('P2P Pulse Telegram Bot\n');
  });

  server.listen(port, '0.0.0.0', () => logger.info({ port }, 'Health server listening'));
  return server;
}
