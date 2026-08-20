import { Markup } from 'telegraf';
import { FIATS, RATE_STRATEGIES, fiatInfo } from '../domain/currencies.js';

export function mainKeyboard(session) {
  const buy = session.mode === 'BUY' ? '✅ Купити USDT' : '🟢 Купити USDT';
  const sell = session.mode === 'SELL' ? '✅ Продати USDT' : '🔴 Продати USDT';
  const fiat = fiatInfo(session.fiat);
  const strategy = RATE_STRATEGIES[session.strategy]?.label ?? session.strategy;
  const payment = session.paymentMethodName ?? 'Усі';

  return Markup.inlineKeyboard([
    [Markup.button.callback(buy, 'mode:BUY'), Markup.button.callback(sell, 'mode:SELL')],
    [Markup.button.callback(`${fiat.flag} Валюта: ${session.fiat}`, 'menu:fiat')],
    [Markup.button.callback(`🏦 Оплата: ${payment}`, 'menu:payment')],
    [Markup.button.callback(`📊 Курс: ${strategy}`, 'menu:rate')]
  ]);
}

export function resultKeyboard(session) {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🔄 Оновити', 'action:refresh')],
    [
      Markup.button.callback(session.mode === 'BUY' ? '🔴 На продаж' : '🟢 На купівлю', `mode:${session.mode === 'BUY' ? 'SELL' : 'BUY'}`),
      Markup.button.callback(`💱 ${session.fiat}`, 'menu:fiat')
    ],
    [Markup.button.callback('⚙️ Налаштування', 'menu:main')]
  ]);
}

export function fiatKeyboard(currentFiat) {
  const buttons = Object.values(FIATS).map((fiat) =>
    Markup.button.callback(`${fiat.code === currentFiat ? '✅ ' : ''}${fiat.flag} ${fiat.code}`, `fiat:${fiat.code}`)
  );
  const rows = [];
  for (let i = 0; i < buttons.length; i += 3) rows.push(buttons.slice(i, i + 3));
  rows.push([Markup.button.callback('⬅️ Назад', 'menu:main')]);
  return Markup.inlineKeyboard(rows);
}

export function rateKeyboard(current) {
  const rows = Object.values(RATE_STRATEGIES).map((item) => [
    Markup.button.callback(`${item.code === current ? '✅ ' : ''}${item.label}`, `rate:${item.code}`)
  ]);
  rows.push([Markup.button.callback('⬅️ Назад', 'menu:main')]);
  return Markup.inlineKeyboard(rows);
}

export function paymentKeyboard(session, page = 0) {
  const perPage = 8;
  const options = session.paymentOptions ?? [];
  const pages = Math.max(1, Math.ceil(options.length / perPage));
  const safePage = Math.min(Math.max(page, 0), pages - 1);
  const start = safePage * perPage;
  const visible = options.slice(start, start + perPage);

  const rows = [[Markup.button.callback(`${session.paymentMethod ? '' : '✅ '}Усі методи`, 'pay:all')]];
  for (let i = 0; i < visible.length; i += 2) {
    rows.push(visible.slice(i, i + 2).map((item, offset) => {
      const absoluteIndex = start + i + offset;
      const selected = session.paymentMethod === item.identifier ? '✅ ' : '';
      return Markup.button.callback(`${selected}${item.name}`, `payidx:${absoluteIndex}`);
    }));
  }

  if (pages > 1) {
    rows.push([
      Markup.button.callback(safePage > 0 ? '◀️' : '·', safePage > 0 ? `paypage:${safePage - 1}` : 'noop'),
      Markup.button.callback(`${safePage + 1}/${pages}`, 'noop'),
      Markup.button.callback(safePage < pages - 1 ? '▶️' : '·', safePage < pages - 1 ? `paypage:${safePage + 1}` : 'noop')
    ]);
  }

  rows.push([Markup.button.callback('⬅️ Назад', 'menu:main')]);
  return Markup.inlineKeyboard(rows);
}
