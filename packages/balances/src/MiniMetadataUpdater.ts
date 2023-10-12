import { PromisePool } from "@supercharge/promise-pool"
import { Chain, ChainId, EvmNetworkId } from "@talismn/chaindata-provider"
import {
  ChaindataProviderExtension,
  availableTokenLogoFilenames,
} from "@talismn/chaindata-provider-extension"
import { liveQuery } from "dexie"
import { from } from "rxjs"

import { ChainConnectors } from "./BalanceModule"
import log from "./log"
import { AnyBalanceModule } from "./modules/util"
import { db as balancesDb } from "./TalismanBalancesDatabase"
import { MiniMetadataStatus, deriveMiniMetadataId } from "./types"

/**
 * A substrate dapp needs access to a set of types when it wants to communicate with a blockchain node.
 *
 * These types are used to encode requests & decode responses via the SCALE codec.
 * Each chain generally has its own set of types.
 *
 * Substrate provides a construct to retrieve these types from a blockchain node.
 * The chain metadata.
 *
 * The metadata includes the types required for any communication with the chain,
 * including lots of methods which are not relevant to balance fetching.
 *
 * As such, the metadata can clock in at around 1-2MB per chain, which is a lot of storage
 * for browser-based dapps which want to connect to lots of chains.
 *
 * By utilizing the wonderful [subshape](https://github.com/paritytech/subshape) library,
 * we can trim the chain metadata down so that it only includes the types we need for balance fetching.
 *
 * Each balance module has a function to do just that, `BalanceModule::fetchSubstrateChainMeta`.
 *
 * But, we only want to run this operation when necessary.
 *
 * The purpose of this class, `MiniMetadataUpdater`, is to maintain a local cache of
 * trimmed-down metadatas, which we'll refer to as `MiniMetadatas`.
 */
export class MiniMetadataUpdater {
  #chainConnectors: ChainConnectors
  #chaindataProvider: ChaindataProviderExtension
  #balanceModules: Array<AnyBalanceModule>

  constructor(
    chainConnectors: ChainConnectors,
    chaindataProvider: ChaindataProviderExtension,
    balanceModules: Array<AnyBalanceModule>
  ) {
    this.#chainConnectors = chainConnectors
    this.#chaindataProvider = chaindataProvider
    this.#balanceModules = balanceModules
  }

