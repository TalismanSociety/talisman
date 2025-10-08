export const DISCOUNT_TIERS = [
  { tier: 0, min: 0n, discount: 0 },
  { tier: 1, min: 100n * 10n ** 18n, discount: 0.25 },
  { tier: 2, min: 1_000n * 10n ** 18n, discount: 0.5 },
  { tier: 3, min: 10_000n * 10n ** 18n, discount: 0.75 },
] as const
