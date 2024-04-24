/* eslint-disable @typescript-eslint/no-unused-vars */
import { TypeRegistry, createType, i128 } from "@polkadot/types"
import { ExtDef } from "@polkadot/types/extrinsic/signedExtensions/types"
import { assert, u8aToHex, u8aToString } from "@polkadot/util"
import { defineMethod } from "@substrate/txwrapper-core"
import PromisePool from "@supercharge/promise-pool"
import { ChainConnector } from "@talismn/chain-connector"
import {
  BalancesConfigTokenParams,
  ChainId,
  ChaindataProvider,
  NewTokenType,
  githubTokenLogoUrl,
} from "@talismn/chaindata-provider"
import {
  $metadataV14,
  PalletMV14,
  StorageEntryMV14,
  filterMetadataPalletsAndItems,
  getMetadataVersion,
  transformMetadataV14,
} from "@talismn/scale"
import * as $ from "@talismn/subshape-fork"
import {
  Deferred,
  blake2Concat,
  decodeAnyAddress,
  firstThenDebounce,
  isEthereumAddress,
} from "@talismn/util"
import isEqual from "lodash/isEqual"
import {
  BehaviorSubject,
  Observable,
  bufferCount,
  combineLatest,
  from,
  interval,
  map,
  mergeMap,
  pairwise,
  scan,
  share,
  startWith,
  switchAll,
  switchMap,
  takeUntil,
} from "rxjs"

import { DefaultBalanceModule, NewBalanceModule, NewTransferParamsType } from "../BalanceModule"
import log from "../log"
import { db as balancesDb } from "../TalismanBalancesDatabase"
import {
  AddressesByToken,
  AmountWithLabel,
  Balances,
  NewBalanceType,
  SubscriptionCallback,
  getBalanceId,
  getValueId,
} from "../types"
import {
  GetOrCreateTypeRegistry,
  RpcStateQuery,
  RpcStateQueryHelper,
  StorageHelper,
  buildStorageDecoders,
  createTypeRegistryCache,
  detectTransferMethod,
  findChainMeta,
  getUniqueChainIds,
} from "./util"
import {
  asObservable,
  crowdloanFundContributionsChildKey,
  getLockedType,
  nompoolStashAccountId,
} from "./util/substrate-native"

type ModuleType = "substrate-native"

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
  // automata is not yet on metadata v14
  "automata": RegularAccountInfoFallback,

  // crown-sterlin is not yet on metadata v14
  "crown-sterling": NoSufficientsAccountInfoFallback,

  // crust is not yet on metadata v14
  "crust": NoSufficientsAccountInfoFallback,

  // kulupu is not yet on metadata v14
  "kulupu": RegularAccountInfoFallback,

  // nftmart is not yet on metadata v14
  "nftmart": RegularAccountInfoFallback,
}

export const subNativeTokenId = (chainId: ChainId) =>
  `${chainId}-substrate-native`.toLowerCase().replace(/ /g, "-")

/**
 * Function to merge two 'sub sources' of the same balance together, or
 * two instances of the same balance with different values.
 * @param balance1 SubNativeBalance
 * @param balance2 SubNativeBalance
 * @returns SubNativeBalance
 */
const mergeValues = (balance1: SubNativeBalance, balance2: SubNativeBalance) => {
  assert(
    getBalanceId(balance1) === getBalanceId(balance2),
    "Balances with different IDs should not be merged"
  )
  const valuesMap = Object.fromEntries(balance1.values.map((value) => [getValueId(value), value]))
  for (const value of balance2.values) {
    // whether it exists or not, we can update or create it like this
    valuesMap[getValueId(value)] = value
  }
  const merged = { ...balance1, values: Object.values(valuesMap) }
  return merged
}

export type SubNativeToken = NewTokenType<
  ModuleType,
  {
    existentialDeposit: string
    chain: { id: ChainId }
  }
>
export type CustomSubNativeToken = SubNativeToken & {
  isCustom: true
}

declare module "@talismn/chaindata-provider/plugins" {
  export interface PluginTokenTypes {
    SubNativeToken: SubNativeToken
    CustomSubNativeToken: CustomSubNativeToken
  }
}

export type SubNativeChainMeta = {
  isTestnet: boolean
  useLegacyTransferableCalculation?: boolean
  symbol: string
  decimals: number
  existentialDeposit: string | null
  nominationPoolsPalletId: string | null
  crowdloanPalletId: string | null
  miniMetadata: `0x${string}` | null
  metadataVersion: number
}

export type SubNativeModuleConfig = {
  disable?: boolean
} & BalancesConfigTokenParams

export type SubNativeBalance = NewBalanceType<ModuleType, "complex", "substrate">

declare module "@talismn/balances/plugins" {
  export interface PluginBalanceTypes {
    "substrate-native": SubNativeBalance
  }
}

export type BalancesCommonTransferMethods = "transferKeepAlive" | "transferAll"
export type BalancesTransferMethods = "transferAllowDeath" | BalancesCommonTransferMethods
export type BalancesLegacyTransferMethods = "transfer" | BalancesCommonTransferMethods
export type BalancesAllTransferMethods = BalancesLegacyTransferMethods | BalancesTransferMethods

export type SubNativeTransferParams = NewTransferParamsType<{
  registry: TypeRegistry
  metadataRpc: `0x${string}`
  blockHash: string
  blockNumber: number
  nonce: number
  specVersion: number
  transactionVersion: number
  tip?: string
  transferMethod: BalancesAllTransferMethods
  userExtensions?: ExtDef
}>

const subNativeBalances = new BehaviorSubject<Record<string, SubNativeBalance>>({})
const positiveBalanceTokens = subNativeBalances.pipe(
  map((balances) => Array.from(new Set(Object.values(balances).map((b) => b.tokenId)))),
  share()
)

const POLLING_WINDOW_SIZE = 20

export const SubNativeModule: NewBalanceModule<
  ModuleType,
  SubNativeToken | CustomSubNativeToken,
  SubNativeChainMeta,
  SubNativeModuleConfig,
  SubNativeTransferParams
