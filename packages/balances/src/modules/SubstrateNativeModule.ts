import { TypeRegistry } from "@polkadot/types"
import { ExtDef } from "@polkadot/types/extrinsic/signedExtensions/types"
import { assert, u8aToHex } from "@polkadot/util"
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
  Binary,
  V14,
  V15,
  compactMetadata,
  decodeScale,
  encodeStateKey,
  getDynamicBuilder,
  getMetadataVersion,
  magicNumber,
  metadata as scaleMetadata,
  toHex,
} from "@talismn/scale"
import { Deferred, blake2Concat, decodeAnyAddress, isEthereumAddress } from "@talismn/util"
import isEqual from "lodash/isEqual"
import { combineLatest, map, scan, share, switchAll } from "rxjs"
import { Struct, u128, u32 } from "scale-ts"

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
  RpcStateQuery,
  RpcStateQueryHelper,
  buildStorageCoders,
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

const DEFAULT_SYMBOL = "Unit"
const DEFAULT_DECIMALS = 0

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
  useLegacyTransferableCalculation?: boolean
  symbol?: string
  decimals?: number
  existentialDeposit?: string
  nominationPoolsPalletId?: string
  crowdloanPalletId?: string
  miniMetadata?: string
  metadataVersion?: number
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
  userExtensions?: ExtDef
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

  return {
    ...DefaultBalanceModule("substrate-native"),

    async fetchSubstrateChainMeta(chainId, moduleConfig, metadataRpc, systemProperties) {
      const isTestnet = (await chaindataProvider.chainById(chainId))?.isTestnet || false
      if (moduleConfig?.disable === true || metadataRpc === undefined) return { isTestnet }

      //
      // extract system_properties
      //

      const { tokenSymbol, tokenDecimals } = systemProperties ?? {}
      const symbol: string =
        (Array.isArray(tokenSymbol) ? tokenSymbol[0] : tokenSymbol) ?? DEFAULT_SYMBOL
      const decimals: number =
        (Array.isArray(tokenDecimals) ? tokenDecimals[0] : tokenDecimals) ?? DEFAULT_DECIMALS

      //
      // process metadata into SCALE encoders/decoders
      //

      const metadataVersion = getMetadataVersion(metadataRpc)
      const [metadata, tag] = ((): [V15, "v15"] | [V14, "v14"] | [] => {
        if (metadataVersion !== 15 && metadataVersion !== 14) return []

        const decoded = scaleMetadata.dec(metadataRpc)
        if (decoded.metadata.tag === "v15") return [decoded.metadata.value, decoded.metadata.tag]
        if (decoded.metadata.tag === "v14") return [decoded.metadata.value, decoded.metadata.tag]
        return []
      })()
      if (!metadata || !tag) return { isTestnet, symbol, decimals }
      const scaleBuilder = getDynamicBuilder(metadata)

      //
      // get runtime constants
      //

      const getConstantValue = (palletName: string, constantName: string) => {
        const encodedValue = metadata.pallets
          .find(({ name }) => name === palletName)
          ?.constants.find(({ name }) => name === constantName)?.value
        if (!encodedValue) return

        return scaleBuilder.buildConstant(palletName, constantName)?.dec(encodedValue)
      }

      const existentialDeposit = getConstantValue("Balances", "ExistentialDeposit")?.toString()
      const nominationPoolsPalletId = getConstantValue("NominationPools", "PalletId")?.asText()
      const crowdloanPalletId = getConstantValue("Crowdloan", "PalletId")?.asText()

      //
      // compact metadata into miniMetadata
      //

      compactMetadata(metadata, [
        { pallet: "System", items: ["Account"] },
        { pallet: "Balances", items: ["Reserves", "Holds", "Locks", "Freezes"] },
        { pallet: "NominationPools", items: ["PoolMembers", "BondedPools", "Metadata"] },
        { pallet: "Staking", items: ["Ledger"] },
        { pallet: "Crowdloan", items: ["Funds"] },
        { pallet: "Paras", items: ["Parachains"] },
      ])

      const miniMetadata = toHex(
        scaleMetadata.enc({
          magicNumber,
          metadata: tag === "v15" ? { tag, value: metadata } : { tag, value: metadata },
        })
      )

      const hasFreezesItem = Boolean(
        metadata.pallets
          .find(({ name }) => name === "Balances")
          ?.storage?.items.find(({ name }) => name === "Freezes")
      )
      const useLegacyTransferableCalculation = !hasFreezesItem

      const chainMeta: SubNativeChainMeta = {
        isTestnet,
        useLegacyTransferableCalculation,
        symbol,
        decimals,
        existentialDeposit,
        nominationPoolsPalletId,
        crowdloanPalletId,
        miniMetadata,
        metadataVersion,
      }
      if (!useLegacyTransferableCalculation) delete chainMeta.useLegacyTransferableCalculation

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
        symbol: symbol ?? DEFAULT_SYMBOL,
        decimals: decimals ?? DEFAULT_DECIMALS,
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
        addressesByToken,
        callback,
        callerUnsubscribed
      )
      subscribeCrowdloans(
        chaindataProvider,
        chainConnectors.substrate,
        addressesByToken,
        callback,
        callerUnsubscribed
      )
      subscribeBase(
        chaindataProvider,
        chainConnectors.substrate,
        addressesByToken,
        callback,
        callerUnsubscribed
      )

      return callerUnsubscribe
    },

    async fetchBalances(addressesByToken) {
      assert(chainConnectors.substrate, "This module requires a substrate chain connector")

      const queries = await buildQueries(chaindataProvider, addressesByToken)
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
    const { useLegacyTransferableCalculation } = chainMeta ?? {}

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
      if (useLegacyTransferableCalculation) balanceJson.useLegacyTransferableCalculation = true

      let locksQueryLocks: Array<LockedAmount<string>> = []
      let freezesQueryLocks: Array<LockedAmount<string>> = []

      const baseQuery: RpcStateQuery<Balance> | undefined = (() => {
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
              return new Balance(balanceJson)
            }

            try {
              // eslint-disable-next-line no-var
              oldChainBalance = change === null ? null : scaleAccountInfo.dec(change)
            } catch (error) {
              log.warn(
                `Failed to create pre-metadataV14 balance type for token ${tokenId} on chain ${chainId}: ${error?.toString()}`
              )
              return new Balance(balanceJson)
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

          balanceJson.free = (decoded?.data?.free ?? 0n).toString()

          const otherReserve = balanceJson.reserves.find(({ label }) => label === "reserved")
          if (otherReserve) otherReserve.amount = (decoded?.data?.reserved ?? 0n).toString()

          const miscLock = balanceJson.locks.find(({ label }) => label === "misc")
          if (miscLock)
            miscLock.amount = (
              (decoded?.data?.miscFrozen ?? 0n) +
              // new chains don't split their `frozen` amount into `feeFrozen` and `miscFrozen`.
              // for these chains, we'll use the `frozen` amount as `miscFrozen`.
              ((decoded?.data as DecodedType["data"])?.frozen ?? 0n)
            ).toString()

          const feesLock = balanceJson.locks.find(({ label }) => label === "fees")
          if (feesLock) feesLock.amount = (decoded?.data?.feeFrozen ?? 0n).toString()

          return new Balance(balanceJson)
        }

        return { chainId, stateKey, decodeResult }
      })()

      const locksQuery: RpcStateQuery<Balance> | undefined = (() => {
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

          locksQueryLocks =
            decoded?.map?.((lock) => ({
              label: getLockedType(lock?.id?.asText?.()),
              amount: (lock?.amount ?? 0n).toString(),
            })) ?? []

          balanceJson.locks = [
            ...balanceJson.locks.slice(0, 2),
            ...locksQueryLocks,
            ...freezesQueryLocks,
          ] as SubNativeBalance["locks"]

          return new Balance(balanceJson)
        }

        return { chainId, stateKey, decodeResult }
      })()

      const freezesQuery: RpcStateQuery<Balance> | undefined = (() => {
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

          freezesQueryLocks =
            decoded?.map?.((lock) => ({
              label: getLockedType(lock?.id?.type?.toLowerCase?.()),
              amount: lock?.amount?.toString?.() ?? "0",
            })) ?? []

          balanceJson.locks = [
            ...balanceJson.locks.slice(0, 2),
            ...locksQueryLocks,
            ...freezesQueryLocks,
          ] as SubNativeBalance["locks"]

          return new Balance(balanceJson)
        }

        return { chainId, stateKey, decodeResult }
      })()

      const queries: Array<RpcStateQuery<Balance>> = [baseQuery, locksQuery, freezesQuery].filter(
        (query): query is RpcStateQuery<Balance> => Boolean(query)
      )

      return queries
    })
  })
}

