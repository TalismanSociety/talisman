import { Chain, ChaindataProvider, ChainId, Token } from "@talismn/chaindata-provider"
import { Binary, decodeScale, encodeStateKey } from "@talismn/scale"
import { blake2Concat, decodeAnyAddress, firstThenDebounce } from "@talismn/util"
import { liveQuery } from "dexie"
import isEqual from "lodash/isEqual"
import {
  combineLatestWith,
  distinctUntilChanged,
  filter,
  firstValueFrom,
  from,
  map,
  Observable,
  pipe,
  shareReplay,
  Subscription,
} from "rxjs"
import { Struct, u32, u128 } from "scale-ts"

import { SubNativeBalance, SubNativeToken } from "."
import log from "../../log"
import { db as balancesDb } from "../../TalismanBalancesDatabase"
import { AddressesByToken, AmountWithLabel, getValueId, MiniMetadata } from "../../types"
import {
  buildStorageCoders,
  findChainMeta,
  getUniqueChainIds,
  RpcStateQuery,
  StorageCoders,
} from "../util"
import { getLockedType } from "./util"

type QueryKey = string

const detectMiniMetadataChanges = () => {
  let previousMap: Map<string, MiniMetadata> | null = null

  return pipe(
    map<Map<string, MiniMetadata>, Set<string> | null>((currMap) => {
      if (!currMap) return null
      const changes = new Set<string>()

      if (previousMap) {
        // Check for added or changed keys/values
        for (const [key, value] of currMap) {
          if (!previousMap.has(key) || !isEqual(previousMap.get(key), value)) {
            changes.add(value.chainId)
          }
        }

        // Check for removed keys
        for (const [key, value] of previousMap) {
          if (!currMap.has(key)) {
            changes.add(value.chainId)
          }
        }
      }
      previousMap = currMap
      return changes.size > 0 ? changes : null
    }),
    // Filter out null emissions (no changes)
    filter<Set<string> | null, Set<string>>((changes): changes is Set<string> => changes !== null)
  )
}

type QueryCacheResults = {
  existing: RpcStateQuery<SubNativeBalance>[]
  newAddressesByToken: AddressesByToken<SubNativeToken>
}

// AccountInfo is the state_storage data format for nativeToken balances
// Theory: new chains will be at least on metadata v14, and so we won't need to hardcode their AccountInfo type.
// But for chains we want to support which aren't on metadata v14, hardcode them here:
// If the chain upgrades to metadata v14, this override will be ignored :)
const RegularAccountInfoFallback = Struct({
  nonce: u32,
  consumers: u32,
  providers: u32,
  sufficients: u32,
  data: Struct({ free: u128, reserved: u128, miscFrozen: u128, feeFrozen: u128 }),
})
const NoSufficientsAccountInfoFallback = Struct({
  nonce: u32,
  consumers: u32,
  providers: u32,
  data: Struct({ free: u128, reserved: u128, miscFrozen: u128, feeFrozen: u128 }),
})
const AccountInfoOverrides: Record<
  string,
  typeof RegularAccountInfoFallback | typeof NoSufficientsAccountInfoFallback | undefined
> = {
  // crown-sterlin is not yet on metadata v14
  "crown-sterling": NoSufficientsAccountInfoFallback,

  // crust is not yet on metadata v14
  "crust": NoSufficientsAccountInfoFallback,

  // kulupu is not yet on metadata v14
  "kulupu": RegularAccountInfoFallback,

  // nftmart is not yet on metadata v14
  "nftmart": RegularAccountInfoFallback,
}

let commonMetadataObservable: Observable<Map<string, MiniMetadata>> | null = null

export class QueryCache {
  private balanceQueryCache = new Map<QueryKey, RpcStateQuery<SubNativeBalance>[]>()
  private metadataSub: Subscription

  constructor(private chaindataProvider: ChaindataProvider) {
    if (!commonMetadataObservable) {
      commonMetadataObservable = from(
        liveQuery(() =>
          balancesDb.miniMetadatas.where("source").equals("substrate-native").toArray()
        )
      ).pipe(
        map(
          (miniMetadatas) =>
            new Map(miniMetadatas.map((miniMetadata) => [miniMetadata.id, miniMetadata]))
        ),
        shareReplay({ bufferSize: 1, refCount: true })
      )
    }

    this.metadataSub = commonMetadataObservable
      .pipe(
        firstThenDebounce(500),
        detectMiniMetadataChanges(),
        combineLatestWith(chaindataProvider.tokensObservable),
        distinctUntilChanged()
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
    this.metadataSub.unsubscribe()
  }

  async getQueries(addressesByToken: AddressesByToken<SubNativeToken>) {
    if (!commonMetadataObservable) throw new Error("commonMetadataObservable is not initialized")
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
      { existing: [], newAddressesByToken: {} }
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
      queryResults.newAddressesByToken
    )
    // now update the cache
    Object.entries(queries).forEach(([key, query]) => {
      this.balanceQueryCache.set(key, query)
    })
    return queryResults.existing.concat(Object.values(queries).flat())
  }
}