> = (hydrate) => {
  const { chainConnectors, chaindataProvider, initialBalances } = hydrate
  const chainConnector = chainConnectors.substrate
  assert(chainConnector, "This module requires a substrate chain connector")
  const relevantInitialBalances = Object.fromEntries(
    initialBalances
      ?.filter((b): b is SubNativeBalance => b.source === "substrate-native")
      .map((b) => [getBalanceId(b), b]) ?? []
  )

  subNativeBalances.next(relevantInitialBalances)

  const { getOrCreateTypeRegistry } = createTypeRegistryCache()

  return {
    ...DefaultBalanceModule("substrate-native"),

    async fetchSubstrateChainMeta(chainId, moduleConfig, metadataRpc) {
      const isTestnet = (await chaindataProvider.chainById(chainId))?.isTestnet || false

      if (moduleConfig?.disable === true || metadataRpc === undefined)
        return {
          isTestnet,
          symbol: "",
          decimals: 0,
          existentialDeposit: null,
          nominationPoolsPalletId: null,
          crowdloanPalletId: null,
          miniMetadata: null,
          metadataVersion: 0,
        }

      const chainProperties = await chainConnector.send(chainId, "system_properties", [])

      const metadataVersion = getMetadataVersion(metadataRpc)

      const { tokenSymbol, tokenDecimals } = chainProperties

      const symbol: string = (Array.isArray(tokenSymbol) ? tokenSymbol[0] : tokenSymbol) ?? "Unit"
      const decimals: number =
        (Array.isArray(tokenDecimals) ? tokenDecimals[0] : tokenDecimals) ?? 0

      if (metadataVersion !== 14)
        return {
          isTestnet,
          symbol,
          decimals,
          existentialDeposit: null,
          nominationPoolsPalletId: null,
          crowdloanPalletId: null,
          miniMetadata: null,
          metadataVersion,
        }

      const metadata = $metadataV14.decode($.decodeHex(metadataRpc))
      const subshape = transformMetadataV14(metadata)

      const existentialDeposit = (
        subshape.pallets.Balances?.constants.ExistentialDeposit?.codec.decode?.(
          subshape.pallets.Balances.constants.ExistentialDeposit.value
        ) ?? 0n
      ).toString()
      const nominationPoolsPalletId = subshape.pallets.NominationPools?.constants.PalletId?.value
        ? u8aToHex(subshape.pallets.NominationPools?.constants.PalletId?.value)
        : null
      const crowdloanPalletId = subshape.pallets.Crowdloan?.constants.PalletId?.value
        ? u8aToHex(subshape.pallets.Crowdloan?.constants.PalletId?.value)
        : null

      const isSystemPallet = (pallet: PalletMV14) => pallet.name === "System"
      const isAccountItem = (item: StorageEntryMV14) => item.name === "Account"

      const isBalancesPallet = (pallet: PalletMV14) => pallet.name === "Balances"
      const isReservesItem = (item: StorageEntryMV14) => item.name === "Reserves"
      const isHoldsItem = (item: StorageEntryMV14) => item.name === "Holds"
      const isLocksItem = (item: StorageEntryMV14) => item.name === "Locks"
      const isFreezesItem = (item: StorageEntryMV14) => item.name === "Freezes"

      const isNomPoolsPallet = (pallet: PalletMV14) => pallet.name === "NominationPools"
      const isPoolMembersItem = (item: StorageEntryMV14) => item.name === "PoolMembers"
      const isBondedPoolsItem = (item: StorageEntryMV14) => item.name === "BondedPools"
      const isMetadataItem = (item: StorageEntryMV14) => item.name === "Metadata"

      const isStakingPallet = (pallet: PalletMV14) => pallet.name === "Staking"
      const isLedgerItem = (item: StorageEntryMV14) => item.name === "Ledger"

      const isCrowdloanPallet = (pallet: PalletMV14) => pallet.name === "Crowdloan"
      const isFundsItem = (item: StorageEntryMV14) => item.name === "Funds"

      const isParasPallet = (pallet: PalletMV14) => pallet.name === "Paras"
      const isParachainsItem = (item: StorageEntryMV14) => item.name === "Parachains"

      // TODO: Handle metadata v15
      filterMetadataPalletsAndItems(metadata, [
        { pallet: isSystemPallet, items: [isAccountItem] },
        {
          pallet: isBalancesPallet,
          items: [isReservesItem, isHoldsItem, isLocksItem, isFreezesItem],
        },
        {
          pallet: isNomPoolsPallet,
          items: [isPoolMembersItem, isBondedPoolsItem, isMetadataItem],
        },
        { pallet: isStakingPallet, items: [isLedgerItem] },
        { pallet: isCrowdloanPallet, items: [isFundsItem] },
        { pallet: isParasPallet, items: [isParachainsItem] },
      ])
      metadata.extrinsic.signedExtensions = []

      const miniMetadata = $.encodeHexPrefixed($metadataV14.encode(metadata)) as `0x${string}`

      const hasFreezesItem = Boolean(
        metadata.pallets.find(isBalancesPallet)?.storage?.entries.find(isFreezesItem)
      )
      const useLegacyTransferableCalculation = !hasFreezesItem

      const chainMeta: SubNativeChainMeta = {
        isTestnet,
        symbol,
        decimals,
        existentialDeposit,
        nominationPoolsPalletId,
        crowdloanPalletId,
        miniMetadata,
        metadataVersion,
      }
      if (useLegacyTransferableCalculation) chainMeta.useLegacyTransferableCalculation = true

      return chainMeta
    },

    async fetchSubstrateChainTokens(chainId, chainMeta, moduleConfig) {
      if (moduleConfig?.disable === true) return {}

      const { isTestnet, symbol, decimals, existentialDeposit } = chainMeta

      const id = subNativeTokenId(chainId)

      const nativeToken: SubNativeToken = {
        id,
        type: "substrate-native",
        isTestnet,
        isDefault: moduleConfig?.isDefault ?? true,
        symbol,
        decimals,
        logo: moduleConfig?.logo || githubTokenLogoUrl(id),
        existentialDeposit: existentialDeposit ?? "0",
        chain: { id: chainId },
      }

      if (moduleConfig?.symbol) nativeToken.symbol = moduleConfig?.symbol
      if (moduleConfig?.coingeckoId) nativeToken.coingeckoId = moduleConfig?.coingeckoId
      if (moduleConfig?.dcentName) nativeToken.dcentName = moduleConfig?.dcentName
      if (moduleConfig?.mirrorOf) nativeToken.mirrorOf = moduleConfig?.mirrorOf

      return { [nativeToken.id]: nativeToken }
    },

    async subscribeBalances(addressesByToken, callback) {
      assert(chainConnectors.substrate, "This module requires a substrate chain connector")

      // an initialised balance is one where we have received a response for any type of 'subsource',
      // until then they are initialising. We only need to maintain one map of tokens to addresses for this
      const initialisingBalances = Object.entries(addressesByToken).reduce<
        Map<string, Set<string>>
      >((acc, [tokenId, addresses]) => {
        acc.set(tokenId, new Set(addresses))
        return acc
      }, new Map())

      const _callbackSub = subNativeBalances.pipe(firstThenDebounce(1000)).subscribe({
        next: (balances) => {
          callback(null, {
            status: initialisingBalances.size > 0 ? "initialising" : "live",
            data: Object.values(balances),
          })
        },
        error: (error) => callback(error),
      })

      // TODO: Create a more elegant system which can handle the following use cases
      //
      // For now, we're just going to manually create three separate subscription handlers
      //
      // We can't just pass a bunch of queries into a single handler because for crowdloans
      // and staking we must first make some queries for some data and then create new queries
      // based on the result of those first queries
      // This is a usecase which is not yet managed by the RpcStateQueryHelper
      //
      // Eventually we should be able to delete the Deferred and just create the one
      // `subscribeBase` handler which handles everything

      const unsubDeferred = Deferred()
      // we return this to the caller so that they can let us know when they're no longer interested in this subscription
      const callerUnsubscribe = () => {
        _callbackSub.unsubscribe()
        return unsubDeferred.reject(new Error(`Caller unsubscribed`))
      }
      // we queue up our work to clean up our subscription when this promise rejects
      const callerUnsubscribed = unsubDeferred.promise

      // The update handler is to allow us to merge balances with the same id, and manage initialising and positive balances state for each
      // balance type and network
      const handleUpdate: SubscriptionCallback<SubNativeBalance[]> = (error, result) => {
        if (result) {
          const currentBalances = subNativeBalances.getValue()
          const mergedBalances: Record<string, SubNativeBalance> = {}
          result.forEach((b) => {
            const bId = getBalanceId(b)
            const existing = currentBalances[bId]
            // merge the values from the new balance into the existing balance, if there is one
            mergedBalances[bId] = existing ? mergeValues(existing, b) : b

            // update initialisingBalances to remove balances which have been updated
            const intialisingForToken = initialisingBalances.get(b.tokenId)
            if (intialisingForToken) intialisingForToken.delete(b.address)
            if (intialisingForToken && intialisingForToken.size === 0)
              initialisingBalances.delete(b.tokenId)
          })

          subNativeBalances.next({
            ...currentBalances,
            ...mergedBalances,
          })
        }
        if (error) {
          if (error instanceof SubNativeBalanceError) {
            initialisingBalances.delete(error.tokenId)
          }
          return callback(error)
        }
      }

      // subscribe to addresses and tokens for which we have a known positive balance
      const positiveSub = positiveBalanceTokens
        .pipe(
          firstThenDebounce(1000),
          map((tokenIds) =>
            tokenIds.reduce((acc, tokenId) => {
              acc[tokenId] = addressesByToken[tokenId]
              return acc
            }, {} as AddressesByToken<SubNativeToken>)
          ),
          startWith({}),
          pairwise()
        )
        .pipe(
          switchMap(([previousAddressesByToken, newAddressesByToken]) => {
            return new Observable((subscriber) => {
              if (!chainConnectors.substrate) return
              if (isEqual(previousAddressesByToken, newAddressesByToken)) return

              const unsubNompoolStaking = subscribeNompoolStaking(
                chaindataProvider,
                chainConnectors.substrate,
                getOrCreateTypeRegistry,
                newAddressesByToken,
                handleUpdate
              )
              const unsubCrowdloans = subscribeCrowdloans(
                chaindataProvider,
                chainConnectors.substrate,
                getOrCreateTypeRegistry,
                newAddressesByToken,
                handleUpdate
              )
              const unsubBase = subscribeBase(
                chaindataProvider,
                chainConnectors.substrate,
                getOrCreateTypeRegistry,
                newAddressesByToken,
                handleUpdate
              )

              subscriber.add(async () => (await unsubNompoolStaking)())
              subscriber.add(async () => (await unsubCrowdloans)())
              subscriber.add(async () => (await unsubBase)())
            })
          })
        )
        .subscribe()

      // for chains where we don't have a known positive balance, poll rather than subscribe
      const poll = async (addressesByToken: AddressesByToken<SubNativeToken> = {}) => {
        try {
          const balances = await this.fetchBalances(addressesByToken)
          handleUpdate(null, Object.values(balances.toJSON()) as SubNativeBalance[])
        } catch (error) {
          Object.keys(addressesByToken).forEach((tokenId) => {
            const wrappedError = new SubNativeBalanceError(tokenId, (error as Error).message)
            handleUpdate(wrappedError)
          })
        }
      }
      // do one poll to get things started
      const currentBalances = subNativeBalances.getValue()
      const currentTokens = Object.values(currentBalances).map((b) => b.tokenId)
      const nonCurrentTokens = Object.keys(addressesByToken).filter(
        (tokenId) => !currentTokens.includes(tokenId)
      )
      // break nonCurrentTokens into chunks of POLLING_WINDOW_SIZE
      await PromisePool.withConcurrency(POLLING_WINDOW_SIZE)
        .for(nonCurrentTokens)
        .process(
          async (nonCurrentTokenId) =>
            await poll({ [nonCurrentTokenId]: addressesByToken[nonCurrentTokenId] })
        )

      // now poll every 30s on chains for which we do not have a known positive balance
      // we chunk this observable into batches of positive token ids, to prevent eating all the websocket connections
      const pollingSub = interval(30_000) // emit values every 30 seconds
        .pipe(
          takeUntil(callerUnsubscribed),
          switchMap(() =>
            positiveBalanceTokens.pipe(
              map((positiveTokenIds) =>
                Object.keys(addressesByToken).filter(
                  (tokenId) => !positiveTokenIds.includes(tokenId)
                )
              ),
              mergeMap((tokenIds) => from(tokenIds)), // Emit each tokenId individually
              bufferCount(POLLING_WINDOW_SIZE) // Chunk the emitted individual tokenIds
            )
          ),
          mergeMap((tokenChunk) => {
            // tokenChunk is a chunk of tokenIds with size POLLING_WINDOW_SIZE
            const pollingTokenAddresses = Object.fromEntries(
              tokenChunk.map((tokenId) => [tokenId, addressesByToken[tokenId]])
            )
            return from(poll(pollingTokenAddresses)) // Handle the poll promise with from
          })
        )
        .subscribe()

      return () => {
        callerUnsubscribe()
        positiveSub.unsubscribe()
        pollingSub.unsubscribe()
      }
    },

    async fetchBalances(addressesByToken) {
      assert(chainConnectors.substrate, "This module requires a substrate chain connector")

      const queries = await buildQueries(
        chaindataProvider,
        getOrCreateTypeRegistry,
        addressesByToken
      )
      const result = await new RpcStateQueryHelper(chainConnectors.substrate, queries).fetch()

      return new Balances(result ?? [])
    },

    async transferToken({
      tokenId,
      from,
      to,
      amount,

      registry,
      metadataRpc,
      blockHash,
      blockNumber,
      nonce,
      specVersion,
      transactionVersion,
      tip,
      transferMethod,
      userExtensions,
    }) {
      const token = await chaindataProvider.tokenById(tokenId)
      assert(token, `Token ${tokenId} not found in store`)

      if (token.type !== "substrate-native")
        throw new Error(`This module doesn't handle tokens of type ${token.type}`)

      const chainId = token.chain.id
      const chain = await chaindataProvider.chainById(chainId)
      assert(chain?.genesisHash, `Chain ${chainId} not found in store`)

      const { genesisHash } = chain

      const sendAll = transferMethod === "transferAll"

      let method: BalancesAllTransferMethods = transferMethod
      if (transferMethod === "transferAllowDeath") {
        try {
          method = detectTransferMethod(metadataRpc)
        } catch (cause) {
          log.debug(
            new Error(
              `An error occured while detecting the presence of the deprecated Balances::transfer call on chain ${chainId}`,
              { cause }
            )
          )
        }
      }

      const pallet = "balances"
      const args = sendAll ? { dest: to, keepAlive: false } : { dest: to, value: amount }

      const unsigned = defineMethod(
        {
          method: {
            pallet,
            name: method,
            args,
          },
          address: from,
          blockHash,
          blockNumber,
          eraPeriod: 64,
          genesisHash,
          metadataRpc,
          nonce,
          specVersion,
          tip: tip ? Number(tip) : 0,
          transactionVersion,
        },
        { metadataRpc, registry, userExtensions }
      )

      return { type: "substrate", tx: unsigned }
    },
  }
}

