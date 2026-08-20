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
    this.deepHttp = axios.create({
      baseURL: 'https://p2p.binance.com',
      timeout: timeoutMs,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
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

  async #postDeep(path, data) {
    let lastError;
    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      try {
        const response = await this.deepHttp.post(path, data);
        return response.data;
      } catch (error) {
        lastError = error;
        const status = error?.response?.status;
        const retryable = !status || status === 429 || status >= 500;
        if (!retryable || attempt >= this.retries) break;
        const delay = 300 * (2 ** attempt) + Math.floor(Math.random() * 200);
        this.logger.warn({ status, attempt: attempt + 1, path }, 'Binance deep-market request retry');
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

  async getDeepAds({ fiat, asset = 'USDT', tradeType, paymentMethod = null, pages = 2, rows = 20 }) {
    const collected = [];
    const seen = new Set();
    const safePages = Math.max(1, Math.min(Number(pages) || 2, 4));
    const safeRows = Math.max(1, Math.min(Number(rows) || 20, 20));

    for (let page = 1; page <= safePages; page += 1) {
      const payload = await this.#postDeep('/bapi/c2c/v2/friendly/c2c/adv/search', {
        page,
        rows: safeRows,
        payTypes: paymentMethod ? [paymentMethod] : [],
        countries: [],
        publisherType: null,
        proMerchantAds: false,
        asset,
        fiat,
        tradeType
      });
      const ads = normalizeAds(payload);
      for (const ad of ads) {
        const key = ad.adNo || `${ad.merchantName}:${ad.price}:${ad.minFiat}:${ad.maxFiat}`;
        if (seen.has(key)) continue;
        seen.add(key);
        collected.push(ad);
      }
      if (ads.length < safeRows) break;
      if (page < safePages) await sleep(120);
    }

    return collected;
  }

  async getTradeMethods(fiat) {
    const payload = await this.#get('/bapi/c2c/v1/public/c2c/agent/trade-methods', { fiat });
    return normalizeTradeMethods(payload);
  }
}
