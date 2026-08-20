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

export function selectMarketRate(ads, { tradeType, strategy, amount, inputKind, minCompletionRate = 0.9 }) {
  // Market benchmark: preserve Binance's own ordering exactly as returned by the P2P search.
  // Skip displayed positions 1–5 and average displayed positions 6–25.
  // Do not re-sort, do not pre-filter by amount limits, and do not pre-filter by completion rate,
  // because any of those operations would change the positions compared with the live Binance list.
  if (strategy === 'TOP3') {
    const selected = ads.slice(5, 25);
    if (selected.length < 20) return null;

    const rate = selected.reduce((sum, ad) => sum + ad.price, 0) / selected.length;
    return {
      rate,
      selectedAds: selected,
      qualityRelaxed: false,
      requestedCount: 20,
      skippedCount: 5,
      eligibleCount: ads.length,
      windowStart: 6,
      windowEnd: 25
    };
  }

  const quality = ads.filter((ad) => isAdEligible(ad, { amount, inputKind, minCompletionRate }));
  const eligible = quality.length > 0
    ? quality
    : ads.filter((ad) => isAdEligible(ad, { amount, inputKind, minCompletionRate: 0 }));

  if (eligible.length === 0) return null;

  const ranked = rank(eligible, tradeType);
  const take = strategy === 'BEST' ? 1 : 5;
  const selected = ranked.slice(0, take);
  const rate = selected.reduce((sum, ad) => sum + ad.price, 0) / selected.length;

  return {
    rate,
    selectedAds: selected,
    qualityRelaxed: quality.length === 0,
    requestedCount: take,
    skippedCount: 0,
    eligibleCount: ranked.length,
    windowStart: 1,
    windowEnd: selected.length
  };
}
