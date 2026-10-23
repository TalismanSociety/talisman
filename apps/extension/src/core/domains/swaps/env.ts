import type { Network, NetworkId, Token, TokenId } from "@talismn/chaindata-provider"
import type { ScaleApi } from "@talismn/sapi"
import type { PublicClient } from "viem"

/** What a background swap module reads from the realm that runs it */
export type SwapEnv = {
  getNetwork: (networkId: NetworkId) => Promise<Network | null>
  getToken: (tokenId: TokenId) => Promise<Token | null>
  /** rejects for a network that is not an EVM network */
  evmClient: (networkId: NetworkId) => Promise<PublicClient>
  /** rejects for a network that is not a substrate network */
  substrateApi: (networkId: NetworkId) => Promise<ScaleApi>
}
