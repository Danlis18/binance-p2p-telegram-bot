import { TTLCache } from '../utils/cache.js';
import { selectMarketRate } from './rateSelector.js';

export class P2PRateService {
  constructor({ client, logger, minCompletionRate }) {
    this.client = client;
    this.logger = logger;
    this.minCompletionRate = minCompletionRate;
    this.cache = new TTLCache();
  }

  async getTradeMethods(fiat) {
    const key = `methods:${fiat}`;
    const cached = this.cache.get(key);
    if (cached) return cached;
    const methods = await this.client.getTradeMethods(fiat);
    return this.cache.set(key, methods, 60 * 60 * 1000);
  }

  async #getAds({ fiat, tradeType, paymentMethod }) {
    const key = `ads:${fiat}:${tradeType}:${paymentMethod ?? 'ALL'}`;
    const cached = this.cache.get(key);
    if (cached) return cached;
    const ads = await this.client.getAds({ fiat, tradeType, paymentMethod, limit: 20 });
    return this.cache.set(key, ads, 6_000);
  }

  async #getQuote({ fiat, tradeType }) {
    const key = `quote:${fiat}:${tradeType}`;
    const cached = this.cache.get(key);
    if (cached) return cached;
    const price = await this.client.getQuotePrice({ fiat, tradeType });
    return this.cache.set(key, price, 4_000);
  }

  async getMarketRate({ fiat, tradeType, paymentMethod, strategy, amount, inputKind }) {
    try {
      const ads = await this.#getAds({ fiat, tradeType, paymentMethod });
      const selected = selectMarketRate(ads, {
        tradeType,
        strategy,
        amount,
        inputKind,
        minCompletionRate: this.minCompletionRate
      });
      if (selected) {
        return {
          ...selected,
          source: 'ads',
          paymentMethod: paymentMethod ?? null
        };
      }
      this.logger.info({ fiat, tradeType, amount, inputKind }, 'No amount-matched P2P ads, using quote fallback');
    } catch (error) {
      this.logger.warn({ err: error?.message, fiat, tradeType }, 'P2P ad list unavailable, using quote fallback');
    }

    const rate = await this.#getQuote({ fiat, tradeType });
    return {
      rate,
      selectedAds: [],
      qualityRelaxed: false,
      requestedCount: 0,
      source: 'quote',
      paymentMethod: paymentMethod ?? null
    };
  }
}
