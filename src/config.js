import 'dotenv/config';
import { z } from 'zod';
import { FIATS, RATE_STRATEGIES } from './domain/currencies.js';

const boolNumber = z.coerce.number().min(0).max(1);

const schema = z.object({
  BOT_TOKEN: z.string().min(20),
  ALLOWED_USER_IDS: z.string().optional().default(''),
  DEFAULT_FIAT: z.enum(Object.keys(FIATS)).default('UAH'),
  DEFAULT_MODE: z.enum(['BUY', 'SELL']).default('BUY'),
  DEFAULT_RATE_STRATEGY: z.enum(Object.keys(RATE_STRATEGIES)).default('TOP3'),
  MIN_COMPLETION_RATE: boolNumber.default(0.9),
  BINANCE_BASE_URL: z.string().url().default('https://www.binance.com'),
  BINANCE_TIMEOUT_MS: z.coerce.number().int().min(1000).max(30000).default(8000),
  BINANCE_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info')
});

export function loadConfig() {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const details = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  const env = result.data;
  const allowedUserIds = new Set(
    env.ALLOWED_USER_IDS.split(',').map((v) => v.trim()).filter(Boolean)
  );

  return {
    botToken: env.BOT_TOKEN,
    allowedUserIds,
    defaultFiat: env.DEFAULT_FIAT,
    defaultMode: env.DEFAULT_MODE,
    defaultRateStrategy: env.DEFAULT_RATE_STRATEGY,
    minCompletionRate: env.MIN_COMPLETION_RATE,
    binanceBaseURL: env.BINANCE_BASE_URL,
    binanceTimeoutMs: env.BINANCE_TIMEOUT_MS,
    binanceRetries: env.BINANCE_RETRIES,
    port: env.PORT,
    logLevel: env.LOG_LEVEL
  };
}
