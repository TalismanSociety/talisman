import type { RemoteConfigStoreData } from "@core/domains/app/types"
import type { Network, NetworkId, Token, TokenId } from "@talismn/chaindata-provider"
import type { ScaleApi } from "@talismn/sapi"
import type { PublicClient } from "viem"

export type SwapsConfig = RemoteConfigStoreData["swaps"]

/** What a background swap module reads from the realm that runs it */
export type SwapEnv = {
  getNetwork: (networkId: NetworkId) => Promise<Network | null>
  getToken: (tokenId: TokenId) => Promise<Token | null>
  /** rejects for a network that is not an EVM network */
  evmClient: (networkId: NetworkId) => Promise<PublicClient>
  /** rejects for a network that is not a substrate network */
  substrateApi: (networkId: NetworkId) => Promise<ScaleApi>
  /** a fetch that carries the Gandalf token the Talisman API proxies require */
  proxyFetch: typeof fetch
  fetch: typeof fetch
  getSwapsConfig: () => Promise<SwapsConfig>
}
