import { EvmNetworkId } from "@talismn/chaindata-provider"
import { ethers } from "ethers"

// because of validation the same query is done 3 times minimum per url, make all await same promise
const rpcChainIdCache = new Map<string, Promise<EvmNetworkId | null>>()

export const getRpcChainId = (rpcUrl: string) => {
  // check if valid url
  if (!rpcUrl || !/^https?:\/\/.+$/.test(rpcUrl)) return null

  if (!rpcChainIdCache.has(rpcUrl)) {
    rpcChainIdCache.set(
      rpcUrl,
      new Promise((resolve) => {
        const provider = new ethers.providers.StaticJsonRpcProvider(rpcUrl)
        provider
          .send("eth_chainId", [])
          .then((hexChainId) => {
            resolve(String(parseInt(hexChainId, 16)))
          })
          .catch(() => resolve(null))
      })
    )
  }

  return rpcChainIdCache.get(rpcUrl) as Promise<EvmNetworkId | null>
}
