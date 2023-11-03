import { WsProvider } from "@polkadot/api"
import { EvmNetworkId } from "@talismn/chaindata-provider"
import { sleep } from "@talismn/util"
import { ethers } from "ethers"

// because of validation the same query is done 3 times minimum per url, make all await same promise
const rpcChainIdCache = new Map<string, Promise<EvmNetworkId | null>>()

export const getEvmRpcChainId = (rpcUrl: string): Promise<string | null> => {
  // check if valid url
  if (!rpcUrl || !/^https?:\/\/.+$/.test(rpcUrl)) return Promise.resolve(null)

  const cached = rpcChainIdCache.get(rpcUrl)
  if (cached) return cached

  const provider = new ethers.providers.StaticJsonRpcProvider(rpcUrl)
  const request = provider
    .send("eth_chainId", [])
    .then((hexChainId) => String(parseInt(hexChainId, 16)))
    .catch(() => null)

  rpcChainIdCache.set(rpcUrl, request)

  return request
}

// because of validation the same query is done 3 times minimum per url, make all await same promise
const rpcInfoCache = new Map<string, Promise<SubstrateRpcInfo | null>>()

type SubstrateRpcInfo = { genesisHash: string; token: { symbol: string; decimals: number } }
export const getSubstrateRpcInfo = (rpcUrl: string): Promise<SubstrateRpcInfo | null> => {
  // check if valid url
  if (!rpcUrl || !/^wss?:\/\/.+$/.test(rpcUrl)) return Promise.resolve(null)

  const cached = rpcInfoCache.get(rpcUrl)
  if (cached) return cached

  const request = (async () => {
    const ws = new WsProvider(rpcUrl, 0)
    try {
      await ws.connect()

      const isReadyTimeout = sleep(5_000).then(() => {
        throw new Error("timeout")
      })
      await Promise.race([ws.isReady, isReadyTimeout])

      const [genesisHash, systemProperties] = await Promise.all([
        ws.send<string>("chain_getBlockHash", [0]),
        ws.send("system_properties", []),
      ])
      const { tokenSymbol, tokenDecimals } = systemProperties ?? {}
      const symbol: string = (Array.isArray(tokenSymbol) ? tokenSymbol[0] : tokenSymbol) ?? "Unit"
      const decimals: number =
        (Array.isArray(tokenDecimals) ? tokenDecimals[0] : tokenDecimals) ?? 0

      return { genesisHash, token: { symbol, decimals } }
    } catch (error) {
      return null
    } finally {
      ws.disconnect()
    }
  })()

  rpcInfoCache.set(rpcUrl, request)

  return request
}
