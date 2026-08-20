export const ASSET = 'USDT';

export const FIATS = Object.freeze({
  UAH: { code: 'UAH', symbol: '₴', label: 'Гривня', flag: '🇺🇦', aliases: ['uah', '₴', 'грн', 'гр', 'гривня', 'гривні', 'гривень'] },
  EUR: { code: 'EUR', symbol: '€', label: 'Euro', flag: '🇪🇺', aliases: ['eur', '€', 'euro', 'євро'] },
  PLN: { code: 'PLN', symbol: 'zł', label: 'Złoty', flag: '🇵🇱', aliases: ['pln', 'zł', 'zl', 'злотий', 'злотих'] },
  GBP: { code: 'GBP', symbol: '£', label: 'Pound', flag: '🇬🇧', aliases: ['gbp', '£', 'pound', 'pounds', 'фунт', 'фунтів'] },
  CZK: { code: 'CZK', symbol: 'Kč', label: 'Koruna', flag: '🇨🇿', aliases: ['czk', 'kč', 'kc', 'крона', 'крони', 'крон'] },
  RON: { code: 'RON', symbol: 'lei', label: 'Leu', flag: '🇷🇴', aliases: ['ron', 'lei', 'leu', 'лей', 'леї'] },
  TRY: { code: 'TRY', symbol: '₺', label: 'Lira', flag: '🇹🇷', aliases: ['try', '₺', 'tl', 'lira', 'ліра', 'ліри'] },
  KZT: { code: 'KZT', symbol: '₸', label: 'Tenge', flag: '🇰🇿', aliases: ['kzt', '₸', 'tenge', 'тенге'] },
  GEL: { code: 'GEL', symbol: '₾', label: 'Lari', flag: '🇬🇪', aliases: ['gel', '₾', 'lari', 'ларі'] }
});

// Product decision: USD-like input means USDT amount in this calculator.
export const ASSET_ALIASES = Object.freeze([
  'usdt', 'usd', '$', 'дол', 'дол.', 'долар', 'долари', 'доларів',
  'доллар', 'доллары', 'долларов', 'бакс', 'бакси', 'баксів'
]);

export const RATE_STRATEGIES = Object.freeze({
  BEST: { code: 'BEST', label: 'Найкращий' },
  TOP3: { code: 'TOP3', label: 'Середній 6–25' },
  TOP5: { code: 'TOP5', label: 'Середній TOP‑5' }
});

export function fiatInfo(code) {
  return FIATS[code] ?? FIATS.UAH;
}