async function buildQueries(
  chaindataProvider: ChaindataProvider,
  getOrCreateTypeRegistry: GetOrCreateTypeRegistry,
  addressesByToken: AddressesByToken<SubNativeToken>
): Promise<Array<RpcStateQuery<SubNativeBalance>>> {
  const chains = await chaindataProvider.chainsById()
  const tokens = await chaindataProvider.tokensById()
  const miniMetadatas = new Map(
    (await balancesDb.miniMetadatas.toArray()).map((miniMetadata) => [
      miniMetadata.id,
      miniMetadata,
    ])
  )

  const uniqueChainIds = getUniqueChainIds(addressesByToken, tokens)
  const chainStorageDecoders = buildStorageDecoders({
    chainIds: uniqueChainIds,
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

  return Object.entries(addressesByToken).flatMap(([tokenId, addresses]) => {
    const token = tokens[tokenId]
    if (!token) {
      log.warn(`Token ${tokenId} not found`)
      return []
    }

    if (token.type !== "substrate-native") {
      log.debug(`This module doesn't handle tokens of type ${token.type}`)
      return []
    }

    const chainId = token.chain?.id
    if (!chainId) {
      log.warn(`Token ${tokenId} has no chain`)
      return []
    }

    const chain = chains[chainId]
    if (!chain) {
      log.warn(`Chain ${chainId} for token ${tokenId} not found`)
      return []
    }

    const [chainMeta] = findChainMeta<typeof SubNativeModule>(
      miniMetadatas,
      "substrate-native",
      chain
    )
    const hasMetadataV14 =
      chainMeta?.miniMetadata !== undefined &&
      chainMeta?.miniMetadata !== null &&
      chainMeta?.metadataVersion >= 14
    const typeRegistry = hasMetadataV14
      ? getOrCreateTypeRegistry(chainId, chainMeta.miniMetadata ?? undefined)
      : new TypeRegistry()

    return addresses.flatMap((address) => {
      // We share thie balanceJson between the base and the lock query for this address
      //
      // TODO: Rearchitect the balance type (a tiny bit) so that it doesn't assume that one instance
      // of `Balance` is unique to one address and tokenId.
      //
      // Instead, we should allow for `address-tokenId-base` and `address-tokenId-lock` and `address-tokenId-staked` variations
      // of the one balance. Then calls to e.g. balances.find({ tokenId, address }).locked should be able to
      // do the correct locked calculation across the various Balance objects.
      //
      // This will allow us to handle caching etc on a Balance variation basis without messing up the locks calculation
      // (which takes the biggest lock for an address and tokenId, instead of adding the locks together)
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

          if (free > 0n)
            balanceJson.values.push({ type: "free", label: "free", amount: free.toString() })
          if (reserved > 0n)
            balanceJson.values.push({
              type: "reserved",
              label: "reserved",
              amount: reserved.toString(),
            })
          if (miscFrozen > 0n)
            balanceJson.values.push({
              type: "locked",
              label: "misc",
              amount: miscFrozen.toString(),
            })
          if (feeFrozen > 0n)
            balanceJson.values.push({ type: "locked", label: "fees", amount: feeFrozen.toString() })

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
              .filter((lock: any) => lock?.amount > 0n)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map?.((lock: any) => ({
                type: "locked",
                source: "substrate-native-locks",
                label: getLockedType(lock?.id?.toUtf8?.()),
                amount: lock.amount.toString(),
              }))

            if (locksQueryLocks?.length > 0) {
              balanceJson.values.push(...locksQueryLocks)
            }
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
              .filter?.((lock: any) => lock?.amount > 0n)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map?.((lock: any) => ({
                type: "locked",
                source: "substrate-native-freezes",
                label: getLockedType(lock?.id?.type?.toLowerCase?.()),
                amount: lock.amount.toString(),
              }))

            if (freezesQueryLocks.length > 0) {
              balanceJson.values.push(...freezesQueryLocks)
            }
          }
          return balanceJson
        }

        return { chainId, stateKey, decodeResult }
      })()

      const queries: Array<RpcStateQuery<SubNativeBalance>> = [
        baseQuery,
        locksQuery,
        freezesQuery,
      ].filter((query): query is RpcStateQuery<SubNativeBalance> => Boolean(query))

      return queries
    })
  })
}

