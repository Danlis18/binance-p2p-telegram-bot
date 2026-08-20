import pino from 'pino';
import { loadConfig } from './config.js';
import { BinanceP2PClient } from './binance/client.js';
import { P2PRateService } from './binance/rateService.js';
import { createBot } from './bot/createBot.js';
import { startHealthServer } from './server.js';

const config = loadConfig();
const logger = pino({
  level: config.logLevel,
  redact: {
    paths: ['botToken', 'token', '*.token', 'req.headers.authorization'],
    censor: '[REDACTED]'
  }
});

const client = new BinanceP2PClient({
  baseURL: config.binanceBaseURL,
  timeoutMs: config.binanceTimeoutMs,
  retries: config.binanceRetries,
  logger
});

const rateService = new P2PRateService({
  client,
  logger,
  minCompletionRate: config.minCompletionRate
});

const bot = createBot({ config, rateService, logger });
let botStarted = false;

const server = startHealthServer({
  port: config.port,
  logger,
  getStatus: () => ({ ok: botStarted, service: 'p2p-pulse', telegram: botStarted ? 'running' : 'starting' })
});

const version = await client.checkVersion();
if (version) logger.warn({ latestVersion: version.latestVersion, clientVersion: version.clientVersion }, 'Binance P2P API skill version update available');

await bot.launch({ dropPendingUpdates: false });
botStarted = true;
logger.info('P2P Pulse Telegram bot started');

let stopping = false;
async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  logger.info({ signal }, 'Graceful shutdown started');
  botStarted = false;
  bot.stop(signal);
  await new Promise((resolve) => server.close(resolve));
  logger.info('Shutdown complete');
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
