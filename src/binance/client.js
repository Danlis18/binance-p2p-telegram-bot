import axios from 'axios';
import { normalizeAds, normalizeQuotePrice, normalizeTradeMethods } from './normalizers.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class BinanceP2PClient {
  constructor({ baseURL, timeoutMs, retries, logger }) {
    this.logger = logger;
    this.retries = retries;
    this.http = axios.create({
      baseURL,
      timeout: timeoutMs,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'p2p-pulse-telegram-bot/1.0.0'
      }
    });
  }

  async #get(path, params) {
    let lastError;
    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      try {
        const response = await this.http.get(path, { params });
        return response.data;
      } catch (error) {
        lastError = error;
        const status = error?.response?.status;
        const retryable = !status || status === 429 || status >= 500;
        if (!retryable || attempt >= this.retries) break;
        const delay = 250 * (2 ** attempt) + Math.floor(Math.random() * 200);
        this.logger.warn({ status, attempt: attempt + 1, path }, 'Binance request retry');
        await sleep(delay);
      }
    }
    throw lastError;
  }

  async checkVersion() {
    try {
      const payload = await this.#get('/bapi/c2c/v1/public/c2c/agent/check-version', { version: '2.0.0' });
      const data = payload?.data ?? payload;
      return data?.needUpdate ? data : null;
    } catch (error) {
      this.logger.debug({ err: error?.message }, 'Binance P2P version check skipped');
      return null;
    }
  }

  async getQuotePrice({ fiat, asset = 'USDT', tradeType }) {
    const payload = await this.#get('/bapi/c2c/v1/public/c2c/agent/quote-price', { fiat, asset, tradeType });
    return normalizeQuotePrice(payload);
  }

  async getAds({ fiat, asset = 'USDT', tradeType, limit = 20, paymentMethod = null }) {
    const params = { fiat, asset, tradeType, limit };
    if (paymentMethod) params.tradeMethodIdentifiers = paymentMethod;
    const payload = await this.#get('/bapi/c2c/v1/public/c2c/agent/ad-list', params);
    return normalizeAds(payload);
  }

  async getTradeMethods(fiat) {
    const payload = await this.#get('/bapi/c2c/v1/public/c2c/agent/trade-methods', { fiat });
    return normalizeTradeMethods(payload);
  }
}
