import { PromisePool } from "@supercharge/promise-pool"
import { EvmNetworkId, TokenList } from "@talismn/chaindata-provider"
import { ChaindataProviderExtension } from "@talismn/chaindata-provider-extension"

import { AnyBalanceModule } from "./modules/util"

/**
 * Fetches tokens for EVM networks.
 */
export class EvmTokenFetcher {
  #chaindataProvider: ChaindataProviderExtension
  #balanceModules: Array<AnyBalanceModule>

  constructor(
    chaindataProvider: ChaindataProviderExtension,
    balanceModules: Array<AnyBalanceModule>
  ) {
    this.#chaindataProvider = chaindataProvider
    this.#balanceModules = balanceModules
  }

  async update(evmNetworkIds: EvmNetworkId[]) {
    await this.updateEvmNetworks(evmNetworkIds)
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
