import { PromisePool } from "@supercharge/promise-pool"
import {
  availableTokenLogoFilenames,
  Chain,
  ChaindataProvider,
  ChainId,
  CustomChain,
  fetchInitMiniMetadatas,
  fetchMiniMetadatas,
} from "@talismn/chaindata-provider"
import { liveQuery } from "dexie"
import isEqual from "lodash/isEqual"
import { from } from "rxjs"

import { ChainConnectors } from "./BalanceModule"
import log from "./log"
import { AnyBalanceModule } from "./modules/util"
import { db as balancesDb } from "./TalismanBalancesDatabase"
import { deriveMiniMetadataId, MiniMetadata, MiniMetadataStatus } from "./types"

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
  #lastHydratedCustomChainsAt = 0

  #chainConnectors: ChainConnectors
  #chaindataProvider: ChaindataProvider
  #balanceModules: Array<AnyBalanceModule>

  constructor(
    chainConnectors: ChainConnectors,
    chaindataProvider: ChaindataProvider,
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

  async update(chainIds: ChainId[]) {
    await this.updateSubstrateChains(chainIds)
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
        // TODO: Move `fetchMiniMetadatas` into this package,
        // so that we don't have a circular import between `@talismn/balances` and `@talismn/chaindata-provider`.
        var miniMetadatas = (await fetchMiniMetadatas()) as MiniMetadata[] // eslint-disable-line no-var
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

  async hydrateCustomChains() {
    const now = Date.now()
    if (now - this.#lastHydratedCustomChainsAt < minimumHydrationInterval) return false

    const chains = await this.#chaindataProvider.chains()
    const customChains = chains.filter(
      (chain): chain is CustomChain => "isCustom" in chain && chain.isCustom
    )

    const updatedCustomChains: Array<CustomChain> = []

    const concurrency = 4
    ;(
      await PromisePool.withConcurrency(concurrency)
        .for(customChains)
        .process(async (customChain) => {
          const send = (method: string, params: unknown[]) =>
            this.#chainConnectors.substrate?.send(customChain.id, method, params)

          const [genesisHash, runtimeVersion, chainName, chainType] = await Promise.all([
            send("chain_getBlockHash", [0]),
            send("state_getRuntimeVersion", []),
            send("system_chain", []),
            send("system_chainType", []),
          ])

          // deconstruct rpc data
          const { specName, implName } = runtimeVersion
          const specVersion = String(runtimeVersion.specVersion)

          const changed =
            customChain.genesisHash !== genesisHash ||
            customChain.chainName !== chainName ||
            !isEqual(customChain.chainType, chainType) ||
            customChain.implName !== implName ||
            customChain.specName !== specName ||
            customChain.specVersion !== specVersion

          if (!changed) return

          customChain.genesisHash = genesisHash
          customChain.chainName = chainName
          customChain.chainType = chainType
          customChain.implName = implName
          customChain.specName = specName
          customChain.specVersion = specVersion

          updatedCustomChains.push(customChain)
        })
    ).errors.forEach((error) => log.error("Error hydrating custom chains", error))

    if (updatedCustomChains.length > 0) {
      await this.#chaindataProvider.transaction("rw", ["chains"], async () => {
        for (const updatedCustomChain of updatedCustomChains) {
          await this.#chaindataProvider.removeCustomChain(updatedCustomChain.id)
          await this.#chaindataProvider.addCustomChain(updatedCustomChain)
        }
      })
    }
    if (updatedCustomChains.length > 0) this.#lastHydratedCustomChainsAt = now

    return true
  }

  private async updateSubstrateChains(chainIds: ChainId[]) {
    const chains = new Map(
      (await this.#chaindataProvider.chains()).map((chain) => [chain.id, chain])
    )
    const filteredChains = chainIds.flatMap((chainId) => chains.get(chainId) ?? [])

    const ids = await balancesDb.miniMetadatas.orderBy("id").primaryKeys()
    const { wantedIdsByChain, statusesByChain } = await this.statuses(filteredChains)

    // clean up store
    const wantedIds = Array.from(wantedIdsByChain.values()).flatMap((ids) => ids)
    const unwantedIds = ids.filter((id) => !wantedIds.includes(id))

    if (unwantedIds.length > 0) {
      const chainIds = Array.from(
        new Set((await balancesDb.miniMetadatas.bulkGet(unwantedIds)).map((m) => m?.chainId))
      )
      log.info(`Pruning ${unwantedIds.length} miniMetadatas on chains ${chainIds.join(", ")}`)
      await balancesDb.miniMetadatas.bulkDelete(unwantedIds)
    }

    const needUpdates = Array.from(statusesByChain.entries())
      .filter(([, status]) => status !== "good")
      .map(([chainId]) => chainId)

    if (needUpdates.length > 0)
      log.info(`${needUpdates.length} miniMetadatas need updates (${needUpdates.join(", ")})`)

    const availableTokenLogos = await availableTokenLogoFilenames().catch((error) => {
      log.error("Failed to fetch available token logos", error)
      return []
    })

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
}