async function buildQueries(
  chains: Record<string, Chain>,
  tokens: Record<string, Token>,
  chainStorageCoders: StorageCoders<{
    base: ["System", "Account"]
    reserves: ["Balances", "Reserves"]
    holds: ["Balances", "Holds"]
    locks: ["Balances", "Locks"]
    freezes: ["Balances", "Freezes"]
  }>,
  miniMetadatas: Map<string, MiniMetadata>,
  addressesByToken: AddressesByToken<SubNativeToken>
): Promise<Record<QueryKey, Array<RpcStateQuery<SubNativeBalance>>>> {
  return Object.entries(addressesByToken).reduce<
    Record<QueryKey, Array<RpcStateQuery<SubNativeBalance>>>
  >((outerResult, [tokenId, addresses]) => {
    const token = tokens[tokenId]
    if (!token) {
      log.warn(`Token ${tokenId} not found`)
      return outerResult
    }
    if (token.type !== "substrate-native") {
      log.debug(`This module doesn't handle tokens of type ${token.type}`)
      return outerResult
    }
    const chainId = token.chain?.id
    if (!chainId) {
      log.warn(`Token ${tokenId} has no chain`)
      return outerResult
    }
    const chain = chains[chainId]
    if (!chain) {
      log.warn(`Chain ${chainId} for token ${tokenId} not found`)
      return outerResult
    }

    const [chainMeta] = findChainMeta(miniMetadatas, "substrate-native", chain)
    const { useLegacyTransferableCalculation } = chainMeta ?? {}

    addresses.flat().forEach((address) => {
      const queryKey = `${tokenId}-${address}`
      // We share this balanceJson between the base and the lock query for this address
      const balanceJson: SubNativeBalance = {
        source: "substrate-native",
        status: "live",
        address,
        multiChainId: { subChainId: chainId },
        chainId,
        tokenId,
        values: [],
      }
      if (useLegacyTransferableCalculation) balanceJson.useLegacyTransferableCalculation = true

      let locksQueryLocks: Array<AmountWithLabel<string>> = []
      let freezesQueryLocks: Array<AmountWithLabel<string>> = []

      const baseQuery: RpcStateQuery<SubNativeBalance> | undefined = (() => {
        // For chains which are using metadata < v14
        const getFallbackStateKey = () => {
          const addressBytes = decodeAnyAddress(address)
          const addressHash = blake2Concat(addressBytes).replace(/^0x/, "")
          const moduleHash = "26aa394eea5630e07c48ae0c9558cef7" // util_crypto.xxhashAsHex("System", 128);
          const storageHash = "b99d880ec681799c0cf30e8886371da9" // util_crypto.xxhashAsHex("Account", 128);
          const moduleStorageHash = `${moduleHash}${storageHash}` // System.Account is the state_storage key prefix for nativeToken balances
          return `0x${moduleStorageHash}${addressHash}`
        }

        const scaleCoder = chainStorageCoders.get(chainId)?.base
        // NOTE: Only use fallback key when `scaleCoder` is not defined
        // i.e. when chain doesn't have metadata v14/v15
        const stateKey = scaleCoder
          ? encodeStateKey(
              scaleCoder,
              `Invalid address in ${chainId} base query ${address}`,
              address
            )
          : getFallbackStateKey()
        if (!stateKey) return

        const decodeResult = (change: string | null) => {
          // BEGIN: Handle chains which use metadata < v14
          let oldChainBalance = null
          if (!scaleCoder) {
            const scaleAccountInfo = AccountInfoOverrides[chainId]
            if (scaleAccountInfo === undefined) {
              // chain metadata version is < 15 and we also don't have an override hardcoded in
              // the best way to handle this case: log a warning and return an empty balance
              log.debug(
                `Token ${tokenId} on chain ${chainId} has no balance type for decoding. Defaulting to a balance of 0 (zero).`
              )
              return balanceJson
            }

            try {
              // eslint-disable-next-line no-var
              oldChainBalance = change === null ? null : scaleAccountInfo.dec(change)
            } catch (error) {
              log.warn(
                `Failed to create pre-metadataV14 balance type for token ${tokenId} on chain ${chainId}: ${error?.toString()}`
              )
              return balanceJson
            }
          }
          // END: Handle chains which use metadata < v14

          /** NOTE: This type is only a hint for typescript, the chain can actually return whatever it wants to */
          type DecodedType = {
            data?: {
              flags?: bigint
              free?: bigint
              frozen?: bigint
              reserved?: bigint

              // deprecated fields (they only show up on old chains)
              feeFrozen?: bigint
              miscFrozen?: bigint
            }
          }
          const decoded =
            decodeScale<DecodedType>(
              scaleCoder,
              change,
              `Failed to decode balance on chain ${chainId}`
            ) ?? oldChainBalance

          const free = (decoded?.data?.free ?? 0n).toString()
          const reserved = (decoded?.data?.reserved ?? 0n).toString()
          const miscLock = (
            (decoded?.data?.miscFrozen ?? 0n) +
            // new chains don't split their `frozen` amount into `feeFrozen` and `miscFrozen`.
            // for these chains, we'll use the `frozen` amount as `miscFrozen`.
            ((decoded?.data as DecodedType["data"])?.frozen ?? 0n)
          ).toString()
          const feesLock = (decoded?.data?.feeFrozen ?? 0n).toString()

          // even if these values are 0, we still need to add them to the balanceJson.values array
          // so that the balance pool can handle newly zeroed balances
          const existingValues = Object.fromEntries(
            balanceJson.values.map((v) => [getValueId(v), v])
          )
          const newValues: AmountWithLabel<string>[] = [
            { type: "free", label: "free", amount: free.toString() },
            { type: "reserved", label: "reserved", amount: reserved.toString() },
            { type: "locked", label: "misc", amount: miscLock.toString() },
            { type: "locked", label: "fees", amount: feesLock.toString() },
          ]

          const newValuesObj = Object.fromEntries(newValues.map((v) => [getValueId(v), v]))

          balanceJson.values = Object.values({ ...existingValues, ...newValuesObj })

          return balanceJson
        }

        return { chainId, stateKey, decodeResult }
      })()

      const locksQuery: RpcStateQuery<SubNativeBalance> | undefined = (() => {
        const scaleCoder = chainStorageCoders.get(chainId)?.locks
        const stateKey = encodeStateKey(
          scaleCoder,
          `Invalid address in ${chainId} locks query ${address}`,
          address
        )
        if (!stateKey) return

        const decodeResult = (change: string | null) => {
          /** NOTE: This type is only a hint for typescript, the chain can actually return whatever it wants to */
          type DecodedType = Array<{
            id?: Binary
            amount?: bigint
          }>

          const decoded = decodeScale<DecodedType>(
            scaleCoder,
            change,
            `Failed to decode lock on chain ${chainId}`
          )
          if (!decoded) return balanceJson

          locksQueryLocks = decoded.map?.((lock) => ({
            type: "locked",
            source: "substrate-native-locks",
            label: getLockedType(lock?.id?.asText?.()),
            amount: (lock?.amount ?? 0n).toString(),
          }))

          // locked values should be replaced entirely, not merged or appended
          const nonLockValues = balanceJson.values.filter(
            (v) => v.source !== "substrate-native-locks"
          )
          balanceJson.values = nonLockValues.concat(locksQueryLocks)

          return balanceJson
        }

        return { chainId, stateKey, decodeResult }
      })()

      const freezesQuery: RpcStateQuery<SubNativeBalance> | undefined = (() => {
        const scaleCoder = chainStorageCoders.get(chainId)?.freezes
        const stateKey = encodeStateKey(
          scaleCoder,
          `Invalid address in ${chainId} freezes query ${address}`,
          address
        )
        if (!stateKey) return

        const decodeResult = (change: string | null) => {
          /** NOTE: This type is only a hint for typescript, the chain can actually return whatever it wants to */
          type DecodedType = Array<{
            id?: { type?: string }
            amount?: bigint
          }>

          const decoded = decodeScale<DecodedType>(
            scaleCoder,
            change,
            `Failed to decode freeze on chain ${chainId}`
          )

          if (!decoded) return balanceJson

          freezesQueryLocks = decoded?.map?.((lock) => ({
            type: "locked",
            source: "substrate-native-freezes",
            label: getLockedType(lock?.id?.type?.toLowerCase?.()),
            amount: lock?.amount?.toString?.() ?? "0",
          }))

          // freezes values should be replaced entirely, not merged or appended
          const nonFreezesValues = balanceJson.values.filter(
            (v) => v.source !== "substrate-native-freezes"
          )
          balanceJson.values = nonFreezesValues.concat(freezesQueryLocks)

          return balanceJson
        }

        return { chainId, stateKey, decodeResult }
      })()

      const queries = [baseQuery, locksQuery, freezesQuery].filter(
        (query): query is RpcStateQuery<SubNativeBalance> => Boolean(query)
      )

      outerResult[queryKey] = queries
    })

    return outerResult
  }, {})
}
