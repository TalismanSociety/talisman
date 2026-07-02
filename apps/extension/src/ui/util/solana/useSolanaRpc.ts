import type { SolRpcRequest } from "@core/domains/solana/exports"
import type { RpcTransport } from "@solana/kit"
import { createSolanaRpcFromTransport } from "@solana/kit"
import { parseJsonWithBigInts } from "@solana/rpc-spec-types"
import type { IChainConnectorSol, SolRpc } from "@talismn/chain-connectors"
import type { SolNetworkId } from "@talismn/chaindata-provider"
import { api } from "@ui/api"
import { useMemo } from "react"

/**
 * Kit transport that relays all JSON-RPC requests through the extension's background script.
 * The response envelope travels as raw JSON text so lossless bigints survive the messaging boundary.
 */
const createBackgroundRpcTransport = (networkId: string): RpcTransport => {
  const transport = async ({ payload }: Parameters<RpcTransport>[0]) => {
    const { id, method, params } = payload as SolRpcRequest

    const { rawJson } = await api.solSend(networkId, { id, method, params })

    const response = parseJsonWithBigInts(rawJson) as Record<string, unknown>

    // override the id to match the request (another id may have been used when the backend proxied the request)
    return { ...response, id }
  }
  return transport as RpcTransport
}

const RPC_CACHE = new Map<string, SolRpc>()

export const getFrontEndSolanaRpc = (networkId: string | null | undefined) => {
  if (!networkId) return null

  if (!RPC_CACHE.has(networkId))
    RPC_CACHE.set(networkId, createSolanaRpcFromTransport(createBackgroundRpcTransport(networkId)))

  return RPC_CACHE.get(networkId)!
}

export const useSolanaRpc = (networkId: string | null | undefined) => {
  return useMemo(() => getFrontEndSolanaRpc(networkId), [networkId])
}

export const getFrontEndSolanaConnector = (networkId: SolNetworkId): IChainConnectorSol => {
  const rpc = getFrontEndSolanaRpc(networkId)
  if (!rpc) throw new Error(`No Solana connection found for network ID: ${networkId}`)

  return {
    getRpc: async () => rpc,
    getTransport: async () => createBackgroundRpcTransport(networkId),
  }
}
