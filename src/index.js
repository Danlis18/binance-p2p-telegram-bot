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
let stopping = false;

const server = startHealthServer({
  port: config.port,
  logger,
  getStatus: () => ({
    ok: botStarted,
    service: 'p2p-pulse',
    telegram: botStarted ? 'running' : 'starting'
  })
});

async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  botStarted = false;
  logger.info({ signal }, 'Graceful shutdown started');

  try {
    bot.stop(signal);
  } catch (error) {
    logger.debug({ err: error?.message }, 'Telegram bot was not running during shutdown');
  }

  await new Promise((resolve) => server.close(resolve));
  logger.info('Shutdown complete');
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

const version = await client.checkVersion();
if (version) {
  logger.warn(
    { latestVersion: version.latestVersion, clientVersion: version.clientVersion },
    'Binance P2P API skill version update available'
  );
}

// Validate Telegram credentials first. Telegraf's launch() promise stays pending
// for the lifetime of long polling, so it must not be awaited before readiness
// is updated.
const me = await bot.telegram.getMe();
logger.info({ botUsername: me.username }, 'Telegram credentials verified');

const polling = bot.launch({ dropPendingUpdates: false });
botStarted = true;
logger.info('P2P Pulse Telegram bot started');

polling.catch(async (error) => {
  botStarted = false;
  logger.error({ err: error }, 'Telegram polling stopped unexpectedly');

  if (!stopping) {
    await shutdown('BOT_ERROR');
    process.exitCode = 1;
  }
});
