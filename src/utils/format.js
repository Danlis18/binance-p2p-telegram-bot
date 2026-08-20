import { fiatInfo } from '../domain/currencies.js';

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export function formatNumber(value, maxFractionDigits = 2) {
  return new Intl.NumberFormat('uk-UA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits
  }).format(value);
}

export function formatFiat(value, code) {
  const info = fiatInfo(code);
  return `${formatNumber(value, 2)} ${info.symbol}`;
}

export function formatUsdt(value) {
  return `${formatNumber(value, value < 10 ? 4 : 2)} USDT`;
}

export function formatRate(value, fiat) {
  return `${formatNumber(value, 4)} ${fiat} / USDT`;
}
