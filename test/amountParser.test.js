import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAmountInput } from '../src/parser/amountParser.js';

const fiatCases = [
  ['1000₴', 1000, 'UAH'],
  ['1000 грн', 1000, 'UAH'],
  ['1000гр', 1000, 'UAH'],
  ['1000грн', 1000, 'UAH'],
  ['1000 uah', 1000, 'UAH'],
  ['1 000,50 гривень', 1000.5, 'UAH'],
  ['100 €', 100, 'EUR'],
  ['2500 pln', 2500, 'PLN']
];

for (const [input, amount, currency] of fiatCases) {
  test(`parses fiat: ${input}`, () => {
    const result = parseAmountInput(input);
    assert.equal(result.kind, 'fiat');
    assert.equal(result.currency, currency);
    assert.equal(result.amount, amount);
  });
}

const assetCases = ['100 USDT', '100 usdt', '100 usd', '100$', '100 дол', '100 доларів'];
for (const input of assetCases) {
  test(`parses USDT alias: ${input}`, () => {
    const result = parseAmountInput(input);
    assert.equal(result.kind, 'asset');
    assert.equal(result.currency, 'USDT');
    assert.equal(result.amount, 100);
  });
}

test('bare number defaults to USDT', () => {
  assert.equal(parseAmountInput('250').kind, 'asset');
});

test('bare number reuses previous fiat input kind', () => {
  const result = parseAmountInput('250', { selectedFiat: 'EUR', lastInputKind: 'fiat' });
  assert.equal(result.kind, 'fiat');
  assert.equal(result.currency, 'EUR');
});
