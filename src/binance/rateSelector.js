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
  const quality = ads.filter((ad) => isAdEligible(ad, { amount, inputKind, minCompletionRate }));
  const eligible = quality.length > 0
    ? quality
    : ads.filter((ad) => isAdEligible(ad, { amount, inputKind, minCompletionRate: 0 }));

  if (eligible.length === 0) return null;

  const ranked = rank(eligible, tradeType);
  const take = strategy === 'BEST' ? 1 : strategy === 'TOP5' ? 5 : 3;
  const selected = ranked.slice(0, take);
  const rate = selected.reduce((sum, ad) => sum + ad.price, 0) / selected.length;

  return {
    rate,
    selectedAds: selected,
    qualityRelaxed: quality.length === 0,
    requestedCount: take
  };
}
