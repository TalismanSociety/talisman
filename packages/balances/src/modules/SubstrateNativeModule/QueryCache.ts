import { createType, i128, TypeRegistry } from "@polkadot/types"
import { Chain, ChaindataProvider, ChainId, Token } from "@talismn/chaindata-provider"
import * as $ from "@talismn/subshape-fork"
import { blake2Concat, decodeAnyAddress, firstThenDebounce, isEthereumAddress } from "@talismn/util"
import { liveQuery } from "dexie"
import isEqual from "lodash/isEqual"
import {
  combineLatestWith,
  distinctUntilChanged,
  filter,
  firstValueFrom,
  from,
  map,
  pipe,
  shareReplay,
  Subscription,
} from "rxjs"

import { SubNativeBalance, SubNativeToken } from "."
import log from "../../log"
import { db as balancesDb } from "../../TalismanBalancesDatabase"
import { AddressesByToken, AmountWithLabel, getValueId, MiniMetadata } from "../../types"
import {
  buildStorageDecoders,
  findChainMeta,
  GetOrCreateTypeRegistry,
  getUniqueChainIds,
  RpcStateQuery,
  StorageDecoders,
  StorageHelper,
} from "../util"
import { getLockedType } from "../util/substrate-native"

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
//
// TODO: Move the AccountInfoFallback configs for each chain into the ChainMeta section of chaindata
const RegularAccountInfoFallback = JSON.stringify({
  nonce: "u32",
  consumers: "u32",
  providers: "u32",
  sufficients: "u32",
  data: { free: "u128", reserved: "u128", miscFrozen: "u128", feeFrozen: "u128" },
})
const NoSufficientsAccountInfoFallback = JSON.stringify({
  nonce: "u32",
  consumers: "u32",
  providers: "u32",
  data: { free: "u128", reserved: "u128", miscFrozen: "u128", feeFrozen: "u128" },
})

const AccountInfoOverrides: { [key: ChainId]: string } = {
  // crown-sterlin is not yet on metadata v14
  "crown-sterling": NoSufficientsAccountInfoFallback,

  // crust is not yet on metadata v14
  "crust": NoSufficientsAccountInfoFallback,

  // kulupu is not yet on metadata v14
  "kulupu": RegularAccountInfoFallback,

  // nftmart is not yet on metadata v14
  "nftmart": RegularAccountInfoFallback,
}

// NOTE: `liveQuery` is not initialized until commonMetadataObservable is subscribed to.
const commonMetadataObservable = from(
  liveQuery(() => balancesDb.miniMetadatas.where("source").equals("substrate-native").toArray())
).pipe(
  map((items) => new Map(items.map((item) => [item.id, item]))),
  // `refCount: true` will unsubscribe from the DB when commonMetadataObservable has no more subscribers
  shareReplay({ bufferSize: 1, refCount: true })
)

export class QueryCache {
  private balanceQueryCache = new Map<QueryKey, RpcStateQuery<SubNativeBalance>[]>()
  private metadataSub: Subscription | null = null

  constructor(
    private chaindataProvider: ChaindataProvider,
    private getOrCreateTypeRegistry: GetOrCreateTypeRegistry
  ) {}

  ensureSetup() {
    if (this.metadataSub) return

    this.metadataSub = commonMetadataObservable
      .pipe(
        firstThenDebounce(500),
        detectMiniMetadataChanges(),
        combineLatestWith(this.chaindataProvider.tokensObservable),
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
      { existing: [], newAddressesByToken: {} }
    )

    // build queries for token/address pairs which have not been queried before
    const miniMetadatas = await firstValueFrom(commonMetadataObservable)
    const uniqueChainIds = getUniqueChainIds(queryResults.newAddressesByToken, tokens)
    const chainStorageDecoders = this.getBaseStorageDecoders(uniqueChainIds, chains, miniMetadatas)
    const queries = await buildQueries(
      chains,
      tokens,
      chainStorageDecoders,
      miniMetadatas,
      this.getOrCreateTypeRegistry,
      queryResults.newAddressesByToken
    )
    // now update the cache
    Object.entries(queries).forEach(([key, query]) => {
      this.balanceQueryCache.set(key, query)
    })
    return queryResults.existing.concat(Object.values(queries).flat())
  }

  private getBaseStorageDecoders(
    chainIds: string[],
    allChains: Record<string, Chain>,
    miniMetadatas: Map<string, MiniMetadata>
  ) {
    const chains = Object.fromEntries(
      chainIds
        .filter((chainId) => allChains[chainId])
        .map((chainId) => [chainId, allChains[chainId]])
    )
    return buildStorageDecoders({
      chains,
      miniMetadatas,
      moduleType: "substrate-native",
      decoders: {
        baseDecoder: ["system", "account"],
        reservesDecoder: ["balances", "reserves"],
        holdsDecoder: ["balances", "holds"],
        locksDecoder: ["balances", "locks"],
        freezesDecoder: ["balances", "freezes"],
      },
    })
  }
}

