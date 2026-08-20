export function createInitialSession(config) {
  return {
    mode: config.defaultMode,
    fiat: config.defaultFiat,
    strategy: config.defaultRateStrategy,
    paymentMethod: null,
    paymentMethodName: null,
    paymentOptions: [],
    paymentPage: 0,
    lastInputKind: null,
    lastQuery: null
  };
}
