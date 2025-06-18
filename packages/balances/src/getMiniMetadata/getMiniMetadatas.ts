import { ChainConnector } from "@talismn/chain-connector"
import { ChainConnectorEvm } from "@talismn/chain-connector-evm"
import { ChaindataProvider, DotNetworkId } from "@talismn/chaindata-provider"
import PQueue from "p-queue"

import { ChainConnectors } from "../BalanceModule"
import { libVersion } from "../libVersion"
import log from "../log"
import { defaultBalanceModules } from "../modules"
import { deriveMiniMetadataId, MiniMetadata } from "../types"
import { getMetadataRpc } from "./getMetadataRpc"

// share requests as all modules will call this at once
const CACHE = new Map<string, Promise<MiniMetadata[]>>()

// ensures we dont fetch miniMetadatas on more than 4 chains at once
const POOL = new PQueue({ concurrency: 4 })

export const getMiniMetadatas = async (
  chainConnector: ChainConnector,
  chaindataProvider: ChaindataProvider,
  networkId: DotNetworkId,
  specVersion: number,
) => {
  if (CACHE.has(networkId)) return CACHE.get(networkId)!

  const pResult = POOL.add(() =>
    fetchMiniMetadatas(chainConnector, chaindataProvider, networkId, specVersion),
  ) as Promise<MiniMetadata[]>

  CACHE.set(networkId, pResult)

  try {
    return await pResult
  } catch (cause) {
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
) => {
  const start = performance.now()
  log.debug("[miniMetadata] fetching minimetadatas for %s", chainId)

  try {
    const metadataRpc = await getMetadataRpc(chainConnector, chainId)

    const chainConnectors: ChainConnectors = {
      substrate: chainConnector,
      evm: {} as ChainConnectorEvm, // wont be used but workarounds error for module creation
    }

    const modules = defaultBalanceModules
      .map((mod) => mod({ chainConnectors, chaindataProvider }))
      .filter((mod) => mod.type.startsWith("substrate-"))

    return Promise.all(
      modules.map(async (mod) => {
        const source = mod.type

        const chainMeta = await mod.fetchSubstrateChainMeta(chainId, {}, metadataRpc)

        return {
          id: deriveMiniMetadataId({ source, chainId, specVersion, libVersion }),
          source,
          chainId,
          specVersion,
          libVersion,
          data: (chainMeta?.miniMetadata as `0x${string}`) ?? null,
        } as MiniMetadata
      }),
    )
  } finally {
    log.debug("[miniMetadata] updated miniMetadatas for %s in %sms", performance.now() - start)
  }
}
