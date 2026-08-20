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

function passesQuality(ad, minCompletionRate) {
  return ad.completionRate === null || ad.completionRate === undefined || ad.completionRate >= minCompletionRate;
}

function rank(ads, tradeType) {
  return [...ads].sort((a, b) => tradeType === 'BUY' ? a.price - b.price : b.price - a.price);
}

function strategyWindow(strategy) {
  if (strategy === 'BEST') return { skip: 0, take: 1 };
  if (strategy === 'TOP5') return { skip: 0, take: 5 };
  return { skip: 5, take: 20 };
}

export function selectMarketRate(ads, { tradeType, strategy, amount, inputKind, minCompletionRate = 0.9 }) {
  const isMarketWindow = strategy === 'TOP3';
  let eligible;
  let qualityRelaxed = false;

  if (isMarketWindow) {
    // The 6–25 strategy is a market benchmark, not an executable quote for the entered amount.
    // Do NOT filter by min/max transaction limits before taking positions 6–25,
    // otherwise small inputs (e.g. 113 UAH) collapse the book to a few outlier ads.
    const quality = ads.filter((ad) => passesQuality(ad, minCompletionRate));
    if (quality.length >= 25) {
      eligible = quality;
    } else {
      eligible = ads;
      qualityRelaxed = true;
    }
  } else {
    const quality = ads.filter((ad) => isAdEligible(ad, { amount, inputKind, minCompletionRate }));
    eligible = quality.length > 0
      ? quality
      : ads.filter((ad) => isAdEligible(ad, { amount, inputKind, minCompletionRate: 0 }));
    qualityRelaxed = quality.length === 0;
  }

  if (eligible.length === 0) return null;

  const ranked = rank(eligible, tradeType);
  const { skip, take } = strategyWindow(strategy);
  const selected = ranked.slice(skip, skip + take);
  if (selected.length === 0) return null;

  const rate = selected.reduce((sum, ad) => sum + ad.price, 0) / selected.length;

  return {
    rate,
    selectedAds: selected,
    qualityRelaxed,
    requestedCount: take,
    skippedCount: Math.min(skip, ranked.length),
    eligibleCount: ranked.length,
    windowStart: skip + 1,
    windowEnd: skip + selected.length
  };
}
