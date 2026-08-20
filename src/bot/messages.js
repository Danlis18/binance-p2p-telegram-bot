import { RATE_STRATEGIES, fiatInfo } from '../domain/currencies.js';
import { escapeHtml, formatFiat, formatRate, formatUsdt } from '../utils/format.js';

export function welcomeText(session) {
  const fiat = fiatInfo(session.fiat);
  return [
    '⚡️ <b>P2P Pulse</b>',
    '',
    'Швидкий калькулятор Binance P2P без зайвих команд.',
    '',
    '<b>Приклади:</b>',
    '<code>1000₴</code>  <code>1000 грн</code>  <code>1000 uah</code>',
    '<code>100 USDT</code>  <code>100 usd</code>  <code>100$</code>',
    '',
    `Зараз: <b>${session.mode === 'BUY' ? 'купівля' : 'продаж'} USDT</b> · ${fiat.flag} <b>${session.fiat}</b>`,
    'Просто надішли суму 👇'
  ].join('\n');
}

export function settingsText(session) {
  const fiat = fiatInfo(session.fiat);
  const strategy = RATE_STRATEGIES[session.strategy]?.label ?? session.strategy;
  return [
    '⚙️ <b>Налаштування P2P</b>',
    '',
    `Режим: <b>${session.mode === 'BUY' ? '🟢 Купити USDT' : '🔴 Продати USDT'}</b>`,
    `Валюта: ${fiat.flag} <b>${session.fiat}</b>`,
    `Метод оплати: <b>${escapeHtml(session.paymentMethodName ?? 'Усі')}</b>`,
    `Розрахунок курсу: <b>${strategy}</b>`,
    '',
    'Надішли суму будь-яким звичним форматом.'
  ].join('\n');
}

export function resultText({ session, parsed, quote }) {
  const isBuy = session.mode === 'BUY';
  const title = isBuy ? '🟢 <b>Купівля USDT</b>' : '🔴 <b>Продаж USDT</b>';
  const rate = quote.rate;
  const from = parsed.kind === 'asset' ? formatUsdt(parsed.amount) : formatFiat(parsed.amount, session.fiat);
  const converted = parsed.kind === 'asset' ? parsed.amount * rate : parsed.amount / rate;
  const to = parsed.kind === 'asset' ? formatFiat(converted, session.fiat) : formatUsdt(converted);
  const strategy = RATE_STRATEGIES[session.strategy]?.label ?? session.strategy;
  const source = quote.source === 'ads'
    ? `Binance P2P · ${strategy}${quote.selectedAds.length ? ` · ${quote.selectedAds.length} огол.` : ''}`
    : 'Binance P2P · швидка котировка';
  const payment = session.paymentMethodName ? ` · ${escapeHtml(session.paymentMethodName)}` : '';

  const lines = [
    title,
    '',
    `<b>${from} ≈ ${to}</b>`,
    '',
    `Курс: <code>${formatRate(rate, session.fiat)}</code>`,
    `Джерело: ${source}${payment}`
  ];

  if (quote.qualityRelaxed) {
    lines.push('⚠️ Для цієї суми не вистачило оголошень із заданим quality-фільтром — використано доступні валідні оголошення.');
  }
  if (quote.source === 'quote') {
    lines.push('ℹ️ Не знайдено оголошення, що точно підходить під ліміт суми; показана індикативна P2P-котировка.');
  }

  lines.push('', '<i>Курс динамічний і може змінитися до моменту угоди.</i>');
  return lines.join('\n');
}

export const helpText = [
  'ℹ️ <b>Як користуватися</b>',
  '',
  '1. Обери <b>Купити</b> або <b>Продати USDT</b>.',
  '2. Обери фіат і, за бажанням, метод оплати.',
  '3. Напиши суму: <code>2500 грн</code>, <code>100€</code>, <code>50 USDT</code>, <code>100$</code>.',
  '',
  '<b>Важливо:</b> у цьому боті <code>$</code> і <code>USD</code> трактуються як сума USDT — спеціально для швидкої P2P-конвертації.'
].join('\n');
