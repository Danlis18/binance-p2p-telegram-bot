import { ASSET, ASSET_ALIASES, FIATS } from '../domain/currencies.js';

export class AmountParseError extends Error {}

function normalizeText(value) {
  return value
    .toLowerCase()
    .replace(/[\u00a0\u202f]/g, ' ')
    .replace(/[“”„]/g, '"')
    .trim();
}

function parseLocalizedNumber(raw) {
  let value = raw.replace(/[\s\u00a0\u202f]/g, '');
  if (!value) throw new AmountParseError('Не бачу суму.');

  const commas = (value.match(/,/g) || []).length;
  const dots = (value.match(/\./g) || []).length;

  if (commas && dots) {
    const decimalSep = value.lastIndexOf(',') > value.lastIndexOf('.') ? ',' : '.';
    const thousandSep = decimalSep === ',' ? '.' : ',';
    value = value.split(thousandSep).join('');
    value = value.replace(decimalSep, '.');
  } else if (commas || dots) {
    const sep = commas ? ',' : '.';
    const count = commas || dots;
    const parts = value.split(sep);

    if (count > 1) {
      const allThousands = parts.slice(1).every((part) => part.length === 3);
      value = allThousands ? parts.join('') : `${parts.slice(0, -1).join('')}.${parts.at(-1)}`;
    } else {
      const [left, right = ''] = parts;
      const looksLikeThousands = right.length === 3 && left.length >= 1 && left.length <= 3;
      value = looksLikeThousands ? `${left}${right}` : `${left}.${right}`;
    }
  }

  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AmountParseError('Сума має бути більшою за 0.');
  }
  if (amount > 1_000_000_000) {
    throw new AmountParseError('Сума занадто велика.');
  }
  return amount;
}

function hasAlias(text, alias) {
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (/^[a-zа-яіїєґ]+\.?$/iu.test(alias)) {
    return new RegExp(`(^|[^\\p{L}])${escaped}(?=$|[^\\p{L}])`, 'iu').test(text);
  }
  return text.includes(alias);
}

function detectUnit(text) {
  for (const alias of ASSET_ALIASES) {
    if (hasAlias(text, alias)) return { kind: 'asset', currency: ASSET, rawUnit: alias };
  }

  for (const fiat of Object.values(FIATS)) {
    for (const alias of [fiat.code.toLowerCase(), ...fiat.aliases]) {
      if (hasAlias(text, alias.toLowerCase())) {
        return { kind: 'fiat', currency: fiat.code, rawUnit: alias };
      }
    }
  }
  return null;
}

export function parseAmountInput(input, { selectedFiat = 'UAH', lastInputKind = null } = {}) {
  const text = normalizeText(String(input ?? ''));
  const numberMatch = text.match(/\d[\d\s.,]*/u);
  if (!numberMatch) throw new AmountParseError('Напиши суму, наприклад: 1000 грн або 100 USDT.');

  const amount = parseLocalizedNumber(numberMatch[0]);
  const unit = detectUnit(text);

  if (unit) {
    return { amount, ...unit, explicitUnit: true, original: input };
  }

  if (lastInputKind === 'fiat') {
    return { amount, kind: 'fiat', currency: selectedFiat, rawUnit: '', explicitUnit: false, original: input };
  }

  return { amount, kind: 'asset', currency: ASSET, rawUnit: '', explicitUnit: false, original: input };
}
