import { Metadata, TypeRegistry, createType, decorateConstants } from "@polkadot/types"
import type { Registry } from "@polkadot/types-codec/types"
import { assert, u8aToHex } from "@polkadot/util"
import { defineMethod } from "@substrate/txwrapper-core"
import {
  Amount,
  Balance,
  Balances,
  DefaultBalanceModule,
  LockedAmount,
  NewBalanceModule,
  NewBalanceType,
  NewTransferParamsType,
  useTypeRegistryCache,
} from "@talismn/balances"
import {
  ChainId,
  NewTokenType,
  SubChainId,
  TokenId,
  githubTokenLogoUrl,
} from "@talismn/chaindata-provider"
import { mutateMetadata } from "@talismn/mutate-metadata"
import { blake2Concat, decodeAnyAddress, hasOwnProperty } from "@talismn/util"

import log from "./log"

type ModuleType = "substrate-native"

// System.Account is the state_storage key prefix for nativeToken balances
const moduleHash = "26aa394eea5630e07c48ae0c9558cef7" // util_crypto.xxhashAsHex("System", 128);
const storageHash = "b99d880ec681799c0cf30e8886371da9" // util_crypto.xxhashAsHex("Account", 128);
const moduleStorageHash = `${moduleHash}${storageHash}`

// TODO: Move the fallback configs for each chain into the ChainMeta section of chaindata

// AccountInfo is the state_storage data format for nativeToken balances
// Theory: new chains will be at least on metadata v14, and so we won't need to hardcode their AccountInfo type.
// But for chains we want to support which aren't on metadata v14, hardcode them here:
// If the chain upgrades to metadata v14, this override will be ignored :)
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

  // crust-parachain is not yet on metadata v14
  "crust-parachain": NoSufficientsAccountInfoFallback,

  // crust is not yet on metadata v14
  "crust": NoSufficientsAccountInfoFallback,

  // kulupu is not yet on metadata v14
  "kulupu": RegularAccountInfoFallback,

  // nftmart is not yet on metadata v14
  "nftmart": RegularAccountInfoFallback,
}

const subNativeTokenId = (chainId: ChainId, tokenSymbol: string) =>
  `${chainId}-substrate-native-${tokenSymbol}`.toLowerCase().replace(/ /g, "-")

export type SubNativeToken = NewTokenType<
  ModuleType,
  {
    existentialDeposit: string
    chain: { id: ChainId }

    /** @deprecated - use the ChainMeta.accountInfoType field available on the chain */
    accountInfoType: number | null // TODO: Delete this
    /** @deprecated - use the ChainMeta.accountInfoType field available on the chain */
    metadata: `0x${string}` | null // TODO: Delete this
    /** @deprecated - use the ChainMeta.accountInfoType field available on the chain */
    metadataVersion: number // TODO: Delete this
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
  accountInfoType: number | null
  metadata: `0x${string}` | null
  metadataVersion: number
}

export type SubNativeModuleConfig = {
  disable?: boolean
}

export type SubNativeBalance = NewBalanceType<
  ModuleType,
  {
    multiChainId: SubChainId

    free: Amount
    reserves: Amount
    locks: [LockedAmount<"fees">, LockedAmount<"misc">]
  }
>

declare module "@talismn/balances/plugins" {
  export interface PluginBalanceTypes {
    SubNativeBalance: SubNativeBalance
  }
}

