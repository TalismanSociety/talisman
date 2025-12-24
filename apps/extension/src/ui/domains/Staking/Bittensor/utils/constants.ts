import { subNativeTokenId } from "@talismn/chaindata-provider"

import { RootClaimType } from "../../hooks/bittensor/dTao/types"

export const ROOT_NETUID = 0
export const DEFAULT_USER_MAX_SLIPPAGE = 0.5 // 0.5%
export const HIGH_PRICE_IMPACT = 2
export const VERY_HIGH_PRICE_IMPACT = 5
export const BITTENSOR_TOKEN_ID = subNativeTokenId("bittensor")

export const TALISMAN_FEE_RECEIVER_ADDRESS_BITTENSOR =
  "5DzsVV2L4M9r4uWoyarzPyhfeCv6DDAEs5rM2bpHjmerPcGa"

export const TALISMAN_FEE_BITTENSOR = 0.3

export const DEFAULT_ROOT_CLAIM_TYPE: RootClaimType = "Swap"
