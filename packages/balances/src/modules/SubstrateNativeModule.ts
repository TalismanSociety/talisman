import { TypeRegistry, createType, i128 } from "@polkadot/types"
import { assert, u8aToHex, u8aToString } from "@polkadot/util"
import { defineMethod } from "@substrate/txwrapper-core"
import { ChainConnector } from "@talismn/chain-connector"
import {
  BalancesConfigTokenParams,
  ChainId,
  ChaindataProvider,
  NewTokenType,
  SubChainId,
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
import { Deferred, blake2Concat, decodeAnyAddress, isEthereumAddress } from "@talismn/util"
import isEqual from "lodash/isEqual"
import { combineLatest, map, scan, share, switchAll } from "rxjs"

import { DefaultBalanceModule, NewBalanceModule, NewTransferParamsType } from "../BalanceModule"
import log from "../log"
import { db as balancesDb } from "../TalismanBalancesDatabase"
import {
  AddressesByToken,
  Amount,
  AmountWithLabel,
  Balance,
  Balances,
  LockedAmount,
  NewBalanceType,
  SubscriptionCallback,
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

const getChainIdFromTokenId = (tokenId: string) => {
  const match = /^([\d\w-]+)-substrate-native/.exec(tokenId)
  if (!match?.[1]) throw new Error(`Can't detect chainId for token ${tokenId}`)
  return match?.[1]
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

export type SubNativeBalance = NewBalanceType<
  ModuleType,
  {
    multiChainId: SubChainId

    free: Amount
    reserves: [AmountWithLabel<"reserved">, ...Array<AmountWithLabel<string>>]
    locks: [LockedAmount<"fees">, LockedAmount<"misc">, ...Array<LockedAmount<string>>]
  }
>

declare module "@talismn/balances/plugins" {
  export interface PluginBalanceTypes {
    SubNativeBalance: SubNativeBalance
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
}>

export const SubNativeModule: NewBalanceModule<
  ModuleType,
  SubNativeToken | CustomSubNativeToken,
  SubNativeChainMeta,
  SubNativeModuleConfig,
  SubNativeTransferParams
> = (hydrate) => {
  const { chainConnectors, chaindataProvider } = hydrate
  const chainConnector = chainConnectors.substrate
  assert(chainConnector, "This module requires a substrate chain connector")

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
        ? Buffer.from(subshape.pallets.NominationPools?.constants.PalletId?.value).toString("hex")
        : null
      const crowdloanPalletId = subshape.pallets.Crowdloan?.constants.PalletId?.value
        ? Buffer.from(subshape.pallets.Crowdloan?.constants.PalletId?.value).toString("hex")
        : null

      const isSystemPallet = (pallet: PalletMV14) => pallet.name === "System"
      const isAccountItem = (item: StorageEntryMV14) => item.name === "Account"

      const isBalancesPallet = (pallet: PalletMV14) => pallet.name === "Balances"
      const isLocksItem = (item: StorageEntryMV14) => item.name === "Locks"

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
        { pallet: isBalancesPallet, items: [isLocksItem] },
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

      return {
        isTestnet,
        symbol,
        decimals,
        existentialDeposit,
        nominationPoolsPalletId,
        crowdloanPalletId,
        miniMetadata,
        metadataVersion,
      }
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

    getPlaceholderBalance(tokenId, address): SubNativeBalance {
      const chainId = getChainIdFromTokenId(tokenId)

      return {
        source: "substrate-native",
        status: "initializing",
        address,
        multiChainId: { subChainId: chainId },
        chainId,
        tokenId,
        free: "0",
        reserves: [{ label: "reserved", amount: "0" }],
        locks: [
          { label: "fees", amount: "0", includeInTransferable: true, excludeFromFeePayable: true },
          { label: "misc", amount: "0" },
        ],
      }
    },

    async subscribeBalances(addressesByToken, callback) {
      assert(chainConnectors.substrate, "This module requires a substrate chain connector")

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
      const callerUnsubscribe = () => unsubDeferred.reject(new Error(`Caller unsubscribed`))
      // we queue up our work to clean up our subscription when this promise rejects
      const callerUnsubscribed = unsubDeferred.promise

      subscribeNompoolStaking(
        chaindataProvider,
        chainConnectors.substrate,
        getOrCreateTypeRegistry,
        addressesByToken,
        callback,
        callerUnsubscribed
      )
      subscribeCrowdloans(
        chaindataProvider,
        chainConnectors.substrate,
        getOrCreateTypeRegistry,
        addressesByToken,
        callback,
        callerUnsubscribed
      )
      subscribeBase(
        chaindataProvider,
        chainConnectors.substrate,
        getOrCreateTypeRegistry,
        addressesByToken,
        callback,
        callerUnsubscribed
      )

      return callerUnsubscribe
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
        { metadataRpc, registry }
      )

      return { type: "substrate", tx: unsigned }
    },
  }
}

async function buildQueries(
  chaindataProvider: ChaindataProvider,
  getOrCreateTypeRegistry: GetOrCreateTypeRegistry,
  addressesByToken: AddressesByToken<SubNativeToken | CustomSubNativeToken>
): Promise<Array<RpcStateQuery<Balance>>> {
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
    decoders: { baseDecoder: ["system", "account"], locksDecoder: ["balances", "locks"] },
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
        free: "0",
        reserves: [{ label: "reserved", amount: "0" }],
        locks: [
          { label: "fees", amount: "0", includeInTransferable: true, excludeFromFeePayable: true },
          { label: "misc", amount: "0" },
        ],
      }

      const baseQuery: RpcStateQuery<Balance> | undefined = (() => {
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
              return new Balance(balanceJson)
            }

            try {
              // eslint-disable-next-line no-var
              oldChainBalance = createType(typeRegistry, accountInfoTypeDef, change)
            } catch (error) {
              log.warn(
                `Failed to create pre-metadataV14 balance type for token ${tokenId} on chain ${chainId}: ${error?.toString()}`
              )
              return new Balance(balanceJson)
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

          let free = (bigIntOrCodecToBigInt(decoded?.data?.free) ?? 0n).toString()
          let reserved = (bigIntOrCodecToBigInt(decoded?.data?.reserved) ?? 0n).toString()
          let miscFrozen = (bigIntOrCodecToBigInt(decoded?.data?.miscFrozen) ?? 0n).toString()
          let feeFrozen = (bigIntOrCodecToBigInt(decoded?.data?.feeFrozen) ?? 0n).toString()

          // we use the evm-native module to fetch native token balances for ethereum addresses on ethereum networks
          // but on moonbeam, moonriver and other chains which use ethereum addresses instead of substrate addresses,
          // we use both this module and the evm-native module
          if (isEthereumAddress(address) && chain.account !== "secp256k1")
            free = reserved = miscFrozen = feeFrozen = "0"

          balanceJson.free = free
          const otherReserve = balanceJson.reserves.find(({ label }) => label === "reserved")
          if (otherReserve) otherReserve.amount = reserved
          const feesLock = balanceJson.locks.find(({ label }) => label === "fees")
          if (feesLock) feesLock.amount = feeFrozen
          const miscLock = balanceJson.locks.find(({ label }) => label === "misc")
          if (miscLock) miscLock.amount = miscFrozen

          return new Balance(balanceJson)
        }

        return { chainId, stateKey, decodeResult }
      })()

      const locksQuery: RpcStateQuery<Balance> | undefined = (() => {
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
          if (change === null) return new Balance(balanceJson)

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const decoded: any =
            storageDecoder && change !== null ? storageDecoder.decode($.decodeHex(change)) : null
          balanceJson.locks = [
            ...balanceJson.locks.slice(0, 2),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...(decoded?.map?.((lock: any) => ({
              label: getLockedType(lock?.id?.toUtf8?.()),
              amount: lock?.amount?.toString?.() ?? "0",
            })) ?? []),
          ] as SubNativeBalance["locks"]

          return new Balance(balanceJson)
        }

        return { chainId, stateKey, decodeResult }
      })()

      const queries: Array<RpcStateQuery<Balance>> = [baseQuery, locksQuery].filter(
        (query): query is RpcStateQuery<Balance> => Boolean(query)
      )

      return queries
    })
  })
}

