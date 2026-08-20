# Security

- Never commit `BOT_TOKEN` or any Binance/OpenAI secret.
- This bot only uses Binance public P2P market endpoints and does not need a Binance API key.
- Use `ALLOWED_USER_IDS` if the bot is intended for private use.
- Rotate the Telegram token immediately if it is exposed.
- Railway secrets belong in Variables, not in repository files.
