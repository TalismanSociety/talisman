import { ChaindataProvider, ChainId } from "@talismn/chaindata-provider"
import { firstThenDebounce } from "@talismn/util"
import { liveQuery } from "dexie"
import {
  combineLatestWith,
  distinctUntilChanged,
  firstValueFrom,
  from,
  map,
  shareReplay,
  Subscription,
} from "rxjs"

import { db as balancesDb } from "../../../TalismanBalancesDatabase"
import { AddressesByToken } from "../../../types"
import { buildStorageCoders, getUniqueChainIds, RpcStateQuery } from "../../util"
import { SubNativeBalance, SubNativeToken } from "../types"
import { buildQueries, QueryKey } from "./buildQueries"
import { detectMiniMetadataChanges } from "./detectMiniMetadataChanges"

type QueryCacheResults = {
  existing: RpcStateQuery<SubNativeBalance>[]
  newAddressesByToken: AddressesByToken<SubNativeToken>
}

// NOTE: `liveQuery` is not initialized until commonMetadataObservable is subscribed to.
const commonMetadataObservable = from(
  liveQuery(() => balancesDb.miniMetadatas.where("source").equals("substrate-native").toArray()),
).pipe(
  map((items) => new Map(items.map((item) => [item.id, item]))),
  // `refCount: true` will unsubscribe from the DB when commonMetadataObservable has no more subscribers
  shareReplay({ bufferSize: 1, refCount: true }),
)

export class QueryCache {
  private balanceQueryCache = new Map<QueryKey, RpcStateQuery<SubNativeBalance>[]>()
  private metadataSub: Subscription | null = null

  constructor(private chaindataProvider: ChaindataProvider) {}

  ensureSetup() {
    if (this.metadataSub) return

    this.metadataSub = commonMetadataObservable
      .pipe(
        firstThenDebounce(500),
        detectMiniMetadataChanges(),
        combineLatestWith(this.chaindataProvider.tokensObservable),
        distinctUntilChanged(),
      )
      .subscribe(([miniMetadataChanges, tokens]) => {
        // invalidate cache entries for any chains with new metadata
        const tokensByChainId = tokens
          .filter((token): token is SubNativeToken => token.type === "substrate-native")
          .reduce<Record<ChainId, Array<SubNativeToken>>>((result, token) => {
            if (!token.chain?.id) return result
            result[token.chain.id]
              ? result[token.chain.id].push(token)
              : (result[token.chain.id] = [token])
            return result
          }, {})

        miniMetadataChanges.forEach((chainId) => {
          const chainTokens = tokensByChainId[chainId]
          if (!chainTokens) return

          chainTokens.forEach((token) => {
            const tokenId = token.id
            const cacheKeys = this.balanceQueryCache.keys()
            for (const key of cacheKeys) {
              if (key.startsWith(`${tokenId}-`)) this.balanceQueryCache.delete(key)
            }
          })
        })
      })
  }

  destroy() {
    this.metadataSub?.unsubscribe()
  }

  async getQueries(addressesByToken: AddressesByToken<SubNativeToken>) {
    this.ensureSetup()

    const chains = await this.chaindataProvider.chainsById()
    const tokens = await this.chaindataProvider.tokensById()

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

    // build queries for token/address pairs which have not been queried before
    const miniMetadatas = await firstValueFrom(commonMetadataObservable)
    const uniqueChainIds = getUniqueChainIds(queryResults.newAddressesByToken, tokens)
    const chainStorageCoders = buildStorageCoders({
      chainIds: uniqueChainIds,
      chains,
      miniMetadatas,
      moduleType: "substrate-native",
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
      miniMetadatas,
      queryResults.newAddressesByToken,
    )
    // now update the cache
    Object.entries(queries).forEach(([key, query]) => {
      this.balanceQueryCache.set(key, query)
    })
    return queryResults.existing.concat(Object.values(queries).flat())
  }
}
