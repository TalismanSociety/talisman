import { WsProvider } from "@polkadot/api"
import { sleep } from "@talismn/util"

// because of validation the same query is done 3 times minimum per url, make all await same promise
const rpcInfoCache = new Map<string, Promise<SubstrateRpcInfo | null>>()

export const wsRegEx = /^wss?:\/\/.+$/
type SubstrateRpcInfo = { genesisHash: string; token: { symbol: string; decimals: number } }
export const getSubstrateRpcInfo = (rpcUrl: string): Promise<SubstrateRpcInfo | null> => {
  // check if valid url
  if (!rpcUrl || !wsRegEx.test(rpcUrl)) return Promise.resolve(null)

  const cached = rpcInfoCache.get(rpcUrl)
  if (cached) return cached

  const ws = new WsProvider(rpcUrl, 0)

  const request = (async () => {
    try {
      await ws.connect()
      const isReadyTimeout = sleep(2_500).then(() => {
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
