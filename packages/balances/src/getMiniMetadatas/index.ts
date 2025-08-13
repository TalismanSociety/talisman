import { IChainConnectorDot } from "@talismn/chain-connectors"
import { ChaindataProvider, DotNetworkId } from "@talismn/chaindata-provider"
import PQueue from "p-queue"

import log from "../log"
import { BALANCE_MODULES } from "../modules"
import { MiniMetadata } from "../types"
import { getMetadataRpc } from "./getMetadataRpc"
import { getSpecVersion } from "./getSpecVersion"

export { getSpecVersion } from "./getSpecVersion"

const getCacheKey = (networkId: string, specVersion: number) => `${networkId}:${specVersion}`

const CACHE = new Map<string, Promise<MiniMetadata[]>>()

// ensures we dont fetch miniMetadatas on more than 4 chains at once
const POOL = new PQueue({ concurrency: 4 })

export const getMiniMetadatas = async (
  chainConnector: IChainConnectorDot,
  chaindataProvider: ChaindataProvider,
  networkId: DotNetworkId,
  specVersion?: number,
) => {
  if (specVersion === undefined) specVersion = await getSpecVersion(chainConnector, networkId)

  const cacheKey = getCacheKey(networkId, specVersion)
  if (CACHE.has(cacheKey)) return CACHE.get(cacheKey)!

  const pResult = POOL.add(() =>
    fetchMiniMetadatas(chainConnector, chaindataProvider, networkId, specVersion),
  ) as Promise<MiniMetadata[]>

  // keep the results in cache (unless call fails) as observables call this function a lot of times
  CACHE.set(cacheKey, pResult)

  try {
    return await pResult
  } catch (cause) {
    CACHE.delete(cacheKey)
    throw new Error(`Failed to fetch metadataRpc for network ${networkId}`, { cause })
  }
}

const fetchMiniMetadatas = async (
  chainConnector: IChainConnectorDot,
  chaindataProvider: ChaindataProvider,
  chainId: DotNetworkId,
  specVersion: number,
) => {
  const start = performance.now()
  log.info("[miniMetadata] fetching minimetadatas for %s", chainId)

  try {
    const network = await chaindataProvider.getNetworkById(chainId, "polkadot")
    if (!network) throw new Error(`Network ${chainId} not found in chaindataProvider`)

    const metadataRpc = await getMetadataRpc(chainConnector, chainId)

    return Promise.all(
      BALANCE_MODULES.filter((m) => m.platform === "polkadot").map((mod) =>
        mod.getMiniMetadata({
          networkId: chainId,
          metadataRpc,
          specVersion,
          config: network.balancesConfig?.[mod.type],
        }),
      ),
    )
  } finally {
    log.debug(
      "[miniMetadata] updated miniMetadatas for %s in %sms",
      chainId,
      (performance.now() - start).toFixed(2),
    )
  }
}