async function subscribeNompoolStaking(
  chaindataProvider: ChaindataProvider,
  chainConnector: ChainConnector,
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
  const chainStorageCoders = buildStorageCoders({
    chainIds: uniqueChainIds,
    chains,
    miniMetadatas,
    moduleType: "substrate-native",
    coders: {
      poolMembers: ["NominationPools", "PoolMembers"],
      bondedPools: ["NominationPools", "BondedPools"],
      ledger: ["Staking", "Ledger"],
      metadata: ["NominationPools", "Metadata"],
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
    const { nominationPoolsPalletId } = chainMeta ?? {}

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
      const scaleCoder = chainStorageCoders.get(chainId)?.poolMembers
      const queries = addresses.flatMap((address): RpcStateQuery<PoolMembers> | [] => {
        const stateKey = encodeStateKey(
          scaleCoder,
          `Invalid address in ${chainId} poolMembers query ${address}`,
          address
        )
        if (!stateKey) return []

        const decodeResult = (change: string | null) => {
          /** NOTE: This type is only a hint for typescript, the chain can actually return whatever it wants to */
          type DecodedType = {
            pool_id?: number
            points?: bigint
            last_recorded_reward_counter?: bigint
            /** Array of `[Era, Amount]` */
            unbonding_eras?: Array<[number | undefined, bigint | undefined] | undefined>
          }

          const decoded = decodeScale<DecodedType>(
            scaleCoder,
            change,
            `Failed to decode poolMembers on chain ${chainId}`
          )

          const poolId: string | undefined = decoded?.pool_id?.toString?.()
          const points: string | undefined = decoded?.points?.toString?.()
          const unbondingEras: Array<{ era: string; amount: string }> = Array.from(
            decoded?.unbonding_eras ?? []
          ).flatMap((entry) => {
            if (entry === undefined) return []
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

      const scaleCoder = chainStorageCoders.get(chainId)?.bondedPools
      const queries = poolIds.flatMap((poolId): RpcStateQuery<PoolPoints> | [] => {
        const stateKey = encodeStateKey(
          scaleCoder,
          `Invalid poolId in ${chainId} bondedPools query ${poolId}`,
          poolId
        )
        if (!stateKey) return []

        const decodeResult = (change: string | null) => {
          /** NOTE: This type is only a hint for typescript, the chain can actually return whatever it wants to */
          type DecodedType = {
            commission?: unknown
            member_counter?: number
            points?: bigint
            roles?: unknown
            state?: unknown
          }

          const decoded = decodeScale<DecodedType>(
            scaleCoder,
            change,
            `Failed to decode bondedPools on chain ${chainId}`
          )

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

      const scaleCoder = chainStorageCoders.get(chainId)?.ledger
      const queries = poolIds.flatMap((poolId): RpcStateQuery<PoolStake> | [] => {
        if (!nominationPoolsPalletId) return []
        const stashAddress = nompoolStashAccountId(nominationPoolsPalletId, poolId)
        const stateKey = encodeStateKey(
          scaleCoder,
          `Invalid address in ${chainId} ledger query ${stashAddress}`,
          stashAddress
        )
        if (!stateKey) return []

        const decodeResult = (change: string | null) => {
          /** NOTE: This type is only a hint for typescript, the chain can actually return whatever it wants to */
          type DecodedType = {
            active?: bigint
            legacy_claimed_rewards?: number[]
            stash?: string
            total?: bigint
            unlocking?: Array<{ value?: bigint; era?: number }>
          }

          const decoded = decodeScale<DecodedType>(
            scaleCoder,
            change,
            `Failed to decode ledger on chain ${chainId}`
          )

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

      const scaleCoder = chainStorageCoders.get(chainId)?.metadata
      const queries = poolIds.flatMap((poolId): RpcStateQuery<PoolMetadata> | [] => {
        if (!nominationPoolsPalletId) return []
        const stateKey = encodeStateKey(
          scaleCoder,
          `Invalid poolId in ${chainId} metadata query ${poolId}`,
          poolId
        )
        if (!stateKey) return []

        const decodeResult = (change: string | null) => {
          /** NOTE: This type is only a hint for typescript, the chain can actually return whatever it wants to */
          type DecodedType = Binary

          const decoded = decodeScale<DecodedType>(
            scaleCoder,
            change,
            `Failed to decode metadata on chain ${chainId}`
          )

          const metadata = decoded?.asText?.()

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
            const parsedPoolId = poolId === null ? undefined : parseInt(poolId)
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
                  meta: { type: "nompool", poolId: parsedPoolId, description: poolMetadata },
                },
                {
                  label: "nompools-unbonding",
                  amount: unbondingAmount,
                  meta: {
                    type: "nompool",
                    poolId: parsedPoolId,
                    description: poolMetadata,
                    unbonding: true,
                  },
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
  const chainStorageCoders = buildStorageCoders({
    chainIds: uniqueChainIds,
    chains,
    miniMetadatas,
    moduleType: "substrate-native",
    coders: {
      parachains: ["Paras", "Parachains"],
      funds: ["Crowdloan", "Funds"],
    },
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

    const subscribeParaIds = (callback: SubscriptionCallback<Array<number[]>>) => {
      const scaleCoder = chainStorageCoders.get(chainId)?.parachains
      const queries = [0].flatMap((): RpcStateQuery<number[]> | [] => {
        const stateKey = encodeStateKey(scaleCoder)
        if (!stateKey) return []

        const decodeResult = (change: string | null) => {
          /** NOTE: This type is only a hint for typescript, the chain can actually return whatever it wants to */
          type DecodedType = number[]
          const decoded = decodeScale<DecodedType>(
            scaleCoder,
            change,
            `Failed to decode parachains on chain ${chainId}`
          )

          const paraIds = decoded ?? []

          return paraIds
        }

        return { chainId, stateKey, decodeResult }
      })

      const subscription = new RpcStateQueryHelper(chainConnector, queries).subscribe(callback)
      return () => subscription.then((unsubscribe) => unsubscribe())
    }

    type ParaFundIndex = {
      paraId: number
      fundPeriod: string
      fundIndex?: number
    }
    const subscribeParaFundIndexes = (
      paraIds: number[],
      callback: SubscriptionCallback<ParaFundIndex[]>
    ) => {
      const scaleCoder = chainStorageCoders.get(chainId)?.funds
      const queries = paraIds.flatMap((paraId): RpcStateQuery<ParaFundIndex> | [] => {
        const stateKey = encodeStateKey(
          scaleCoder,
          `Invalid paraId in ${chainId} funds query ${paraId}`,
          paraId
        )
        if (!stateKey) return []

        const decodeResult = (change: string | null) => {
          /** NOTE: This type is only a hint for typescript, the chain can actually return whatever it wants to */
          type DecodedType = {
            cap?: bigint
            deposit?: bigint
            depositor?: string
            end?: number
            fund_index?: number
            trie_index?: number
            first_period?: number
            last_period?: number
            last_contribution?: unknown
            raised?: bigint
            verifier?: unknown
          }

          const decoded = decodeScale<DecodedType>(
            scaleCoder,
            change,
            `Failed to decode paras on chain ${chainId}`
          )

          const firstPeriod = decoded?.first_period?.toString?.() ?? ""
          const lastPeriod = decoded?.last_period?.toString?.() ?? ""
          const fundPeriod = `${firstPeriod}-${lastPeriod}`
          const fundIndex = decoded?.fund_index ?? decoded?.trie_index

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
        childKey: crowdloanFundContributionsChildKey(fundIndex),
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
              result: await chainConnector.send<Array<string | null> | undefined>(
                chainId,
                "childstate_getStorageEntries",
                [childKey, storageKeys]
              ),
            }))
          )

          const contributions = results.flatMap((queryResult) => {
            const { paraId, fundIndex, addresses, result } = queryResult

            return (Array.isArray(result) ? result : []).flatMap((encoded, index) => {
              const amount = (() => {
                try {
                  return typeof encoded === "string" ? u128.dec(encoded) ?? 0n : 0n
                } catch {
                  return 0n
                }
              })().toString()

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
  addressesByToken: AddressesByToken<SubNativeToken | CustomSubNativeToken>,
  callback: SubscriptionCallback<Balances>,
  callerUnsubscribed: Promise<unknown>
) {
  const queries = await buildQueries(chaindataProvider, addressesByToken)
  const unsubscribe = await new RpcStateQueryHelper(chainConnector, queries).subscribe(
    (error, result) => (error ? callback(error) : callback(null, new Balances(result ?? [])))
  )

  callerUnsubscribed.catch(unsubscribe).catch((error) => log.warn(error))
}
