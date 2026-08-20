# ⚡ P2P Pulse — Binance P2P Telegram Bot

Production-ready Telegram calculator for **Binance P2P USDT ↔ fiat** rates.

The UX is intentionally simple: select **Buy / Sell USDT**, then send `1000₴`, `1000 грн`, `100 USDT`, `100 usd`, `100$`, `100€`, etc.

## Highlights

- Public Binance P2P API — **no Binance API key required** for market quotes.
- BUY / SELL modes with one-tap switching.
- UAH, EUR, PLN, GBP, CZK, RON, TRY, KZT, GEL.
- Natural amount parser for Ukrainian/English currency aliases and localized numbers.
- Auto-switches fiat when a supported fiat unit is typed.
- Dynamic Binance payment-method list instead of hardcoded bank names.
- BEST / TOP‑3 / TOP‑5 pricing strategies.
- Transaction-limit aware ad selection.
- Advertiser completion-rate quality filter.
- Quote fallback when no ad exactly matches the requested amount.
- Short TTL cache to reduce Binance load without showing stale rates.
- Retries/backoff for temporary Binance failures and 429/5xx responses.
- Per-user anti-spam limiter.
- Optional Telegram user allowlist for private bots.
- Structured Pino logs with token redaction.
- `/health` endpoint and graceful shutdown for Railway/Docker.
- Unit tests + GitHub Actions CI.

## Binance endpoints

The project uses Binance's public C2C Agent API:

- `GET /bapi/c2c/v1/public/c2c/agent/quote-price`
- `GET /bapi/c2c/v1/public/c2c/agent/ad-list`
- `GET /bapi/c2c/v1/public/c2c/agent/trade-methods`

Base URL: `https://www.binance.com`

## Product rules

For this calculator, `$`, `USD`, `дол`, `доларів` are intentionally treated as **USDT amount aliases**. This matches the fast P2P conversion workflow.

Examples:

| Input | BUY mode | SELL mode |
|---|---|---|
| `100 USDT` | Fiat needed to buy 100 USDT | Fiat received for selling 100 USDT |
| `1000 грн` | USDT purchasable for 1000 UAH | USDT to sell to receive ≈1000 UAH |
| `100$` | Same as 100 USDT | Same as 100 USDT |
| `100€` | Auto-switch to EUR and calculate | Auto-switch to EUR and calculate |

## Quick start

### 1. Create Telegram bot

Open `@BotFather` → `/newbot` → copy the bot token.

### 2. Configure

```bash
cp .env.example .env
```

Set:

```env
BOT_TOKEN=your_telegram_bot_token
```

For a private bot, also set your Telegram numeric user ID:

```env
ALLOWED_USER_IDS=123456789
```

Multiple IDs:

```env
ALLOWED_USER_IDS=123456789,987654321
```

### 3. Run locally

Requires Node.js 22+.

```bash
npm install
npm test
npm run check
npm start
```

## Railway deployment

1. Push this repository to GitHub.
2. In Railway create **New Project → Deploy from GitHub Repo**.
3. Select `binance-p2p-telegram-bot`.
4. Add Railway Variables:

```env
BOT_TOKEN=...
ALLOWED_USER_IDS=...
DEFAULT_FIAT=UAH
DEFAULT_MODE=BUY
DEFAULT_RATE_STRATEGY=TOP3
MIN_COMPLETION_RATE=0.90
```

5. Deploy. Railway uses the included `Dockerfile` and checks `/health`.

You do **not** need a public custom domain for Telegram long polling; Railway can run the service continuously.

## Environment variables

| Variable | Required | Default | Purpose |
|---|---:|---|---|
| `BOT_TOKEN` | yes | — | Telegram token from BotFather |
| `ALLOWED_USER_IDS` | no | empty | Private access allowlist |
| `DEFAULT_FIAT` | no | `UAH` | Default fiat |
| `DEFAULT_MODE` | no | `BUY` | `BUY` or `SELL` |
| `DEFAULT_RATE_STRATEGY` | no | `TOP3` | `BEST`, `TOP3`, `TOP5` |
| `MIN_COMPLETION_RATE` | no | `0.90` | Advertiser quality threshold |
| `BINANCE_BASE_URL` | no | official Binance | Public P2P host |
| `BINANCE_TIMEOUT_MS` | no | `8000` | HTTP timeout |
| `BINANCE_RETRIES` | no | `2` | Retry count |
| `PORT` | no | `3000` | Health server port |
| `LOG_LEVEL` | no | `info` | Pino log level |

## Architecture

```text
src/
├── binance/
│   ├── client.js          # Public Binance API + retry logic
│   ├── normalizers.js     # Defensive Binance response normalization
│   ├── rateSelector.js    # Limits, quality, BEST/TOP-N selection
│   └── rateService.js     # Cache + quote fallback
├── bot/
│   ├── createBot.js       # Telegram handlers
│   ├── keyboards.js       # Inline UI
│   ├── messages.js        # User-facing copy
│   └── session.js         # Per-user state defaults
├── domain/
│   └── currencies.js      # Fiat catalog + aliases
├── parser/
│   └── amountParser.js    # Deterministic natural amount parser
├── utils/
│   ├── cache.js
│   └── format.js
├── config.js
├── server.js              # Railway health endpoint
└── index.js
```

## Commands

- `/start` — main screen
- `/settings` — current mode/currency/payment/rate strategy
- `/help` — examples and parsing rules

Everything else is amount input.

## Notes

P2P prices are dynamic. The bot is a calculator and market-data interface, not an order execution system. It does not place P2P orders or move funds.