async function subscribeNompoolStaking(
  chaindataProvider: ChaindataProvider,
  chainConnector: ChainConnector,
  getOrCreateTypeRegistry: GetOrCreateTypeRegistry,
  addressesByToken: AddressesByToken<SubNativeToken>,
  callback: SubscriptionCallback<SubNativeBalance[]>
) {
  const chains = await chaindataProvider.chainsById()
  const tokens = await chaindataProvider.tokensById()
  const miniMetadatas = new Map(
    (await balancesDb.miniMetadatas.toArray()).map((miniMetadata) => [
      miniMetadata.id,
      miniMetadata,
    ])
  )
  const nomPoolTokenIds = Object.entries(tokens)
    .filter(([, token]) => {
      // ignore non-native tokens
      if (token.type !== "substrate-native") return false
      // ignore tokens on chains with no nompools pallet
      const [chainMeta] = findChainMeta<typeof SubNativeModule>(
        miniMetadatas,
        "substrate-native",
        chains[token.chain.id]
      )
      return typeof chainMeta?.nominationPoolsPalletId === "string"
    })
    .map(([tokenId]) => tokenId)

  // staking can only be done by the native token on chains with the staking pallet
  const addressesByNomPoolToken = Object.fromEntries(
    Object.entries(addressesByToken)
      // remove ethereum addresses
      .map(([tokenId, addresses]): [string, string[]] => [
        tokenId,
        addresses.filter((address) => !isEthereumAddress(address)),
      ])
      // remove tokens which aren't nom pool tokens
      .filter(([tokenId]) => nomPoolTokenIds.includes(tokenId))
  )

  const uniqueChainIds = getUniqueChainIds(addressesByNomPoolToken, tokens)
  const chainStorageDecoders = buildStorageDecoders({
    chainIds: uniqueChainIds,
    chains,
    miniMetadatas,
    moduleType: "substrate-native",
    decoders: {
      poolMembersDecoder: ["nominationPools", "poolMembers"],
      bondedPoolsDecoder: ["nominationPools", "bondedPools"],
      ledgerDecoder: ["staking", "ledger"],
      metadataDecoder: ["nominationPools", "metadata"],
    },
  })

  const resultUnsubscribes: Array<() => void> = []
  for (const [tokenId, addresses] of Object.entries(addressesByNomPoolToken)) {
    const token = tokens[tokenId]
    if (!token) {
      log.warn(`Token ${tokenId} not found`)
      continue
    }
    if (token.type !== "substrate-native") {
      log.debug(`This module doesn't handle tokens of type ${token.type}`)
      continue
    }
    const chainId = token.chain?.id
    if (!chainId) {
      log.warn(`Token ${tokenId} has no chain`)
      continue
    }
    const chain = chains[chainId]
    if (!chain) {
      log.warn(`Chain ${chainId} for token ${tokenId} not found`)
      continue
    }
    const [chainMeta] = findChainMeta<typeof SubNativeModule>(
      miniMetadatas,
      "substrate-native",
      chain
    )
    const typeRegistry =
      chainMeta?.miniMetadata !== undefined &&
      chainMeta?.miniMetadata !== null &&
      chainMeta?.metadataVersion >= 14
        ? getOrCreateTypeRegistry(chainId, chainMeta.miniMetadata)
        : new TypeRegistry()

    type PoolMembers = {
      tokenId: string
      address: string
      poolId?: string
      points?: string
      unbondingEras: Array<{ era?: string; amount?: string }>
    }
    const subscribePoolMembers = (
      addresses: string[],
      callback: SubscriptionCallback<PoolMembers[]>
    ) => {
      const storageDecoder = chainStorageDecoders.get(chainId)?.poolMembersDecoder
      const queries = addresses.flatMap((address): RpcStateQuery<PoolMembers> | [] => {
        const storageHelper = new StorageHelper(
          typeRegistry,
          "nominationPools",
          "poolMembers",
          decodeAnyAddress(address)
        )
        const stateKey = storageHelper.stateKey
        if (!stateKey) return []
        const decodeResult = (change: string | null) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const decoded: any =
            storageDecoder && change !== null ? storageDecoder.decode($.decodeHex(change)) : null

          const poolId: string | undefined = decoded?.poolId?.toString?.()
          const points: string | undefined = decoded?.points?.toString?.()
          const unbondingEras: Array<{ era: string; amount: string }> =
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Array.from(decoded?.unbondingEras ?? []).flatMap((entry: any) => {
              const [key, value] = Array.from(entry)

              const era = key?.toString?.()
              const amount = value?.toString?.()
              if (typeof era !== "string" || typeof amount !== "string") return []

              return { era, amount }
            })

          return { tokenId, address, poolId, points, unbondingEras }
        }

        return { chainId, stateKey, decodeResult }
      })

      const subscription = new RpcStateQueryHelper(chainConnector, queries).subscribe(callback)
      return () => subscription.then((unsubscribe) => unsubscribe())
    }

    type PoolPoints = { poolId: string; points?: string }
    const subscribePoolPoints = (
      poolIds: string[],
      callback: SubscriptionCallback<PoolPoints[]>
    ) => {
      if (poolIds.length === 0) callback(null, [])

      const storageDecoder = chainStorageDecoders.get(chainId)?.bondedPoolsDecoder
      const queries = poolIds.flatMap((poolId): RpcStateQuery<PoolPoints> | [] => {
        const storageHelper = new StorageHelper(
          typeRegistry,
          "nominationPools",
          "bondedPools",
          poolId
        )
        const stateKey = storageHelper.stateKey
        if (!stateKey) return []
        const decodeResult = (change: string | null) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const decoded: any =
            storageDecoder && change !== null ? storageDecoder.decode($.decodeHex(change)) : null

          const points: string | undefined = decoded?.points?.toString?.()

          return { poolId, points }
        }

        return { chainId, stateKey, decodeResult }
      })

      const subscription = new RpcStateQueryHelper(chainConnector, queries).subscribe(callback)
      return () => subscription.then((unsubscribe) => unsubscribe())
    }

    type PoolStake = { poolId: string; activeStake?: string }
    const subscribePoolStake = (poolIds: string[], callback: SubscriptionCallback<PoolStake[]>) => {
      if (poolIds.length === 0) callback(null, [])

      const storageDecoder = chainStorageDecoders.get(chainId)?.ledgerDecoder
      const queries = poolIds.flatMap((poolId): RpcStateQuery<PoolStake> | [] => {
        if (!chainMeta?.nominationPoolsPalletId) return []
        const storageHelper = new StorageHelper(
          typeRegistry,
          "staking",
          "ledger",
          nompoolStashAccountId(typeRegistry, chainMeta?.nominationPoolsPalletId, poolId)
        )
        const stateKey = storageHelper.stateKey
        if (!stateKey) return []
        const decodeResult = (change: string | null) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const decoded: any =
            storageDecoder && change !== null ? storageDecoder.decode($.decodeHex(change)) : null

          const activeStake: string | undefined = decoded?.active?.toString?.()

          return { poolId, activeStake }
        }

        return { chainId, stateKey, decodeResult }
      })

      const subscription = new RpcStateQueryHelper(chainConnector, queries).subscribe(callback)
      return () => subscription.then((unsubscribe) => unsubscribe())
    }

    type PoolMetadata = { poolId: string; metadata?: string }
    const subscribePoolMetadata = (
      poolIds: string[],
      callback: SubscriptionCallback<PoolMetadata[]>
    ) => {
      if (poolIds.length === 0) callback(null, [])

      const storageDecoder = chainStorageDecoders.get(chainId)?.metadataDecoder
      const queries = poolIds.flatMap((poolId): RpcStateQuery<PoolMetadata> | [] => {
        if (!chainMeta?.nominationPoolsPalletId) return []
        const storageHelper = new StorageHelper(typeRegistry, "nominationPools", "metadata", poolId)
        const stateKey = storageHelper.stateKey
        if (!stateKey) return []
        const decodeResult = (change: string | null) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const decoded: any =
            storageDecoder && change !== null ? storageDecoder.decode($.decodeHex(change)) : null

          const metadata = u8aToString(decoded)

          return { poolId, metadata }
        }

        return { chainId, stateKey, decodeResult }
      })

      const subscription = new RpcStateQueryHelper(chainConnector, queries).subscribe(callback)
      return () => subscription.then((unsubscribe) => unsubscribe())
    }

    const poolMembersByAddress$ = asObservable(subscribePoolMembers)(addresses).pipe(
      scan((state, next) => {
        for (const poolMembers of next) {
          const { poolId, points, unbondingEras } = poolMembers
          if (typeof poolId === "string" && typeof points === "string")
            state.set(poolMembers.address, { poolId, points, unbondingEras })
          else state.set(poolMembers.address, null)
        }
        return state
      }, new Map<string, Required<Pick<PoolMembers, "poolId" | "points" | "unbondingEras">> | null>()),
      share()
    )

    const poolIdByAddress$ = poolMembersByAddress$.pipe(
      map((pm) => new Map(Array.from(pm).map(([address, pm]) => [address, pm?.poolId ?? null])))
    )
    const pointsByAddress$ = poolMembersByAddress$.pipe(
      map((pm) => new Map(Array.from(pm).map(([address, pm]) => [address, pm?.points ?? null])))
    )
    const unbondingErasByAddress$ = poolMembersByAddress$.pipe(
      map(
        (pm) => new Map(Array.from(pm).map(([address, pm]) => [address, pm?.unbondingEras ?? null]))
      )
    )
    const poolIds$ = poolIdByAddress$.pipe(
      map((byAddress) => [
        ...new Set(Array.from(byAddress.values()).flatMap((poolId) => poolId ?? [])),
      ])
    )

    const pointsByPool$ = poolIds$.pipe(
      map((poolIds) => asObservable(subscribePoolPoints)(poolIds)),
      switchAll(),
      scan((state, next) => {
        for (const poolPoints of next) {
          const { poolId, points } = poolPoints
          if (typeof points === "string") state.set(poolId, points)
          else state.delete(poolId)
        }
        return state
      }, new Map<string, string>())
    )
    const stakeByPool$ = poolIds$.pipe(
      map((poolIds) => asObservable(subscribePoolStake)(poolIds)),
      switchAll(),
      scan((state, next) => {
        for (const poolStake of next) {
          const { poolId, activeStake } = poolStake
          if (typeof activeStake === "string") state.set(poolId, activeStake)
          else state.delete(poolId)
        }
        return state
      }, new Map<string, string>())
    )
    const metadataByPool$ = poolIds$.pipe(
      map((poolIds) => asObservable(subscribePoolMetadata)(poolIds)),
      switchAll(),
      scan((state, next) => {
        for (const poolMetadata of next) {
          const { poolId, metadata } = poolMetadata
          if (typeof metadata === "string") state.set(poolId, metadata)
          else state.delete(poolId)
        }
        return state
      }, new Map<string, string>())
    )

    const subscription = combineLatest([
      poolIdByAddress$,
      pointsByAddress$,
      unbondingErasByAddress$,
      pointsByPool$,
      stakeByPool$,
      metadataByPool$,
    ]).subscribe({
      next: ([
        poolIdByAddress,
        pointsByAddress,
        unbondingErasByAddress,
        pointsByPool,
        stakeByPool,
        metadataByPool,
      ]) => {
        const balances = Array.from(poolIdByAddress)
          .map(([address, poolId]) => {
            const parsedPoolId = poolId === null ? undefined : parseInt(poolId)
            const points = pointsByAddress.get(address) ?? "0"
            const poolPoints = pointsByPool.get(poolId ?? "") ?? "0"
            const poolStake = stakeByPool.get(poolId ?? "") ?? "0"
            const poolMetadata = poolId ? metadataByPool.get(poolId) ?? `Pool ${poolId}` : undefined

            const amount =
              points === "0" || poolPoints === "0" || poolStake === "0"
                ? 0n
                : (BigInt(poolStake) * BigInt(points)) / BigInt(poolPoints)

            const unbondingAmount = (unbondingErasByAddress.get(address) ?? []).reduce(
              (total, { amount }) => total + BigInt(amount ?? "0"),
              0n
            )

            if (amount === 0n && unbondingAmount === 0n) return null

            return {
              source: "substrate-native",
              status: "live",
              address,
              multiChainId: { subChainId: chainId },
              chainId,
              tokenId,
              values: [
                {
                  source: "nompools-staking",
                  type: "reserved",
                  label: "nompools-staking",
                  amount: amount.toString(),
                  meta: { type: "nompool", poolId: parsedPoolId, description: poolMetadata },
                },
                {
                  source: "nompools-staking",
                  type: "reserved",
                  label: "nompools-unbonding",
                  amount: unbondingAmount.toString(),
                  meta: {
                    poolId: parsedPoolId,
                    description: poolMetadata,
                    unbonding: true,
                  },
                },
              ],
            } as SubNativeBalance
          })
          .filter(Boolean) as SubNativeBalance[]

        if (balances.length > 0) callback(null, balances)
      },
      error: (error) => callback(error),
    })

    resultUnsubscribes.push(() => subscription.unsubscribe())
  }
  return () => resultUnsubscribes.forEach((unsub) => unsub())
}