  // TODO: Also update evmNetworks
  // and their tokens
  async update(chainIds: ChainId[], evmNetworkIds: EvmNetworkId[]) {
    const chains = new Map(
      (await this.#chaindataProvider.chainsArray()).map((chain) => [chain.id, chain])
    )
    const filteredChains = chainIds.flatMap((chainId) => chains.get(chainId) ?? [])

    const evmNetworks = new Map(
      (await this.#chaindataProvider.evmNetworksArray()).map((evmNetwork) => [
        evmNetwork.id,
        evmNetwork,
      ])
    )

    const ids = await balancesDb.miniMetadatas.orderBy("id").primaryKeys()
    const { wantedIdsByChain, statusesByChain } = await this.statuses(filteredChains)

    // clean up store
    const wantedIds = Array.from(wantedIdsByChain.values()).flatMap((ids) => ids)
    const unwantedIds = ids.filter((id) => !wantedIds.includes(id))

    if (unwantedIds.length > 0) {
      log.info(`Pruning ${unwantedIds.length} miniMetadatas`)
      await balancesDb.miniMetadatas.bulkDelete(unwantedIds)
    }

    const needUpdates = Array.from(statusesByChain.entries())
      .filter(([, status]) => status !== "good")
      .map(([chainId]) => chainId)

    const availableTokenLogos = await availableTokenLogoFilenames()

    const concurrency = 4
    ;(
      await PromisePool.withConcurrency(concurrency)
        .for(needUpdates)
        .process(async (chainId) => {
          log.info(`Updating metadata for chain ${chainId}`)
          const chain = chains.get(chainId)
          if (!chain) return

          const { specName, specVersion } = chain
          if (specName === null) return
          if (specVersion === null) return

          const metadataRpc = await this.#chainConnectors.substrate?.send(
            chainId,
            "state_getMetadata",
            []
          )

          for (const mod of this.#balanceModules) {
            const balancesConfig = chain.balancesConfig.find(
              ({ moduleType }) => moduleType === mod.type
            )
            const moduleConfig = balancesConfig?.moduleConfig ?? {}

            const metadata = await mod.fetchSubstrateChainMeta(chainId, moduleConfig, metadataRpc)
            const tokens = await mod.fetchSubstrateChainTokens(chainId, metadata, moduleConfig)

            // update tokens in chaindata
            await this.#chaindataProvider.updateChainTokens(
              chainId,
              mod.type,
              Object.values(tokens),
              availableTokenLogos
            )

            // update miniMetadatas
            const { miniMetadata: data, metadataVersion: version, ...extra } = metadata ?? {}
            await balancesDb.miniMetadatas.put({
              id: deriveMiniMetadataId({
                source: mod.type,
                chainId,
                specName,
                specVersion,
                balancesConfig: JSON.stringify(moduleConfig),
              }),
              source: mod.type,
              chainId,
              specName,
              specVersion,
              balancesConfig: JSON.stringify(moduleConfig),
              // TODO: Standardise return value from `fetchSubstrateChainMeta`
              version,
              data,
              extra: JSON.stringify(extra),
            })
          }
        })
    ).errors.forEach((error) => log.error("Error updating chain metadata", error))

    const evmNetworkConcurrency = 10
    await PromisePool.withConcurrency(evmNetworkConcurrency)
      // TODO: Only update networks which need it
      .for(evmNetworkIds)
      .process(async (evmNetworkId) => {
        log.info(`Updating tokens for evmNetwork ${evmNetworkId}`)
        const evmNetwork = evmNetworks.get(evmNetworkId)
        if (!evmNetwork) return

        for (const mod of this.#balanceModules) {
          const balancesConfig = evmNetwork.balancesConfig.find(
            ({ moduleType }) => moduleType === mod.type
          )
          const moduleConfig = balancesConfig?.moduleConfig ?? {}

          const chainMeta = await mod.fetchEvmChainMeta(evmNetworkId, moduleConfig)
          const tokens = await mod.fetchEvmChainTokens(evmNetworkId, chainMeta, moduleConfig)

          // update tokens in chaindata
          await this.#chaindataProvider.updateEvmNetworkTokens(
            evmNetworkId,
            mod.type,
            Object.values(tokens),
            availableTokenLogos
          )
        }
      })
  }

  async statuses(chains: Array<Pick<Chain, "id" | "specName" | "specVersion" | "balancesConfig">>) {
    const ids = await balancesDb.miniMetadatas.orderBy("id").primaryKeys()

    const wantedIdsByChain = new Map<string, string[]>(
      chains.flatMap(({ id: chainId, specName, specVersion, balancesConfig }) => {
        if (specName === null) return []
        if (specVersion === null) return []

        return [
          [
            chainId,
            this.#balanceModules.map(({ type: source }) =>
              deriveMiniMetadataId({
                source,
                chainId: chainId,
                specName: specName,
                specVersion: specVersion,
                balancesConfig: JSON.stringify(
                  balancesConfig.find(({ moduleType }) => moduleType === source)?.moduleConfig ?? {}
                ),
              })
            ),
          ],
        ]
      })
    )

    const statusesByChain = new Map<string, MiniMetadataStatus>(
      Array.from(wantedIdsByChain.entries()).map(([chainId, wantedIds]) => [
        chainId,
        wantedIds.every((wantedId) => ids.includes(wantedId)) ? "good" : "none",
      ])
    )

    return { wantedIdsByChain, statusesByChain }
  }

  /** Subscribe to the metadata for a chain */
  subscribe(chainId: ChainId) {
    return from(
      liveQuery(() =>
        balancesDb.miniMetadatas
          .filter((m) => m.chainId === chainId)
          .toArray()
          .then((array) => array[0])
      )
    )
  }
}
