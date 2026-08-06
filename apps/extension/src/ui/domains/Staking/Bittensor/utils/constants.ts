export const ROOT_NETUID = 0
export const DEFAULT_USER_MAX_SLIPPAGE = 0.5 // 0.5%
export const HIGH_PRICE_IMPACT = 2
export const VERY_HIGH_PRICE_IMPACT = 5

export const TALISMAN_FEE_RECEIVER_ADDRESS_BITTENSOR =
  "5DzsVV2L4M9r4uWoyarzPyhfeCv6DDAEs5rM2bpHjmerPcGa"

export const TALISMAN_FEE_BITTENSOR = 0.3

/** which UI a staking operation originates from: the staking wizard, or the TAO dashboard's buy/sell wizard */
export type RemarkType = "stake" | "swap"

// remarks batched with staking extrinsics, so on-chain volume can be attributed to the UI it originates from
export const DTAO_STAKING_REMARKS: Record<RemarkType, string> = {
  stake: "chili001",
  swap: "garlic002",
}