async function buildQueries(
  chains: Record<string, Chain>,
  tokens: Record<string, Token>,
  chainStorageDecoders: StorageDecoders,
  miniMetadatas: Map<string, MiniMetadata>,
  getOrCreateTypeRegistry: GetOrCreateTypeRegistry,
  addressesByToken: AddressesByToken<SubNativeToken>
): Promise<Record<QueryKey, Array<RpcStateQuery<SubNativeBalance>>>> {
  return Object.entries(addressesByToken).reduce((outerResult, [tokenId, addresses]) => {
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
    const hasMetadataV14 =
      chainMeta?.miniMetadata !== undefined &&
      chainMeta?.miniMetadata !== null &&
      chainMeta?.metadataVersion >= 14
    const typeRegistry = hasMetadataV14
      ? getOrCreateTypeRegistry(chainId, chainMeta.miniMetadata ?? undefined)
      : new TypeRegistry()

    addresses.flat().forEach((address) => {
      const queryKey = `${tokenId}-${address}`
      // We share the balanceJson between the base and the lock query for this address
      const balanceJson: SubNativeBalance = {
        source: "substrate-native",
        status: "live",
        address,
        multiChainId: { subChainId: chainId },
        chainId,
        tokenId,
        values: [],
      }
      if (chainMeta?.useLegacyTransferableCalculation)
        balanceJson.useLegacyTransferableCalculation = true

      let locksQueryLocks: Array<AmountWithLabel<string>> = []
      let freezesQueryLocks: Array<AmountWithLabel<string>> = []

      const baseQuery: RpcStateQuery<SubNativeBalance> | undefined = (() => {
        const storageHelper = new StorageHelper(
          typeRegistry,
          "system",
          "account",
          decodeAnyAddress(address)
        )
        const storageDecoder = chainStorageDecoders.get(chainId)?.baseDecoder
        const getFallbackStateKey = () => {
          const addressBytes = decodeAnyAddress(address)
          const addressHash = blake2Concat(addressBytes).replace(/^0x/, "")
          const moduleHash = "26aa394eea5630e07c48ae0c9558cef7" // util_crypto.xxhashAsHex("System", 128);
          const storageHash = "b99d880ec681799c0cf30e8886371da9" // util_crypto.xxhashAsHex("Account", 128);
          const moduleStorageHash = `${moduleHash}${storageHash}` // System.Account is the state_storage key prefix for nativeToken balances
          return `0x${moduleStorageHash}${addressHash}`
        }

        /**
         * NOTE: For many MetadataV14 chains, it is not valid to encode an ethereum address into this System.Account state call.
         * However, because we have always made that state call in the past, existing users will have the result (a balance of `0`)
         * cached in their BalancesDB.
         *
         * So, until we refactor the storage of this module in a way which nukes the existing cached balances, we'll need to continue
         * making these invalid state calls to keep those balances from showing as `cached` or `stale`.
         *
         * Current logic:
         *
         *     stateKey: string = hasMetadataV14 && storageHelper.stateKey ? storageHelper.stateKey : getFallbackStateKey()
         *
         * Future (ideal) logic:
         *
         *     stateKey: string | undefined = hasMetadataV14 ? storageHelper.stateKey : getFallbackStateKey()
         */
        const stateKey =
          hasMetadataV14 && storageHelper.stateKey ? storageHelper.stateKey : getFallbackStateKey()

        const decodeResult = (change: string | null) => {
          // BEGIN: Handle chains which use metadata < v14
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let oldChainBalance: any = undefined
          if (!hasMetadataV14) {
            const accountInfoTypeDef = AccountInfoOverrides[chainId]
            if (accountInfoTypeDef === undefined) {
              // chain metadata version is < 14 and we also don't have an override hardcoded in
              // the best way to handle this case: log a warning and return an empty balance
              log.debug(
                `Token ${tokenId} on chain ${chainId} has no balance type for decoding. Defaulting to a balance of 0 (zero).`
              )
              return balanceJson
            }

            try {
              // eslint-disable-next-line no-var
              oldChainBalance = createType(typeRegistry, accountInfoTypeDef, change)
            } catch (error) {
              log.warn(
                `Failed to create pre-metadataV14 balance type for token ${tokenId} on chain ${chainId}: ${error?.toString()}`
              )
              return balanceJson
            }
          }
          // END: Handle chains which use metadata < v14

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const decoded: any =
            hasMetadataV14 && storageDecoder
              ? change === null
                ? null
                : storageDecoder.decode($.decodeHex(change))
              : oldChainBalance

          const bigIntOrCodecToBigInt = (value: bigint | i128): bigint =>
            typeof value === "bigint" ? value : value?.toBigInt?.()

          let free = bigIntOrCodecToBigInt(decoded?.data?.free) ?? 0n
          let reserved = bigIntOrCodecToBigInt(decoded?.data?.reserved) ?? 0n
          let miscFrozen =
            (bigIntOrCodecToBigInt(decoded?.data?.miscFrozen) ?? 0n) +
            // some chains don't split their `frozen` amount into `feeFrozen` and `miscFrozen`.
            // for those chains, we'll use the `frozen` amount as `miscFrozen`.
            (bigIntOrCodecToBigInt(decoded?.data?.frozen) ?? 0n)

          let feeFrozen = bigIntOrCodecToBigInt(decoded?.data?.feeFrozen) ?? 0n

          // we use the evm-native module to fetch native token balances for ethereum addresses on ethereum networks
          // but on moonbeam, moonriver and other chains which use ethereum addresses instead of substrate addresses,
          // we use both this module and the evm-native module
          if (isEthereumAddress(address) && chain.account !== "secp256k1")
            free = reserved = miscFrozen = feeFrozen = 0n

          // even if these values are 0, we still need to add them to the balanceJson.values array
          // so that the balance pool can handle newly zeroed balances
          const existingValues = Object.fromEntries(
            balanceJson.values.map((v) => [getValueId(v), v])
          )
          const newValues: AmountWithLabel<string>[] = [
            { type: "free", label: "free", amount: free.toString() },
            { type: "reserved", label: "reserved", amount: reserved.toString() },
            { type: "locked", label: "misc", amount: miscFrozen.toString() },
            { type: "locked", label: "fees", amount: feeFrozen.toString() },
          ]

          const newValuesObj = Object.fromEntries(newValues.map((v) => [getValueId(v), v]))

          balanceJson.values = Object.values({ ...existingValues, ...newValuesObj })

          return balanceJson
        }

        return { chainId, stateKey, decodeResult }
      })()

      const locksQuery: RpcStateQuery<SubNativeBalance> | undefined = (() => {
        const storageHelper = new StorageHelper(
          typeRegistry,
          "balances",
          "locks",
          decodeAnyAddress(address)
        )
        const storageDecoder = chainStorageDecoders.get(chainId)?.locksDecoder
        const stateKey = storageHelper.stateKey
        if (!stateKey) return
        const decodeResult = (change: string | null) => {
          if (change === null) return balanceJson

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const decoded: any =
            storageDecoder && change !== null ? storageDecoder.decode($.decodeHex(change)) : null
          if (decoded) {
            locksQueryLocks = decoded
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map?.((lock: any) => ({
                type: "locked",
                source: "substrate-native-locks",
                label: getLockedType(lock?.id?.toUtf8?.()),
                amount: lock.amount.toString(),
              }))

            // locked values should be replaced entirely, not merged or appended
            const nonLockValues = balanceJson.values.filter(
              (v) => v.source !== "substrate-native-locks"
            )
            balanceJson.values = nonLockValues.concat(locksQueryLocks)
          }

          return balanceJson
        }

        return { chainId, stateKey, decodeResult }
      })()

      const freezesQuery: RpcStateQuery<SubNativeBalance> | undefined = (() => {
        const storageHelper = new StorageHelper(
          typeRegistry,
          "balances",
          "freezes",
          decodeAnyAddress(address)
        )
        const storageDecoder = chainStorageDecoders.get(chainId)?.freezesDecoder
        const stateKey = storageHelper.stateKey
        if (!stateKey) return
        const decodeResult = (change: string | null) => {
          if (change === null) return balanceJson

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const decoded: any =
            storageDecoder && change !== null ? storageDecoder.decode($.decodeHex(change)) : null
          if (decoded) {
            freezesQueryLocks = decoded
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map?.((lock: any) => ({
                type: "locked",
                source: "substrate-native-freezes",
                label: getLockedType(lock?.id?.type?.toLowerCase?.()),
                amount: lock.amount.toString(),
              }))

            // freezes values should be replaced entirely, not merged or appended
            const nonFreezesValues = balanceJson.values.filter(
              (v) => v.source !== "substrate-native-freezes"
            )
            balanceJson.values = nonFreezesValues.concat(freezesQueryLocks)
          }
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
  }, {} as Record<QueryKey, Array<RpcStateQuery<SubNativeBalance>>>)
}
