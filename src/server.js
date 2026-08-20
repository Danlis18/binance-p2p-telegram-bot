import http from 'node:http';

export function startHealthServer({ port, logger, getStatus }) {
  const server = http.createServer((req, res) => {
    const status = getStatus();

    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: true,
        service: status.service,
        telegram: status.telegram,
        timestamp: new Date().toISOString()
      }));
      return;
    }

    if (req.url === '/ready') {
      const ready = Boolean(status.ok);
      res.writeHead(ready ? 200 : 503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: ready,
        service: status.service,
        telegram: status.telegram,
        timestamp: new Date().toISOString()
      }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('P2P Pulse Telegram Bot\n');
  });

  server.listen(port, '0.0.0.0', () => logger.info({ port }, 'Health server listening'));
  return server;
}
