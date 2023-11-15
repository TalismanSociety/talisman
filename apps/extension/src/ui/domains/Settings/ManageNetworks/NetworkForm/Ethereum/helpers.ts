import { EvmNetworkId } from "@talismn/chaindata-provider"
import { createClient, hexToNumber, http } from "viem"

// because of validation the same query is done 3 times minimum per url, make all await same promise
const rpcChainIdCache = new Map<string, Promise<EvmNetworkId | null>>()

export const getEvmRpcChainId = (rpcUrl: string): Promise<string | null> => {
  // check if valid url
  if (!rpcUrl || !/^https?:\/\/.+$/.test(rpcUrl)) return Promise.resolve(null)

  const cached = rpcChainIdCache.get(rpcUrl)
  if (cached) return cached

  const client = createClient({ transport: http(rpcUrl) })

  const request = client
    .request({ method: "eth_chainId" })
    .then((hexChainId) => String(hexToNumber(hexChainId)))
    .catch(() => null)

  rpcChainIdCache.set(rpcUrl, request)

  return request
}
