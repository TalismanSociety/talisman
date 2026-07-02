import type { SolRpcRequest } from "@core/domains/solana/exports"
import type { RpcTransport } from "@solana/kit"
import { createSolanaRpcFromTransport } from "@solana/kit"
import { parseJsonWithBigInts } from "@solana/rpc-spec-types"
import { Connection, type ConnectionConfig } from "@solana/web3.js"
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

/**
 * returns a solana Connection object that proxies all requests through the extension's background script.
 *
 * @deprecated migrating to `useSolanaRpc`/`getFrontEndSolanaRpc`, kept until spl-token helpers are replaced
 */
const getSolanaConnection = (networkId: string) => {
  const fetchViaBackground = async (_url: string, options: RequestInit) => {
    if (typeof options.body !== "string")
      throw new Error("Request body is required for Solana RPC calls")

    const { id, method, params } = JSON.parse(options.body) as SolRpcRequest

    // Relay the RPC call through the background script
    const { rawJson } = await api.solSend(networkId, { id, method, params })

    const response = {
      ...(JSON.parse(rawJson) as Record<string, unknown>),
      id, // override the id to match the request (another id has been used when the backend proxied the request)
    }

    // TODO simulate HTTP error codes in case of error ?
    return new Response(JSON.stringify(response))
  }

  // Create a real Connection object that proxies all requests through the background script (url won't be used)
  return new Connection("http://talisman-background-script", {
    fetch: fetchViaBackground as ConnectionConfig["fetch"],
    commitment: "confirmed",
  })
}

const CACHE = new Map<string, Connection>()

/** @deprecated migrating to `getFrontEndSolanaRpc`, kept until spl-token helpers are replaced */
export const getFrontEndSolanaConnection = (networkId: string | null | undefined) => {
  if (!networkId) return null

  if (!CACHE.has(networkId)) {
    const connection = getSolanaConnection(networkId)
    CACHE.set(networkId, connection)
  }
  return CACHE.get(networkId)!
}

/** @deprecated migrating to `useSolanaRpc`, kept until spl-token helpers are replaced */
export const useSolanaConnection = (networkId: string | null | undefined) => {
  return useMemo(() => getFrontEndSolanaConnection(networkId), [networkId])
}

export const getFrontEndSolanaConnector = (networkId: SolNetworkId): IChainConnectorSol => {
  const rpc = getFrontEndSolanaRpc(networkId)
  const connection = getFrontEndSolanaConnection(networkId)
  if (!rpc || !connection)
    throw new Error(`No Solana connection found for network ID: ${networkId}`)

  return {
    getRpc: async () => rpc,
    getTransport: async () => createBackgroundRpcTransport(networkId),
    getConnection: async () => connection,
  }
}
