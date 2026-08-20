import test from 'node:test';
import assert from 'node:assert/strict';
import { selectMarketRate } from '../src/binance/rateSelector.js';

const ads = [
  { price: 40.2, minFiat: 500, maxFiat: 50000, availableAsset: 1000, completionRate: 0.99 },
  { price: 40.4, minFiat: 100, maxFiat: 50000, availableAsset: 1000, completionRate: 0.98 },
  { price: 40.3, minFiat: 100, maxFiat: 50000, availableAsset: 1000, completionRate: 0.97 },
  { price: 39.9, minFiat: 10000, maxFiat: 50000, availableAsset: 1000, completionRate: 0.99 },
  { price: 41.0, minFiat: 100, maxFiat: 50000, availableAsset: 1000, completionRate: 0.50 }
];

test('BUY best chooses lowest eligible quality price', () => {
  const result = selectMarketRate(ads, { tradeType: 'BUY', strategy: 'BEST', amount: 1000, inputKind: 'fiat', minCompletionRate: 0.9 });
  assert.equal(result.rate, 40.2);
});

test('SELL best chooses highest eligible quality price', () => {
  const result = selectMarketRate(ads, { tradeType: 'SELL', strategy: 'BEST', amount: 1000, inputKind: 'fiat', minCompletionRate: 0.9 });
  assert.equal(result.rate, 40.4);
});

test('TOP3 averages three ranked eligible ads', () => {
  const result = selectMarketRate(ads, { tradeType: 'BUY', strategy: 'TOP3', amount: 1000, inputKind: 'fiat', minCompletionRate: 0.9 });
  assert.equal(Number(result.rate.toFixed(2)), 40.3);
  assert.equal(result.selectedAds.length, 3);
});

test('respects transaction min limit for asset input', () => {
  const result = selectMarketRate(ads, { tradeType: 'BUY', strategy: 'BEST', amount: 5, inputKind: 'asset', minCompletionRate: 0.9 });
  assert.equal(result.rate, 40.3);
});
