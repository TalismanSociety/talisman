import { ChainConnector } from "@talismn/chain-connector"
import { ChaindataProvider, DotNetworkId, SubNativeToken } from "@talismn/chaindata-provider"
import { keys } from "lodash"

import { SubNativeModule } from ".."
import { getMiniMetadata } from "../../../getMiniMetadata"
import { AddressesByToken, MiniMetadata } from "../../../types"
import { buildStorageCoders, RpcStateQuery } from "../../util"
import { getAddresssesByTokenByNetwork } from "../../util/getAddresssesByTokenByNetwork"
import { SubNativeBalance } from "../types"
import { buildQueries, QueryKey } from "./buildQueries"

type QueryCacheResults = {
  existing: RpcStateQuery<SubNativeBalance>[]
  newAddressesByToken: AddressesByToken<SubNativeToken>
}

export class QueryCache {
  #chaindataProvider: ChaindataProvider
  #chainConnector: ChainConnector

  private miniMetadatas = new Map<DotNetworkId, MiniMetadata<typeof SubNativeModule>>()
  private balanceQueryCache = new Map<QueryKey, RpcStateQuery<SubNativeBalance>[]>()

  constructor(
    private chaindataProvider: ChaindataProvider,
    chainConnector: ChainConnector,
  ) {
    this.#chaindataProvider = chaindataProvider
    this.#chainConnector = chainConnector
  }

  async getQueries(addressesByToken: AddressesByToken<SubNativeToken>) {
    const chains = await this.chaindataProvider.getNetworksMapById("polkadot")
    const tokens = await this.chaindataProvider.getTokensMapById()

    const queryResults = Object.entries(addressesByToken).reduce<QueryCacheResults>(
      (result, [tokenId, addresses]) => {
        addresses.forEach((address) => {
          const key = `${tokenId}-${address}`
          const existing = this.balanceQueryCache.get(key)
          if (existing) {
            result.existing.push(...existing)
          } else {
            result.newAddressesByToken[tokenId]
              ? result.newAddressesByToken[tokenId].push(address)
              : (result.newAddressesByToken[tokenId] = [address])
          }
        })

        return result
      },
      { existing: [], newAddressesByToken: {} },
    )

    const byNetwork = getAddresssesByTokenByNetwork(addressesByToken)

    for (const networkId of keys(byNetwork)) {
      if (this.miniMetadatas.has(networkId)) continue

      const miniMetadata = await getMiniMetadata<typeof SubNativeModule>(
        this.#chaindataProvider,
        this.#chainConnector,
        networkId,
        "substrate-native",
      )
      this.miniMetadatas.set(networkId, miniMetadata)
    }

    // build queries for token/address pairs which have not been queried before
    const uniqueChainIds = keys(byNetwork) // getUniqueChainIds(queryResults.newAddressesByToken, tokens)
    const chainStorageCoders = buildStorageCoders({
      chainIds: uniqueChainIds,
      chains,
      miniMetadatas: this.miniMetadatas,
      coders: {
        base: ["System", "Account"],
        stakingLedger: ["Staking", "Ledger"],
        reserves: ["Balances", "Reserves"],
        holds: ["Balances", "Holds"],
        locks: ["Balances", "Locks"],
        freezes: ["Balances", "Freezes"],
      },
    })
    const queries = await buildQueries(
      chains,
      tokens,
      chainStorageCoders,
      this.miniMetadatas,
      queryResults.newAddressesByToken,
    )
    // now update the cache
    Object.entries(queries).forEach(([key, query]) => {
      this.balanceQueryCache.set(key, query)
    })
    return queryResults.existing.concat(Object.values(queries).flat())
  }
}