export async function subscribeNompoolStaking(
  chaindataProvider: ChaindataProvider,
  chainConnector: ChainConnector,
  getOrCreateTypeRegistry: GetOrCreateTypeRegistry,
  addressesByToken: AddressesByToken<SubNativeToken | CustomSubNativeToken>,
  callback: SubscriptionCallback<Balances>,
  callerUnsubscribed: Promise<unknown>
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
        const balances: SubNativeBalance[] = Array.from(poolIdByAddress).map(
          ([address, poolId]) => {
            const points = pointsByAddress.get(address) ?? "0"
            const poolPoints = pointsByPool.get(poolId ?? "") ?? "0"
            const poolStake = stakeByPool.get(poolId ?? "") ?? "0"
            const poolMetadata = poolId ? metadataByPool.get(poolId) ?? `Pool ${poolId}` : undefined

            const amount =
              points === "0" || poolPoints === "0" || poolStake === "0"
                ? "0"
                : ((BigInt(poolStake) * BigInt(points)) / BigInt(poolPoints)).toString()

            const unbondingAmount = (unbondingErasByAddress.get(address) ?? [])
              .reduce((total, { amount }) => total + BigInt(amount ?? "0"), 0n)
              .toString()

            return {
              source: "substrate-native",
              subSource: "nompools-staking",
              status: "live",
              address,
              multiChainId: { subChainId: chainId },
              chainId,
              tokenId,
              free: "0",
              reserves: [
                { label: "reserved", amount: "0" },
                {
                  label: "nompools-staking",
                  amount,
                  meta: { type: "nompool", description: poolMetadata },
                },
                {
                  label: "nompools-unbonding",
                  amount: unbondingAmount,
                  meta: { type: "nompool", description: poolMetadata, unbonding: true },
                },
              ],
              locks: [
                {
                  label: "fees",
                  amount: "0",
                  includeInTransferable: true,
                  excludeFromFeePayable: true,
                },
                { label: "misc", amount: "0" },
              ],
            }
          }
        )

        callback(null, new Balances(balances ?? []))
      },
      error: (error) => callback(error),
    })

    callerUnsubscribed.catch(() => subscription.unsubscribe()).catch((error) => log.warn(error))
  }
}

