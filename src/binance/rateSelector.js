function inside(value, min, max) {
  if (min !== null && min !== undefined && value < min) return false;
  if (max !== null && max !== undefined && value > max) return false;
  return true;
}

export function isAdEligible(ad, { amount, inputKind, minCompletionRate = 0 }) {
  const fiatAmount = inputKind === 'fiat' ? amount : amount * ad.price;
  const assetAmount = inputKind === 'asset' ? amount : amount / ad.price;

  if (!inside(fiatAmount, ad.minFiat, ad.maxFiat)) return false;
  if (ad.availableAsset !== null && ad.availableAsset !== undefined && assetAmount > ad.availableAsset) return false;
  if (ad.completionRate !== null && ad.completionRate !== undefined && ad.completionRate < minCompletionRate) return false;
  return true;
}

function rank(ads, tradeType) {
  return [...ads].sort((a, b) => tradeType === 'BUY' ? a.price - b.price : b.price - a.price);
}

function strategyWindow(strategy) {
  if (strategy === 'MARKET20') return { skip: 5, take: 20 };
  if (strategy === 'BEST') return { skip: 0, take: 1 };
  if (strategy === 'TOP5') return { skip: 0, take: 5 };
  return { skip: 0, take: 3 };
}

export function selectMarketRate(ads, { tradeType, strategy, amount, inputKind, minCompletionRate = 0.9 }) {
  const quality = ads.filter((ad) => isAdEligible(ad, { amount, inputKind, minCompletionRate }));
  const eligible = quality.length > 0
    ? quality
    : ads.filter((ad) => isAdEligible(ad, { amount, inputKind, minCompletionRate: 0 }));

  if (eligible.length === 0) return null;

  const ranked = rank(eligible, tradeType);
  const { skip, take } = strategyWindow(strategy);
  const selected = ranked.slice(skip, skip + take);
  if (selected.length === 0) return null;

  const rate = selected.reduce((sum, ad) => sum + ad.price, 0) / selected.length;

  return {
    rate,
    selectedAds: selected,
    qualityRelaxed: quality.length === 0,
    requestedCount: take,
    skippedCount: Math.min(skip, ranked.length),
    eligibleCount: ranked.length,
    windowStart: skip + 1,
    windowEnd: skip + selected.length
  };
}
