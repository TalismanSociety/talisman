import { Connection, ConnectionConfig } from "@solana/web3.js"
import { ChainConnectorSolStub } from "@talismn/chain-connectors"
import { SolNetworkId } from "@talismn/chaindata-provider"
import { SolRpcRequest } from "extension-core"
import { useMemo } from "react"

import { api } from "@ui/api"

/**
 * returns a solana Connection object that proxies all requests through the extension's background script.
 *
 * @param networkId
 */
const getSolanaConnection = (networkId: string) => {
  const fetchViaBackground = async (url: string, options: RequestInit) => {
    if (typeof options.body !== "string")
      throw new Error("Request body is required for Solana RPC calls")

    const { id, method, params } = JSON.parse(options.body) as SolRpcRequest

    // Relay the RPC call through the background script
    const result = await api.solSend(networkId, { id, method, params })

    const response = {
      ...result,
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

export const getFrontEndSolanaConnection = (networkId: string | null | undefined) => {
  if (!networkId) return null

  if (!CACHE.has(networkId)) {
    const connection = getSolanaConnection(networkId)
    CACHE.set(networkId, connection)
  }
  return CACHE.get(networkId)!
}

export const useSolanaConnection = (networkId: string | null | undefined) => {
  return useMemo(() => getFrontEndSolanaConnection(networkId), [networkId])
}

export const getFrontEndSolanaConnector = (networkId: SolNetworkId) => {
  const connection = getFrontEndSolanaConnection(networkId)
  if (!connection) throw new Error(`No Solana connection found for network ID: ${networkId}`)
  return new ChainConnectorSolStub(connection)
}
