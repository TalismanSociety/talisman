import { remoteConfigStore } from "@core/domains/app/store.remoteConfig"

// === StealthEX fee logic ===

export type FeeRouteAsset = { networkType: "evm" | "substrate" }
export type FeeRouteProps = { fromAsset: FeeRouteAsset; toAsset: FeeRouteAsset }

// StealthEX always includes an affiliate fee of 0.4%
export const STEALTHEX_BUILT_IN_FEE = 0.004

export const getStealthexTalismanTotalFee = ({ fromAsset, toAsset }: FeeRouteProps): number => {
  const isSubToOrFromEvm =
    (fromAsset.networkType === "substrate" && toAsset.networkType === "evm") ||
    (fromAsset.networkType === "evm" && toAsset.networkType === "substrate")

  const isSubToOrFromSub =
    (fromAsset.networkType === "substrate" && toAsset.networkType === "substrate") ||
    (fromAsset.networkType === "substrate" && toAsset.networkType === "substrate")

  const isEvmToOrFromEvm =
    (fromAsset.networkType === "evm" && toAsset.networkType === "evm") ||
    (fromAsset.networkType === "evm" && toAsset.networkType === "evm")

  if (isSubToOrFromEvm) return 0.006 // 0.6% total fee for sub<>evm
  if (isSubToOrFromSub) return 0.005 // 0.5% total fee for sub<>sub
  if (isEvmToOrFromEvm) return STEALTHEX_BUILT_IN_FEE // evm<>evm: 0.4% (minimum StealthEX affiliate fee)
  return 0.01 // 1.0% total fee by default
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

export const getSimpleSwapApiKey = async (route: SimpleSwapRouteProps): Promise<string> =>
  (await isSimpleSwapDiscountedRoute(route))
    ? (await remoteConfigStore.get("swaps")).simpleswapApiKeyDiscounted
    : (await remoteConfigStore.get("swaps")).simpleswapApiKey

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
