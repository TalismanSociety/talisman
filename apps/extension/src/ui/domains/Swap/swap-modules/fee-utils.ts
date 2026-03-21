import { remoteConfigStore } from "@core/domains/app/store.remoteConfig"

// === StealthEX fee logic ===

export type FeeRouteAsset = { platform: "ethereum" | "polkadot" | "solana" }
export type FeeRouteProps = { fromAsset: FeeRouteAsset; toAsset: FeeRouteAsset }

// StealthEX always includes an affiliate fee of 0.4%
export const STEALTHEX_BUILT_IN_FEE = 0.004

export const getStealthexTalismanTotalFee = ({ fromAsset, toAsset }: FeeRouteProps): number => {
  const from = fromAsset.platform
  const to = toAsset.platform

  const isSamePlatform = from === to
  if (isSamePlatform) {
    switch (from) {
      case "ethereum":
        return STEALTHEX_BUILT_IN_FEE // 0.4% for evm↔evm
      case "polkadot":
        return 0.005 // 0.5% for sub↔sub
      case "solana":
        return 0.005 // 0.5% for sol↔sol
    }
  }

  // Cross-platform routes
  const platforms = new Set([from, to])
  if (platforms.has("polkadot") && platforms.has("ethereum")) return 0.006 // 0.6% for sub↔evm
  if (platforms.has("solana") && platforms.has("ethereum")) return 0.006 // 0.6% for sol↔evm
  if (platforms.has("solana") && platforms.has("polkadot")) return 0.006 // 0.6% for sol↔sub

  return 0.01 // 1.0% fallback for unknown platforms
}

export const getStealthexAdditionalFee = (feeProps: FeeRouteProps): number =>
  Math.max(getStealthexTalismanTotalFee(feeProps) - STEALTHEX_BUILT_IN_FEE, 0)

// Our UI represents a 1% fee as `0.01`, but the StealthEX api represents a 1% fee as `1.0`.
export const decimalToPercent = (decimal: number): number => Math.round(decimal * 100 * 100) / 100

export const getStealthexAdditionalFeePercent = (feeProps: FeeRouteProps): number =>
  decimalToPercent(getStealthexAdditionalFee(feeProps))

// === SimpleSwap fee logic ===

export const SIMPLESWAP_TALISMAN_FEE = 0.015
export const SIMPLESWAP_TALISMAN_FEE_DISCOUNTED = 0.004

export type SimpleSwapRouteProps = { currencyFrom: string; currencyTo: string }

export const isSimpleSwapDiscountedRoute = async ({
  currencyFrom,
  currencyTo,
}: SimpleSwapRouteProps): Promise<boolean> => {
  const { simpleswapDiscountedCurrencies: discounted = [] } = await remoteConfigStore.get("swaps")
  return discounted.includes(currencyFrom) || discounted.includes(currencyTo)
}

export const getSimpleSwapTalismanFee = async (route: SimpleSwapRouteProps): Promise<number> =>
  (await isSimpleSwapDiscountedRoute(route))
    ? SIMPLESWAP_TALISMAN_FEE_DISCOUNTED
    : SIMPLESWAP_TALISMAN_FEE

export const getSimpleSwapApiKey = async (route: SimpleSwapRouteProps): Promise<string> => {
  const swaps = await remoteConfigStore.get("swaps")
  return (await isSimpleSwapDiscountedRoute(route))
    ? (swaps.simpleswapApiKeyDiscounted ?? "")
    : (swaps.simpleswapApiKey ?? "")
}

// === LI.FI fee logic ===

export const LIFI_TALISMAN_FEE = 0.002
export const LIFI_PROTOCOL_FEE = 0.0025

export type LifiRouteProps = {
  fromAssetId?: string
  toAssetId?: string
}

export const getLifiCustomFeeForRoute = async ({
  fromAssetId,
  toAssetId,
}: LifiRouteProps): Promise<number | undefined> => {
  const lifiCustomFeeTokens = (await remoteConfigStore.get("swaps"))?.lifiCustomFeeTokens ?? {}

  // prefer toAsset fee
  const toFee = toAssetId && lifiCustomFeeTokens[toAssetId]
  if (typeof toFee === "number") return toFee

  // fall back to fromAsset fee
  const fromFee = fromAssetId && lifiCustomFeeTokens[fromAssetId]
  if (typeof fromFee === "number") return fromFee

  // use default fee
  return undefined
}

export const getLifiTalismanFee = async (route: LifiRouteProps): Promise<number> => {
  const customFee = await getLifiCustomFeeForRoute(route)
  if (customFee !== undefined) return customFee
  return LIFI_TALISMAN_FEE
}
