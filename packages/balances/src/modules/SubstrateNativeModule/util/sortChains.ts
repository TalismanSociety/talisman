import { subNativeTokenId } from "@talismn/chaindata-provider"

const IMPORTANT_TOKENS = [
  subNativeTokenId("polkadot"),
  subNativeTokenId("kusama"),
  subNativeTokenId("polkadot-asset-hub"),
  subNativeTokenId("kusama-asset-hub"),
  subNativeTokenId("bittensor"),
]

export const sortChainsNativeTokensByPriority = (a: string, b: string) => {
  // polkadot and kusama should be checked first
  if (IMPORTANT_TOKENS.includes(a)) return -1
  if (IMPORTANT_TOKENS.includes(b)) return 1
  return 0
}
