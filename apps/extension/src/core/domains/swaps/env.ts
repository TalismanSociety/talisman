import type { Network, NetworkId, Token, TokenId } from "@talismn/chaindata-provider"
import type { ScaleApi } from "@talismn/sapi"
import type { Hex, PublicClient } from "viem"

/** the events one extrinsic emitted, decoded with the network's metadata */
export type ExtrinsicEvents = {
  blockNumber: number
  success: boolean
  events: { pallet: string; name: string; value: unknown }[]
}

/** What a background swap module reads from the realm that runs it */
export type SwapEnv = {
  getNetwork: (networkId: NetworkId) => Promise<Network | null>
  getToken: (tokenId: TokenId) => Promise<Token | null>
  /** rejects for a network that is not an EVM network */
  evmClient: (networkId: NetworkId) => Promise<PublicClient>
  /** rejects for a network that is not a substrate network */
  substrateApi: (networkId: NetworkId) => Promise<ScaleApi>
  /** a raw JSON-RPC call to a substrate network */
  substrateSend: <T>(networkId: NetworkId, method: string, params: unknown[]) => Promise<T>
  /**
   * the extrinsic's outcome and events in that block, null when the block does not hold it. Rejects
   * when the block holds it without a readable outcome. Background only
   */
  decodeExtrinsicEvents: (
    networkId: NetworkId,
    blockHash: Hex,
    extrinsicHash: Hex
  ) => Promise<ExtrinsicEvents | null>
  /** a fetch that carries the Gandalf token the Talisman API proxies require */
  proxyFetch: typeof fetch
}