async function subscribeCrowdloans(
  chaindataProvider: ChaindataProvider,
  chainConnector: ChainConnector,
  getOrCreateTypeRegistry: GetOrCreateTypeRegistry,
  addressesByToken: AddressesByToken<SubNativeToken | CustomSubNativeToken>,
  callback: SubscriptionCallback<Balances>,
  callerUnsubscribed: Promise<unknown>
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
        const balances: SubNativeBalance[] = Array.from(contributionsByAddress).map(
          ([address, contributions]) => {
            return {
              source: "substrate-native",
              subSource: "crowdloan",
              status: "live",
              address,
              multiChainId: { subChainId: chainId },
              chainId,
              tokenId,
              free: "0",
              reserves: [
                { label: "reserved", amount: "0" },
                ...Array.from(contributions).map(({ amount, paraId }) => ({
                  label: "crowdloan",
                  amount: amount,
                  meta: { type: "crowdloan", paraId },
                })),
              ],
              locks: [
                {
                  label: "fees",
                  amount: "0",
                  includeInTransferable: true,
                  excludeFromFeePayable: true,
                },
                { label: "misc", amount: "0" },
              ],
            }
          }
        )
        callback(null, new Balances(balances ?? []))
      },
      error: (error) => callback(error),
    })

    callerUnsubscribed.catch(() => subscription.unsubscribe()).catch((error) => log.warn(error))
  }
}

async function subscribeBase(
  chaindataProvider: ChaindataProvider,
  chainConnector: ChainConnector,
  getOrCreateTypeRegistry: GetOrCreateTypeRegistry,
  addressesByToken: AddressesByToken<SubNativeToken | CustomSubNativeToken>,
  callback: SubscriptionCallback<Balances>,
  callerUnsubscribed: Promise<unknown>
) {
  const queries = await buildQueries(chaindataProvider, getOrCreateTypeRegistry, addressesByToken)
  const unsubscribe = await new RpcStateQueryHelper(chainConnector, queries).subscribe(
    (error, result) => (error ? callback(error) : callback(null, new Balances(result ?? [])))
  )

  callerUnsubscribed.catch(unsubscribe).catch((error) => log.warn(error))
}
