import { PromisePool } from "@supercharge/promise-pool"
import { Chain, ChainId, EvmNetworkId, TokenList } from "@talismn/chaindata-provider"
import {
  ChaindataProviderExtension,
  availableTokenLogoFilenames,
} from "@talismn/chaindata-provider-extension"
import { fetchInitMiniMetadatas, fetchMiniMetadatas } from "@talismn/chaindata-provider-extension"
import { liveQuery } from "dexie"
import { from } from "rxjs"

import { ChainConnectors } from "./BalanceModule"
import log from "./log"
import { AnyBalanceModule } from "./modules/util"
import { db as balancesDb } from "./TalismanBalancesDatabase"
import { MiniMetadata, MiniMetadataStatus, deriveMiniMetadataId } from "./types"

const minimumHydrationInterval = 300_000 // 300_000ms = 300s = 5 minutes

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
  #lastHydratedMiniMetadatasAt = 0

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

  async update(chainIds: ChainId[], evmNetworkIds: EvmNetworkId[]) {
    await Promise.all([this.updateSubstrateChains(chainIds), this.updateEvmNetworks(evmNetworkIds)])
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
            this.#balanceModules
              .filter((m) => m.type.startsWith("substrate-"))
              .map(({ type: source }) =>
                deriveMiniMetadataId({
                  source,
                  chainId: chainId,
                  specName: specName,
                  specVersion: specVersion,
                  balancesConfig: JSON.stringify(
                    (balancesConfig ?? []).find(({ moduleType }) => moduleType === source)
                      ?.moduleConfig ?? {}
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

  async hydrateFromChaindata() {
    const now = Date.now()
    if (now - this.#lastHydratedMiniMetadatasAt < minimumHydrationInterval) return false
    const dbHasMiniMetadatas = (await balancesDb.miniMetadatas.count()) > 0
    try {
      try {
        var miniMetadatas: MiniMetadata[] = await fetchMiniMetadatas() // eslint-disable-line no-var
        if (miniMetadatas.length <= 0)
          throw new Error("Ignoring empty chaindata miniMetadatas response")
      } catch (error) {
        if (dbHasMiniMetadatas) throw error
        // On first start-up (db is empty), if we fail to fetch miniMetadatas then we should
        // initialize the DB with the list of miniMetadatas inside our init/mini-metadatas.json file.
        // This data will represent a relatively recent copy of what's in chaindata,
        // which will be better for our users than to have nothing at all.
        var miniMetadatas: MiniMetadata[] = await fetchInitMiniMetadatas() // eslint-disable-line no-var
      }
      await balancesDb.miniMetadatas.bulkPut(miniMetadatas)
      this.#lastHydratedMiniMetadatasAt = now
      return true
    } catch (error) {
      log.warn(`Failed to hydrate miniMetadatas from chaindata`, error)
      return false
    }
  }

  private async updateSubstrateChains(chainIds: ChainId[]) {
    const chains = new Map(
      (await this.#chaindataProvider.chainsArray()).map((chain) => [chain.id, chain])
    )
    const filteredChains = chainIds.flatMap((chainId) => chains.get(chainId) ?? [])

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

          for (const mod of this.#balanceModules.filter((m) => m.type.startsWith("substrate-"))) {
            const balancesConfig = (chain.balancesConfig ?? []).find(
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
  }

  private async updateEvmNetworks(evmNetworkIds: EvmNetworkId[]) {
    const evmNetworks = new Map(
      (await this.#chaindataProvider.evmNetworksArray()).map((evmNetwork) => [
        evmNetwork.id,
        evmNetwork,
      ])
    )

    const allEvmTokens: TokenList = {}
    const evmNetworkConcurrency = 10

    await PromisePool.withConcurrency(evmNetworkConcurrency)
      .for(evmNetworkIds)
      .process(async (evmNetworkId) => {
        const evmNetwork = evmNetworks.get(evmNetworkId)
        if (!evmNetwork) return

        for (const mod of this.#balanceModules.filter((m) => m.type.startsWith("evm-"))) {
          const balancesConfig = (evmNetwork.balancesConfig ?? []).find(
            ({ moduleType }) => moduleType === mod.type
          )
          const moduleConfig = balancesConfig?.moduleConfig ?? {}

          // chainMeta arg only needs the isTestnet property, let's save a db roundtrip for now
          const isTestnet = evmNetwork.isTestnet ?? false
          const tokens = await mod.fetchEvmChainTokens(evmNetworkId, { isTestnet }, moduleConfig)

          for (const [tokenId, token] of Object.entries(tokens)) allEvmTokens[tokenId] = token
        }
      })

    await this.#chaindataProvider.updateEvmNetworkTokens(Object.values(allEvmTokens))
  }
}
