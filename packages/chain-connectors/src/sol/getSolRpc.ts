import type { Rpc, RpcTransport, SolanaRpcApi } from "@solana/kit"
import { createDefaultRpcTransport, createSolanaRpcFromTransport } from "@solana/kit"
import type { SolNetworkId } from "@talismn/chaindata-provider"

export type SolRpc = Rpc<SolanaRpcApi>

// TODO leverage multiple rpcs with fallback
export const getSolTransport = (_networkId: SolNetworkId, rpcs: string[]): RpcTransport =>
  createDefaultRpcTransport({ url: rpcs[0] })

export const getSolRpc = (networkId: SolNetworkId, rpcs: string[]): SolRpc =>
  createSolanaRpcFromTransport(getSolTransport(networkId, rpcs))