export type SubNativeTransferParams = NewTransferParamsType<{
  registry: TypeRegistry
  metadataRpc: `0x${string}`
  blockHash: string
  blockNumber: number
  nonce: number
  specVersion: number
  transactionVersion: number
  tip?: string
  transferMethod: "transfer" | "transferKeepAlive" | "transferAll"
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

  const { getOrCreateTypeRegistry } = useTypeRegistryCache()

  return {
    ...DefaultBalanceModule("substrate-native"),

    async fetchSubstrateChainMeta(chainId, moduleConfig) {
      const isTestnet = (await chaindataProvider.getChain(chainId))?.isTestnet || false

      if (moduleConfig?.disable === true)
        return {
          isTestnet,
          symbol: "",
          decimals: 0,
          existentialDeposit: null,
          accountInfoType: null,
          metadata: null,
          metadataVersion: 0,
        }

      const [metadataRpc, chainProperties] = await Promise.all([
        chainConnector.send(chainId, "state_getMetadata", []),
        chainConnector.send(chainId, "system_properties", []),
      ])

      const { tokenSymbol, tokenDecimals } = chainProperties

      const symbol: string =
        (Array.isArray(tokenSymbol) ? tokenSymbol[0] : tokenSymbol) || "Unknown"
      const decimals: number =
        (Array.isArray(tokenDecimals) ? tokenDecimals[0] : tokenDecimals) || 0

      const pjsMetadata: Metadata = new Metadata(new TypeRegistry(), metadataRpc)
      pjsMetadata.registry.setMetadata(pjsMetadata)

      const constants = decorateConstants(
        pjsMetadata.registry,
        pjsMetadata.asLatest,
        pjsMetadata.version
      )
      const existentialDeposit = constants?.balances?.existentialDeposit
        ? constants.balances.existentialDeposit.toString()
        : null

      let accountInfoType = null
      const balanceMetadata = await mutateMetadata(metadataRpc, (metadata) => {
        if (
          metadata.__kind === "V0" ||
          metadata.__kind === "V1" ||
          metadata.__kind === "V2" ||
          metadata.__kind === "V3" ||
          metadata.__kind === "V4" ||
          metadata.__kind === "V5" ||
          metadata.__kind === "V6" ||
          metadata.__kind === "V7" ||
          metadata.__kind === "V8" ||
          metadata.__kind === "V9" ||
          metadata.__kind === "V10" ||
          metadata.__kind === "V11" ||
          metadata.__kind === "V12" ||
          metadata.__kind === "V13"
        ) {
          // we can't parse metadata < v14
          //
          // as of v14 the type information required to interact with a chain is included in the chain metadata
          // https://github.com/paritytech/substrate/pull/8615
          //
          // before this change, the client needed to already know the type information ahead of time
          return null
        }

        const isSystemPallet = (pallet: any) => pallet.name === "System"
        const isAccountItem = (item: any) => item.name === "Account"

        metadata.value.pallets = metadata.value.pallets.filter(isSystemPallet)

        const { systemPallet /* systemPallet is not needed anymore 🔥 */, accountItem } = (() => {
          const systemPallet = metadata.value.pallets.find(isSystemPallet)
          if (!systemPallet) return { systemPallet, accountItem: undefined }
          if (!systemPallet.storage) return { systemPallet, accountItem: undefined }

          systemPallet.events = undefined
          systemPallet.calls = undefined
          systemPallet.errors = undefined
          systemPallet.constants = []
          systemPallet.storage.items = systemPallet.storage.items.filter(isAccountItem)

          const accountItem = (systemPallet.storage?.items || []).find(isAccountItem)
          if (!accountItem) return { systemPallet, accountItem: undefined }

          accountInfoType = accountItem.type.value
          return { systemPallet, accountItem }
        })()

        // this is a set of type ids which we plan to keep in our mutated metadata
        // anything not in this set will be deleted
        // we start off with just the types of the state calls we plan to make,
        // then we run those types through a function (addDependentTypes) which will also include
        // all of the types which those types depend on - recursively
        const keepTypes = new Set(
          [
            // NOTE: I don't think we need these for the balance state call,
            //       but I'm leaving them here just in case we have issues later on.
            // systemPallet?.events?.type,
            // systemPallet?.calls?.type,
            // systemPallet?.errors?.type,
            accountItem?.type.value,
          ].filter((type): type is number => typeof type === "number")
        )

        const addDependentTypes = (types: number[]) => {
          for (const typeIndex of types) {
            const type = metadata.value.lookup.types[typeIndex]
            if (!type) {
              log.warn(`Unable to find type with index ${typeIndex}`)
              continue
            }

            keepTypes.add(type.id)

            if (type?.type?.def?.__kind === "Array") addDependentTypes([type.type.def.value.type])
            if (type?.type?.def?.__kind === "Compact") addDependentTypes([type.type.def.value.type])
            if (type?.type?.def?.__kind === "Composite")
              addDependentTypes(type.type.def.value.fields.map(({ type }) => type))
            if (type?.type?.def?.__kind === "Sequence")
              addDependentTypes([type.type.def.value.type])
            if (type?.type?.def?.__kind === "Tuple")
              addDependentTypes(type.type.def.value.map((type) => type))
            if (type?.type?.def?.__kind === "Variant")
              addDependentTypes(
                type.type.def.value.variants.flatMap(({ fields }) => fields.map(({ type }) => type))
              )
          }
        }

        // recursively find all the types which our keepTypes depend on and add them to the keepTypes set
        addDependentTypes([...keepTypes])

        // ditch the types we aren't keeping
        const isKeepType = (type: any) => keepTypes.has(type.id)
        metadata.value.lookup.types = metadata.value.lookup.types.filter(isKeepType)

        // ditch the chain's signedExtensions, we don't need them for balance lookups
        // and the polkadot.js TypeRegistry will complain when it can't find the types for them
        metadata.value.extrinsic.signedExtensions = []

        return metadata
      })

      return {
        isTestnet,
        symbol,
        decimals,
        existentialDeposit,
        accountInfoType,
        metadata: balanceMetadata,
        metadataVersion: pjsMetadata.version,
      }
    },

    async fetchSubstrateChainTokens(chainId, chainMeta, moduleConfig) {
      if (moduleConfig?.disable === true) return {}

      const {
        isTestnet,
        symbol,
        decimals,
        existentialDeposit,
        accountInfoType,
        metadata,
        metadataVersion,
      } = chainMeta

      const id = subNativeTokenId(chainId, symbol)
      const nativeToken: SubNativeToken = {
        id,
        type: "substrate-native",
        isTestnet,
        symbol,
        decimals,
        logo: githubTokenLogoUrl(id),
        existentialDeposit: existentialDeposit || "0",
        accountInfoType, // TODO: Remove this from the token (it's not used - deprecated - but the existing live release uses it)
        metadata, // TODO: Remove this from the token (it's not used - deprecated - but the existing live release uses it)
        metadataVersion, // TODO: Remove this from the token (it's not used - deprecated - but the existing live release uses it)
        chain: { id: chainId },
      }

      return { [nativeToken.id]: nativeToken }
    },

    async subscribeBalances(addressesByToken, callback) {
      const chains = await chaindataProvider.chains()
      const tokens = await chaindataProvider.tokens()
      const subscriptions = Object.entries(addressesByToken)
        .map(async ([tokenId, addresses]) => {
          assert(chainConnectors.substrate, "This module requires a substrate chain connector")

          const token = tokens[tokenId]
          assert(token, `Token ${tokenId} not found`)

          // TODO: Fix @talismn/balances-react: it shouldn't pass every token to every module
          if (token.type !== "substrate-native") {
            log.debug(`This module doesn't handle tokens of type ${token.type}`)
            return () => {}
          }

          const chainId = token.chain?.id
          assert(chainId, `Token ${tokenId} has no chain`)

          const chain = chains[chainId]
          assert(chain, `Chain ${chainId} for token ${tokenId} not found`)

          const chainMeta: SubNativeChainMeta | undefined = (chain.balanceMetadata || []).find(
            ({ moduleType }) => moduleType === "substrate-native"
          )?.metadata
          const typeRegistry =
            chainMeta?.metadata !== undefined &&
            chainMeta?.metadata !== null &&
            chainMeta?.metadataVersion >= 14
              ? getOrCreateTypeRegistry(chainId, chainMeta.metadata)
              : new TypeRegistry()

          const accountInfoTypeDef = (() => {
            if (chainMeta?.accountInfoType === undefined) return AccountInfoOverrides[chainId]
            if (chainMeta?.accountInfoType === null) return AccountInfoOverrides[chainId]
            if (!(chainMeta?.metadataVersion >= 14)) return AccountInfoOverrides[chainId]

            try {
              return typeRegistry.metadata.lookup.getTypeDef(chainMeta.accountInfoType).type
            } catch (error: any) {
              log.debug(`Failed to getTypeDef for chain ${chainId}: ${error.message}`)
              return
            }
          })()

          // set up method, return message type and params
          const subscribeMethod = "state_subscribeStorage" // method we call to subscribe
          const responseMethod = "state_storage" // type of message we expect to receive for each subscription update
          const unsubscribeMethod = "state_unsubscribeStorage" // method we call to unsubscribe
          const params = buildParams(addresses)

          // build lookup table of `rpc hex output` -> `input address`
          const addressReferences = buildAddressReferences(addresses)

          // set up subscription
          const unsubscribe = await chainConnectors.substrate.subscribe(
            chainId,
            subscribeMethod,
            unsubscribeMethod,
            responseMethod,
            params,
            (error, result) => {
              if (error) return callback(error)
              callback(
                null,
                formatRpcResult(
                  tokenId,
                  chainId,
                  chain.account,
                  accountInfoTypeDef,
                  typeRegistry,
                  addressReferences,
                  result
                )
              )
            }
          )

          return unsubscribe
        })
        .map((subscription) =>
          subscription.catch((error) => {
            log.warn(`Failed to create subscription: ${error.message}`)
            return () => {}
          })
        )

      return () => subscriptions.forEach((promise) => promise.then((unsubscribe) => unsubscribe()))
    },

    async fetchBalances(addressesByToken) {
      const chains = await chaindataProvider.chains()
      const tokens = await chaindataProvider.tokens()

      const balances = (
        await Promise.all(
          Object.entries(addressesByToken).map(async ([tokenId, addresses]) => {
            assert(chainConnectors.substrate, "This module requires a substrate chain connector")

            const token = tokens[tokenId]
            assert(token, `Token ${tokenId} not found`)

            // TODO: Fix @talismn/balances-react: it shouldn't pass every token to every module
            if (token.type !== "substrate-native") {
              log.debug(`This module doesn't handle tokens of type ${token.type}`)
              return false
            }

            const chainId = token.chain?.id
            assert(chainId, `Token ${tokenId} has no chain`)

            const chain = chains[chainId]
            assert(chain, `Chain ${chainId} for token ${tokenId} not found`)

            const chainMeta: SubNativeChainMeta | undefined = (chain.balanceMetadata || []).find(
              ({ moduleType }) => moduleType === "substrate-native"
            )?.metadata
            const typeRegistry =
              chainMeta?.metadata !== undefined &&
              chainMeta?.metadata !== null &&
              chainMeta?.metadataVersion >= 14
                ? getOrCreateTypeRegistry(chainId, chainMeta.metadata)
                : new TypeRegistry()

            const accountInfoTypeDef = (() => {
              if (chainMeta?.accountInfoType === undefined) return AccountInfoOverrides[chainId]
              if (chainMeta?.accountInfoType === null) return AccountInfoOverrides[chainId]
              if (!(chainMeta?.metadataVersion >= 14)) return AccountInfoOverrides[chainId]

              try {
                return typeRegistry.metadata.lookup.getTypeDef(chainMeta.accountInfoType).type
              } catch (error: any) {
                log.debug(`Failed to getTypeDef for chain ${chainId}: ${error.message}`)
                return
              }
            })()

            // set up method and params
            const method = "state_queryStorageAt" // method we call to fetch
            const params = buildParams(addresses)

            // build lookup table of `rpc hex output` -> `input address`
            const addressReferences = buildAddressReferences(addresses)

            // query rpc
            const response = await chainConnectors.substrate.send(chainId, method, params)
            const result = response[0]

            return formatRpcResult(
              tokenId,
              chainId,
              chain.account,
              accountInfoTypeDef,
              typeRegistry,
              addressReferences,
              result
            )
          })
        )
      ).filter((balances): balances is Balances => balances !== false)

      return balances.reduce((allBalances, balances) => allBalances.add(balances), new Balances([]))
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
      const token = await chaindataProvider.getToken(tokenId)
      assert(token, `Token ${tokenId} not found in store`)

      if (token.type !== "substrate-native")
        throw new Error(`This module doesn't handle tokens of type ${token.type}`)

      const chainId = token.chain.id
      const chain = await chaindataProvider.getChain(chainId)
      assert(chain?.genesisHash, `Chain ${chainId} not found in store`)

      const { genesisHash } = chain

      const sendAll = transferMethod === "transferAll"

      const pallet = "balances"
      const method = transferMethod
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

/**
 * Turns an array of addresses into the params argument expected by `state_subscribeStorage` / `state_getStorage` / `state_queryStorageAt`.
 *
 * @param addresses - The addresses to query.
 * @returns The params to be sent to the RPC.
 */
function buildParams(addresses: string[]): string[][] {
  return [
    addresses
      .map((address) => decodeAnyAddress(address))
      .map((addressBytes) => blake2Concat(addressBytes).replace(/^0x/, ""))
      .map((addressHash) => `0x${moduleStorageHash}${addressHash}`),
  ]
}

/**
 * Turns an array of addresses into a lookup table of `[address, reference]`.
 *
 * This lookup table is used to associate each balance in the RPC response with
 * the account which has that balance.
 *
 * @param addresses - The addresses which will be queried.
 * @returns The lookup table.
 *
 * @example An example of a lookup table returned by this function.
 * ```ts
 * [
 *   [
 *     // The address encoded in ss58 format
 *     "5EHNsSHuWrNMYgx3bPhsRVLG77DX8sS8wZrnbtieJzbtSZr9",
 *     // The address encoded in hexadecimal format
 *     "6222bdf686960b8ee8aeda225d885575c2238f0403003983b392cde500aeb06c"
 *   ]
 * ]
 * ```
 */
function buildAddressReferences(addresses: string[]): Array<[string, string]> {
  return addresses
    .map((address) => decodeAnyAddress(address))
    .map((decoded) => u8aToHex(decoded, -1, false))
    .map((reference, index) => [addresses[index], reference])
}

// TODO: Make use of polkadot.js to encode/decode these state calls, while avoiding the use of
// its WsProvider and ApiPromise classes so that we don't pull down and parse the entire metadata
// blob for each chain.
/**
 * Formats an RPC result into an instance of `Balances`
 *
 * @param chain - The chain which this result came from.
 * @param addressReferences - A lookup table for linking each balance to an `Address`.
 *                            Can be built with `BalancesRpc.buildAddressReferences`.
 * @param result - The result returned by the RPC.
 * @returns A formatted list of balances.
 */
function formatRpcResult(
  tokenId: TokenId,
  chainId: ChainId,
  chainAccountFormat: string | null,
  accountInfoTypeDef: string | undefined,
  typeRegistry: Registry,
  addressReferences: Array<[string, string]>,
  result: unknown
): Balances {
  if (typeof result !== "object" || result === null) return new Balances([])
  if (!hasOwnProperty(result, "changes") || typeof result.changes !== "object")
    return new Balances([])
  if (!Array.isArray(result.changes)) return new Balances([])

  const balances = result.changes
    .map(([reference, change]: [unknown, unknown]): Balance | false => {
      if (typeof reference !== "string") {
        log.warn(`Received non-string reference in RPC result : ${reference}`)
        return false
      }

      if (typeof change !== "string" && change !== null) {
        log.warn(`Received non-string and non-null change in RPC result : ${reference} | ${change}`)
        return false
      }

      const [address] = addressReferences.find(([, hex]) => reference.endsWith(hex)) || []
      if (!address) {
        const search = reference.slice(-64)
        const set = addressReferences.map(([, reference]) => reference).join(",\n")
        log.error(`Failed to find address:\n${search} in\n${set}`)
        return false
      }

      if (accountInfoTypeDef === undefined) {
        // accountInfoTypeDef is undefined when chain is metadata < 14 and we also don't have an override hardcoded in
        // the most likely best way to handle this case: log a warning and return an empty balance
        log.debug(
          `Token ${tokenId} on chain ${chainId} has no balance type for decoding. Defaulting to a balance of 0 (zero).`
        )
        return false
      }

      let balance: any
      try {
        balance = createType(typeRegistry, accountInfoTypeDef, change)
      } catch (error) {
        log.warn(
          `Failed to create balance type for token ${tokenId} on chain ${chainId}: ${(
            error as any
          )?.toString()}`
        )
        return false
      }

      let free = (balance.data?.free?.toBigInt() || BigInt("0")).toString()
      let reserved = (balance.data?.reserved?.toBigInt() || BigInt("0")).toString()
      let miscFrozen = (balance.data?.miscFrozen?.toBigInt() || BigInt("0")).toString()
      let feeFrozen = (balance.data?.feeFrozen?.toBigInt() || BigInt("0")).toString()

      // we use the evm-native module to fetch native token balances for ethereum addresses on ethereum networks
      // but on moonbeam, moonriver and other chains which use ethereum addresses instead of substrate addresses,
      // we use both this module and the evm-native module
      if (isEthereumAddress(address) && chainAccountFormat !== "secp256k1")
        free = reserved = miscFrozen = feeFrozen = "0"

      return new Balance({
        source: "substrate-native",

        status: "live",

        address,
        multiChainId: { subChainId: chainId },
        chainId,
        tokenId,

        free,
        reserves: reserved,
        locks: [
          {
            label: "fees",
            amount: feeFrozen,
            includeInTransferable: true,
            excludeFromFeePayable: true,
          },
          { label: "misc", amount: miscFrozen },
        ],
      })
    })
    .filter((balance): balance is Balance => Boolean(balance))

  return new Balances(balances)
}

const isEthereumAddress = (address: string) => address.startsWith("0x") && address.length === 42