async function subscribeCrowdloans(
  chaindataProvider: ChaindataProvider,
  chainConnector: ChainConnector,
  getOrCreateTypeRegistry: GetOrCreateTypeRegistry,
  addressesByToken: AddressesByToken<SubNativeToken | CustomSubNativeToken>,
  callback: SubscriptionCallback<SubNativeBalance[]>
) {
  const chains = await chaindataProvider.chainsById()
  const tokens = await chaindataProvider.tokensById()

  const miniMetadatas = new Map(
    (await balancesDb.miniMetadatas.toArray()).map((miniMetadata) => [
      miniMetadata.id,
      miniMetadata,
    ])
  )
  const crowdloanTokenIds = Object.entries(tokens)
    .filter(([, token]) => {
      // ignore non-native tokens
      if (token.type !== "substrate-native") return
      // ignore tokens on chains with no crowdloans pallet
      const [chainMeta] = findChainMeta<typeof SubNativeModule>(
        miniMetadatas,
        "substrate-native",
        chains[token.chain.id]
      )
      return typeof chainMeta?.crowdloanPalletId === "string"
    })
    .map(([tokenId]) => tokenId)

  // crowdloan contributions can only be done by the native token on chains with the crowdloan pallet
  const addressesByCrowdloanToken = Object.fromEntries(
    Object.entries(addressesByToken)
      // remove ethereum addresses
      .map(([tokenId, addresses]): [string, string[]] => [
        tokenId,
        addresses.filter((address) => !isEthereumAddress(address)),
      ])
      // remove tokens which aren't crowdloan tokens
      .filter(([tokenId]) => crowdloanTokenIds.includes(tokenId))
  )

  const uniqueChainIds = getUniqueChainIds(addressesByCrowdloanToken, tokens)
  const chainStorageDecoders = buildStorageDecoders({
    chainIds: uniqueChainIds,
    chains,
    miniMetadatas,
    moduleType: "substrate-native",
    decoders: { parachainsDecoder: ["paras", "parachains"], fundsDecoder: ["crowdloan", "funds"] },
  })

  const tokenSubscriptions: Array<() => void> = []
  for (const [tokenId, addresses] of Object.entries(addressesByCrowdloanToken)) {
    const token = tokens[tokenId]
    if (!token) {
      log.warn(`Token ${tokenId} not found`)
      continue
    }
    if (token.type !== "substrate-native") {
      log.debug(`This module doesn't handle tokens of type ${token.type}`)
      continue
    }
    const chainId = token.chain?.id
    if (!chainId) {
      log.warn(`Token ${tokenId} has no chain`)
      continue
    }
    const chain = chains[chainId]
    if (!chain) {
      log.warn(`Chain ${chainId} for token ${tokenId} not found`)
      continue
    }
    const [chainMeta] = findChainMeta<typeof SubNativeModule>(
      miniMetadatas,
      "substrate-native",
      chain
    )
    const typeRegistry =
      chainMeta?.miniMetadata !== undefined &&
      chainMeta?.miniMetadata !== null &&
      chainMeta?.metadataVersion >= 14
        ? getOrCreateTypeRegistry(chainId, chainMeta.miniMetadata)
        : new TypeRegistry()

    const subscribeParaIds = (callback: SubscriptionCallback<Array<number[]>>) => {
      const storageDecoder = chainStorageDecoders.get(chainId)?.parachainsDecoder
      const queries = [0].flatMap((): RpcStateQuery<number[]> | [] => {
        const storageHelper = new StorageHelper(typeRegistry, "paras", "parachains")
        const stateKey = storageHelper.stateKey
        if (!stateKey) return []
        const decodeResult = (change: string | null): number[] => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const decoded: any =
            storageDecoder && change !== null ? storageDecoder.decode($.decodeHex(change)) : null

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const paraIds = decoded ?? []

          return paraIds
        }

        return { chainId, stateKey, decodeResult }
      })

      const subscription = new RpcStateQueryHelper(chainConnector, queries).subscribe(callback)
      return () => subscription.then((unsubscribe) => unsubscribe())
    }

    type ParaFundIndex = { paraId: number; fundPeriod: string; fundIndex?: number[] }
    const subscribeParaFundIndexes = (
      paraIds: number[],
      callback: SubscriptionCallback<ParaFundIndex[]>
    ) => {
      const storageDecoder = chainStorageDecoders.get(chainId)?.fundsDecoder
      const queries = paraIds.flatMap((paraId): RpcStateQuery<ParaFundIndex> | [] => {
        const storageHelper = new StorageHelper(typeRegistry, "crowdloan", "funds", paraId)
        const stateKey = storageHelper.stateKey
        if (!stateKey) return []
        const decodeResult = (change: string | null) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const decoded: any =
            storageDecoder && change !== null ? storageDecoder.decode($.decodeHex(change)) : null

          const firstPeriod = decoded?.firstPeriod?.toString?.() ?? ""
          const lastPeriod = decoded?.lastPeriod?.toString?.() ?? ""
          const fundPeriod = `${firstPeriod}-${lastPeriod}`
          const fundIndex = decoded?.fundIndex ?? decoded?.trieIndex

          return { paraId, fundPeriod, fundIndex }
        }

        return { chainId, stateKey, decodeResult }
      })

      const subscription = new RpcStateQueryHelper(chainConnector, queries).subscribe(callback)
      return () => subscription.then((unsubscribe) => unsubscribe())
    }

    type FundContribution = {
      paraId: number
      fundIndex: number
      address: string
      amount: string
    }
    const subscribeFundContributions = (
      funds: Array<{ paraId: number; fundIndex: number }>,
      addresses: string[],
      callback: SubscriptionCallback<FundContribution[]>
    ) => {
      // TODO: Watch system_events in order to subscribe to changes, then redo the contributions query when changes are detected:
      // https://github.com/polkadot-js/api/blob/8fe02a14345b57e6abb8f7f2c2b624cf70c51b23/packages/api-derive/src/crowdloan/ownContributions.ts#L32-L47
      //
      // For now we just re-fetch all contributions on a timer and then only send them to the subscription callback when they have changed

      const queries = funds.map(({ paraId, fundIndex }) => ({
        paraId,
        fundIndex,
        addresses,
        childKey: crowdloanFundContributionsChildKey(typeRegistry, fundIndex),
        storageKeys: addresses.map((address) => u8aToHex(decodeAnyAddress(address))),
      }))

      // track whether our caller is still subscribed
      let subscriptionActive = true
      let previousContributions: FundContribution[] | null = null

      const fetchContributions = async () => {
        try {
          const results = await Promise.all(
            queries.map(async ({ paraId, fundIndex, addresses, childKey, storageKeys }) => ({
              paraId,
              fundIndex,
              addresses,
              result: await chainConnector.send(chainId, "childstate_getStorageEntries", [
                childKey,
                storageKeys,
              ]),
            }))
          )

          const contributions = results.flatMap((queryResult) => {
            const { paraId, fundIndex, addresses, result } = queryResult
            const storageDataVec = typeRegistry.createType("Vec<Option<StorageData>>", result)

            return storageDataVec.flatMap((storageData, index) => {
              const balance = storageData?.isSome
                ? typeRegistry.createType("Balance", storageData.unwrap())
                : typeRegistry.createType("Balance")
              const amount = balance?.toString?.()

              if (amount === undefined || amount === "0") return []
              return {
                paraId,
                fundIndex,
                address: addresses[index],
                amount,
              }
            })
          })

          // ignore these results if our caller has tried to close this subscription
          if (!subscriptionActive) return

          // ignore these results if they're the same as what we previously fetched
          if (isEqual(previousContributions, contributions)) return

          previousContributions = contributions
          callback(null, contributions)
        } catch (error) {
          callback(error)
        }
      }

      // set up polling for contributions
      const crowdloanContributionsPollInterval = 60_000 // 60_000ms === 1 minute
      const pollContributions = async () => {
        if (!subscriptionActive) return

        try {
          await fetchContributions()
        } catch (error) {
          // log any errors, but don't cancel the poll for contributions when one fetch fails
          log.error(error)
        }

        if (!subscriptionActive) return
        setTimeout(pollContributions, crowdloanContributionsPollInterval)
      }

      // start polling
      pollContributions()

      return () => {
        // stop polling
        subscriptionActive = false
      }
    }

    const paraIds$ = asObservable(subscribeParaIds)().pipe(
      scan((_, next) => Array.from(new Set(next.flatMap((paraIds) => paraIds))), [] as number[]),
      share()
    )

    const fundIndexesByParaId$ = paraIds$.pipe(
      map((paraIds) => asObservable(subscribeParaFundIndexes)(paraIds)),
      switchAll(),
      scan((state, next) => {
        for (const fund of next) {
          const { paraId, fundIndex } = fund
          if (typeof fundIndex === "number") {
            state.set(paraId, (state.get(paraId) ?? new Set()).add(fundIndex))
          }
        }
        return state
      }, new Map<number, Set<number>>())
    )

    const contributionsByAddress$ = fundIndexesByParaId$.pipe(
      map((fundIndexesByParaId) =>
        Array.from(fundIndexesByParaId).flatMap(([paraId, fundIndexes]) =>
          Array.from(fundIndexes).map((fundIndex) => ({ paraId, fundIndex }))
        )
      ),
      map((funds) => asObservable(subscribeFundContributions)(funds, addresses)),
      switchAll(),
      scan((state, next) => {
        for (const contribution of next) {
          const { address } = contribution
          state.set(address, (state.get(address) ?? new Set()).add(contribution))
        }
        return state
      }, new Map<string, Set<FundContribution>>())
    )

    const subscription = contributionsByAddress$.subscribe({
      next: (contributionsByAddress) => {
        const balances: SubNativeBalance[] = Array.from(contributionsByAddress)
          .filter(([, contributions]) => {
            Array.from(contributions).filter(({ amount }) => BigInt(amount) > 0n)
          })
          .map(([address, contributions]) => {
            return {
              source: "substrate-native",
              status: "live",
              address,
              multiChainId: { subChainId: chainId },
              chainId,
              tokenId,
              values: Array.from(contributions).map(({ amount, paraId }) => ({
                type: "reserved",
                label: "crowdloan",
                source: "crowdloan",
                amount: amount,
                meta: { paraId },
              })),
            }
          })
        if (balances.length > 0) callback(null, balances)
      },
      error: (error) => callback(error),
    })

    tokenSubscriptions.push(() => subscription.unsubscribe())
  }

  return () => tokenSubscriptions.forEach((unsub) => unsub())
}

class SubNativeBalanceError extends Error {
  #tokenId: string

  constructor(tokenId: string, message: string) {
    super(message)
    this.name = "SubNativeBalanceError"
    this.#tokenId = tokenId
  }

  get tokenId() {
    return this.#tokenId
  }
}

async function subscribeBase(
  chaindataProvider: ChaindataProvider,
  chainConnector: ChainConnector,
  getOrCreateTypeRegistry: GetOrCreateTypeRegistry,
  addressesByToken: AddressesByToken<SubNativeToken>,
  callback: SubscriptionCallback<SubNativeBalance[]>
) {
  const queries = await buildQueries(chaindataProvider, getOrCreateTypeRegistry, addressesByToken)
  const unsubscribe = await new RpcStateQueryHelper(chainConnector, queries).subscribe(
    (error, result) => {
      if (error) callback(error)
      if (result && result.length > 0) callback(null, result)
    }
  )

  return unsubscribe
}
