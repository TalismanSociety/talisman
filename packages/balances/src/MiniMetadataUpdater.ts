import { PromisePool } from "@supercharge/promise-pool"
import { Chain, ChainId } from "@talismn/chaindata-provider"
import { ChaindataProviderExtension } from "@talismn/chaindata-provider-extension"
import { twox128 } from "@talismn/scale"
import { liveQuery } from "dexie"
import { from } from "rxjs"

import { AnyBalanceModule } from "./modules/util"
import { db as balancesDb } from "./TalismanBalancesDatabase"
import { MiniMetadata, MiniMetadataStatus } from "./types"

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
  #chaindataProvider: ChaindataProviderExtension
  #balanceModules: Array<AnyBalanceModule>

  constructor(
    chaindataProvider: ChaindataProviderExtension,
    balanceModules: Array<AnyBalanceModule>
  ) {
    this.#chaindataProvider = chaindataProvider
    this.#balanceModules = balanceModules
  }

  /** For fast db access, you can calculate the primary key for a miniMetadata using this method */
  deriveId({
    source,
    chainId,
    specName,
    specVersion,
  }: Pick<MiniMetadata, "source" | "chainId" | "specName" | "specVersion">) {
    return twox128.hash(new TextEncoder().encode(`${source}${chainId}${specName}${specVersion}`))
  }

  // async update(chainIds: ChainId[]) {
  //   const chains = await this.#chaindataProvider.chainsArray()
  //   const statuses = await this.statuses(chains)
  // }

  async statuses(chains: Array<Pick<Chain, "id" | "specName" | "specVersion" | "balancesConfig">>) {
    const statuses = new Map<ChainId, MiniMetadataStatus>()

    const sources = this.#balanceModules.map((mod) => mod.type)

    const concurrency = 4
    await PromisePool.withConcurrency(concurrency)
      .for(chains)
      .process(async (chain: Pick<Chain, "id" | "specName" | "specVersion" | "balancesConfig">) => {
        if (chain.specName === null) return
        if (chain.specVersion === null) return

        for (const source of sources) {
          const id = this.deriveId({
            source,
            chainId: chain.id,
            specName: chain.specName,
            specVersion: chain.specVersion,
          })

          const metadata = await balancesDb.miniMetadatas.get(id)
          if (metadata === undefined) {
            if (!statuses.has(chain.id) || statuses.get(chain.id) === "good")
              statuses.set(chain.id, "none")
            return
          }

          const chainBalancesConfig = JSON.stringify(
            chain.balancesConfig.find(({ moduleType }) => moduleType === source) ?? null
          )

          if (metadata.balancesConfig !== chainBalancesConfig) {
            return statuses.set(chain.id, "outdated")
          }

          if (!statuses.has(chain.id)) return statuses.set(chain.id, "good")
        }

        return
      })

    return statuses
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

  test() {
    balancesDb.miniMetadatas.get(
      this.deriveId({
        source: "substrate-native",
        chainId: "polkadot",
        specName: "polkadot",
        specVersion: "2007",
      })
    )
  }
}
