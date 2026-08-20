function firstNumber(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const parsed = Number(String(value).replace('%', '').replace(',', '.'));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizeRate(value) {
  const numeric = firstNumber(value);
  if (numeric === null) return null;
  return numeric > 1 ? numeric / 100 : numeric;
}

function findArray(payload) {
  const candidates = [
    payload,
    payload?.data,
    payload?.data?.data,
    payload?.data?.rows,
    payload?.data?.list,
    payload?.rows,
    payload?.list
  ];
  return candidates.find(Array.isArray) ?? [];
}

function extractPayments(raw) {
  const source = raw.paymentMethods ?? raw.tradeMethods ?? raw.tradeMethodIdentifiers ?? raw.adv?.tradeMethods ?? [];
  const list = Array.isArray(source) ? source : [source];
  return list
    .map((item) => typeof item === 'string' ? item : (item?.identifier ?? item?.tradeMethodIdentifier ?? item?.tradeMethodName))
    .filter(Boolean)
    .map(String);
}

export function normalizeQuotePrice(payload) {
  const data = payload?.data?.data ?? payload?.data ?? payload;
  const price = firstNumber(
    data?.price,
    data?.quotePrice,
    data?.bestPrice,
    data?.referencePrice,
    data?.advPrice,
    typeof data === 'string' || typeof data === 'number' ? data : null
  );
  if (!price || price <= 0) throw new Error('Binance quote response did not contain a valid price.');
  return price;
}

export function normalizeAds(payload) {
  return findArray(payload)
    .map((raw) => {
      const adv = raw?.adv ?? raw;
      const advertiser = raw?.advertiser ?? raw?.merchant ?? {};
      const price = firstNumber(adv?.price, raw?.price, adv?.advPrice);
      if (!price || price <= 0) return null;

      return {
        adNo: String(adv?.adNo ?? adv?.advNo ?? raw?.adNo ?? raw?.advNo ?? ''),
        price,
        merchantName: String(
          advertiser?.nickName ?? advertiser?.merchantName ?? raw?.merchantName ?? raw?.nickName ?? 'Binance P2P'
        ),
        completionRate: normalizeRate(
          advertiser?.monthFinishRate ?? advertiser?.completionRate ?? raw?.completionRate ?? raw?.monthFinishRate
        ),
        minFiat: firstNumber(
          adv?.minSingleTransAmount, adv?.minFiatAmount, adv?.fiatMinLimit, raw?.minSingleTransAmount, raw?.minFiat
        ),
        maxFiat: firstNumber(
          adv?.maxSingleTransAmount, adv?.maxFiatAmount, adv?.fiatMaxLimit, raw?.maxSingleTransAmount, raw?.maxFiat
        ),
        availableAsset: firstNumber(
          adv?.surplusAmount, adv?.tradableQuantity, adv?.availableAmount, raw?.surplusAmount, raw?.availableAsset
        ),
        paymentMethods: extractPayments(raw)
      };
    })
    .filter(Boolean);
}

export function normalizeTradeMethods(payload) {
  return findArray(payload)
    .map((item) => ({
      identifier: String(item?.identifier ?? item?.tradeMethodIdentifier ?? '').trim(),
      name: String(item?.tradeMethodName ?? item?.name ?? item?.identifier ?? '').trim()
    }))
    .filter((item) => item.identifier && item.name);
}
