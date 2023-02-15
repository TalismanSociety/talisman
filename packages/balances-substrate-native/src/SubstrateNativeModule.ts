import { Metadata, TypeRegistry, createType, decorateConstants } from "@polkadot/types"
import { u8aToHex } from "@polkadot/util"
import {
  Amount,
  Balance,
  BalanceModule,
  Balances,
  DefaultBalanceModule,
  LockedAmount,
  NewBalanceType,
} from "@talismn/balances"
import {
  ChainId,
  NewTokenType,
  SubChainId,
  TokenId,
  githubTokenLogoUrl,
} from "@talismn/chaindata-provider"
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

export const SubNativeModule: BalanceModule<
  ModuleType,
  SubNativeToken | CustomSubNativeToken,
  SubNativeChainMeta,
  SubNativeModuleConfig
> = {
  ...DefaultBalanceModule("substrate-native"),

  async fetchSubstrateChainMeta(chainConnector, chaindataProvider, chainId, moduleConfig) {
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

    const symbol: string = (Array.isArray(tokenSymbol) ? tokenSymbol[0] : tokenSymbol) || "Unknown"
    const decimals: number = (Array.isArray(tokenDecimals) ? tokenDecimals[0] : tokenDecimals) || 0

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

    const accountInfoType = null
    const balanceMetadata = metadataRpc

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

  async fetchSubstrateChainTokens(
    chainConnector,
    chaindataProvider,
    chainId,
    chainMeta,
    moduleConfig
  ) {
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

  async subscribeBalances(chainConnectors, chaindataProvider, addressesByToken, callback) {
    const chains = await chaindataProvider.chains()
    const tokens = await chaindataProvider.tokens()
    const subscriptions = Object.entries(addressesByToken)
      .map(async ([tokenId, addresses]) => {
        if (!chainConnectors.substrate)
          throw new Error(`This module requires a substrate chain connector`)

        const token = tokens[tokenId]
        if (!token) throw new Error(`Token ${tokenId} not found`)

        // TODO: Fix @talismn/balances-react: it shouldn't pass every token to every module
        if (token.type !== "substrate-native") {
          log.debug(`This module doesn't handle tokens of type ${token.type}`)
          return () => {}
        }

        const chainId = token.chain?.id
        if (!chainId) throw new Error(`Token ${tokenId} has no chain`)

        const chain = chains[chainId]
        if (!chain) throw new Error(`Chain ${chainId} for token ${tokenId} not found`)

        const typeRegistry = new TypeRegistry()
        const chainMeta: SubNativeChainMeta | undefined = (chain.balanceMetadata || []).find(
          ({ moduleType }) => moduleType === "substrate-native"
        )?.metadata
        if (
          chainMeta?.metadata !== undefined &&
          chainMeta?.metadata !== null &&
          chainMeta?.metadataVersion >= 14
        )
          typeRegistry.setMetadata(new Metadata(typeRegistry, chainMeta.metadata))

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

  async fetchBalances(chainConnectors, chaindataProvider, addressesByToken) {
    const chains = await chaindataProvider.chains()
    const tokens = await chaindataProvider.tokens()

    const balances = (
      await Promise.all(
        Object.entries(addressesByToken).map(async ([tokenId, addresses]) => {
          if (!chainConnectors.substrate)
            throw new Error(`This module requires a substrate chain connector`)

          const token = tokens[tokenId]
          if (!token) throw new Error(`Token ${tokenId} not found`)

          // TODO: Fix @talismn/balances-react: it shouldn't pass every token to every module
          if (token.type !== "substrate-native") {
            log.debug(`This module doesn't handle tokens of type ${token.type}`)
            return false
          }

          const chainId = token.chain?.id
          if (!chainId) throw new Error(`Token ${tokenId} has no chain`)

          const chain = chains[chainId]
          if (!chain) throw new Error(`Chain ${chainId} for token ${tokenId} not found`)

          const typeRegistry = new TypeRegistry()
          const chainMeta: SubNativeChainMeta | undefined = (chain.balanceMetadata || []).find(
            ({ moduleType }) => moduleType === "substrate-native"
          )?.metadata
          if (
            chainMeta?.metadata !== undefined &&
            chainMeta?.metadata !== null &&
            chainMeta?.metadataVersion >= 14
          )
            typeRegistry.setMetadata(new Metadata(typeRegistry, chainMeta.metadata))

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
  typeRegistry: TypeRegistry,
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
