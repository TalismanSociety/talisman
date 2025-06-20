import { ChainConnector } from "@talismn/chain-connector"
import { ChainConnectorEvm } from "@talismn/chain-connector-evm"
import {
  ChaindataProvider,
  DotNetworkBalancesConfigSchema,
  DotNetworkId,
} from "@talismn/chaindata-provider"
import { isAbortError } from "@talismn/util"
import PQueue from "p-queue"
import z from "zod/v4"

import { ChainConnectors, DefaultModuleConfig } from "../BalanceModule"
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
  signal?: AbortSignal,
) => {
  if (CACHE.has(networkId)) return CACHE.get(networkId)!

  if (!signal)
    log.warn(
      "[miniMetadata] getMiniMetadatas called without signal, this may hang the updates",
      new Error("No signal provided"), // this will show the stack trace
    )

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

const DotBalanceModuleTypeSchema = z.keyof(DotNetworkBalancesConfigSchema)

type DotBalanceModuleType = z.infer<typeof DotBalanceModuleTypeSchema>

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
    const metadataRpc = await getMetadataRpc(chainConnector, chainId)
    signal?.throwIfAborted()

    const chainConnectors: ChainConnectors = {
      substrate: chainConnector,
      evm: {} as ChainConnectorEvm, // wont be used but workarounds error for module creation
    }

    const modules = defaultBalanceModules
      .map((mod) => mod({ chainConnectors, chaindataProvider }))
      .filter((mod) => DotBalanceModuleTypeSchema.safeParse(mod.type).success)

    return Promise.all(
      modules.map(async (mod) => {
        const source = mod.type as DotBalanceModuleType

        const chain = await chaindataProvider.chainById(chainId)

        const balancesConfig = chain?.balancesConfig?.[mod.type as DotBalanceModuleType]

        const chainMeta = await mod.fetchSubstrateChainMeta(
          chainId,
          balancesConfig as DefaultModuleConfig, // TODO fix typings
          metadataRpc,
        )

        return {
          id: deriveMiniMetadataId({ source, chainId, specVersion, libVersion }),
          source,
          chainId,
          specVersion,
          libVersion,
          data: chainMeta?.miniMetadata ?? null,
          extra: chainMeta?.extra ?? null,
        } as MiniMetadata
      }),
    )
  } finally {
    log.debug(
      "[miniMetadata] updated miniMetadatas for %s in %sms",
      chainId,
      performance.now() - start,
    )
  }
}
