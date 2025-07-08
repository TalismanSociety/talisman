import { ChainConnector } from "@talismn/chain-connector"
import { ChaindataProvider, DotNetworkId } from "@talismn/chaindata-provider"
import { isAbortError } from "@talismn/util"
import PQueue from "p-queue"

import log from "../log"
import { BALANCE_MODULES } from "../modules"
import { MiniMetadata } from "../types"
import { getMetadataRpc } from "./getMetadataRpc"
import { getSpecVersion } from "./getSpecVersion"

// share requests as all modules will call this at once
const CACHE = new Map<string, Promise<MiniMetadata[]>>()

// ensures we dont fetch miniMetadatas on more than 4 chains at once
const POOL = new PQueue({ concurrency: 4 })

export const getMiniMetadatas = async (
  chainConnector: ChainConnector,
  chaindataProvider: ChaindataProvider,
  networkId: DotNetworkId,
  specVersion?: number,
  signal?: AbortSignal,
) => {
  if (CACHE.has(networkId)) return CACHE.get(networkId)!

  if (!signal)
    log.warn(
      "[miniMetadata] getMiniMetadatas called without signal, this may hang the updates",
      new Error("No signal provided"), // this will show the stack trace
    )

  if (specVersion === undefined) specVersion = await getSpecVersion(chainConnector, networkId)

  const pResult = POOL.add(
    () => fetchMiniMetadatas(chainConnector, chaindataProvider, networkId, specVersion),
    { signal },
  ) as Promise<MiniMetadata[]>

  CACHE.set(networkId, pResult)

  try {
    return await pResult
  } catch (cause) {
    if (isAbortError(cause)) throw cause
    throw new Error(`Failed to fetch metadataRpc for network ${networkId}`, { cause })
  } finally {
    CACHE.delete(networkId)
  }
}

const fetchMiniMetadatas = async (
  chainConnector: ChainConnector,
  chaindataProvider: ChaindataProvider,
  chainId: DotNetworkId,
  specVersion: number,
  signal?: AbortSignal,
) => {
  const start = performance.now()
  log.info("[miniMetadata] fetching minimetadatas for %s", chainId)

  try {
    const network = await chaindataProvider.getNetworkById(chainId, "polkadot")
    if (!network) throw new Error(`Network ${chainId} not found in chaindataProvider`)
    signal?.throwIfAborted()

    const metadataRpc = await getMetadataRpc(chainConnector, chainId)
    signal?.throwIfAborted()

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
