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
import { ChainId, NewTokenType, SubChainId, TokenId } from "@talismn/chaindata-provider"
import { blake2Concat, decodeAnyAddress, hasOwnProperty } from "@talismn/util"

import log from "./log"

type ModuleType = "substrate-native"

// System.Account is the state_storage key prefix for nativeToken balances
const moduleHash = "26aa394eea5630e07c48ae0c9558cef7" // util_crypto.xxhashAsHex("System", 128);
const storageHash = "b99d880ec681799c0cf30e8886371da9" // util_crypto.xxhashAsHex("Account", 128);
const moduleStorageHash = `${moduleHash}${storageHash}`

// AccountInfo is the state_storage data format for nativeToken balances
const AccountInfo = JSON.stringify({
  nonce: "u32",
  consumers: "u32",
  providers: "u32",
  sufficients: "u32",
  data: { free: "u128", reserved: "u128", miscFrozen: "u128", feeFrozen: "u128" },
})
const AccountInfoCommonOverides = {
  noSufficients: JSON.stringify({
    nonce: "u32",
    consumers: "u32",
    providers: "u32",
    data: { free: "u128", reserved: "u128", miscFrozen: "u128", feeFrozen: "u128" },
  }),
  u64Nonce: JSON.stringify({
    nonce: "u64",
    consumers: "u32",
    providers: "u32",
    sufficients: "u32",
    data: { free: "u128", reserved: "u128", miscFrozen: "u128", feeFrozen: "u128" },
  }),
  refcount: JSON.stringify({
    nonce: "u32",
    refcount: "u32",
    data: { free: "u128", reserved: "u128", miscFrozen: "u128", feeFrozen: "u128" },
  }),
}
// TODO: Get this from the metadata store if metadata is >= v14
const AccountInfoOverrides: { [key: ChainId]: string } = {
  "crust": AccountInfoCommonOverides.noSufficients,
  "edgeware": AccountInfoCommonOverides.refcount,
  "kilt-spiritnet": AccountInfoCommonOverides.u64Nonce,
  "zeitgeist": AccountInfoCommonOverides.u64Nonce,
}

const subNativeTokenId = (chainId: ChainId, tokenSymbol: string) =>
  `${chainId}-substrate-native-${tokenSymbol}`.toLowerCase()

export type SubNativeToken = NewTokenType<
  ModuleType,
  {
    existentialDeposit: string
    chain: { id: ChainId } | null
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
  SubNativeChainMeta
> = {
  ...DefaultBalanceModule("substrate-native"),

  async fetchSubstrateChainMeta(chainConnector, chaindataProvider, chainId) {
    const isTestnet = (await chaindataProvider.getChain(chainId))?.isTestnet || false

    const [metadataRpc, chainProperties] = await Promise.all([
      chainConnector.send(chainId, "state_getMetadata", []),
      chainConnector.send(chainId, "system_properties", []),
    ])

    const { tokenSymbol, tokenDecimals } = chainProperties

    const symbol: string = (Array.isArray(tokenSymbol) ? tokenSymbol[0] : tokenSymbol) || "Unknown"
    const decimals: number = (Array.isArray(tokenDecimals) ? tokenDecimals[0] : tokenDecimals) || 0

    const metadata: Metadata = new Metadata(new TypeRegistry(), metadataRpc)
    metadata.registry.setMetadata(metadata)

    const constants = decorateConstants(metadata.registry, metadata.asLatest, metadata.version)
    const existentialDeposit = constants?.balances?.existentialDeposit
      ? constants.balances.existentialDeposit.toString()
      : null

    return { isTestnet, symbol, decimals, existentialDeposit }
  },

  async fetchSubstrateChainTokens(chainConnector, chaindataProvider, chainId, chainMeta) {
    const { isTestnet, symbol, decimals, existentialDeposit } = chainMeta

    const nativeToken: SubNativeToken = {
      id: subNativeTokenId(chainId, chainMeta.symbol),
      type: "substrate-native",
      isTestnet,
      symbol,
      decimals,
      existentialDeposit: existentialDeposit || "0",
      chain: { id: chainId },
    }

    return { [nativeToken.id]: nativeToken }
  },

  async subscribeBalances(chainConnector, chaindataProvider, addressesByToken, callback) {
    const tokens = await chaindataProvider.tokens()
    const subscriptions = Object.entries(addressesByToken).map(async ([tokenId, addresses]) => {
      const token = tokens[tokenId]
      if (!token) throw new Error(`Token ${tokenId} not found`)

      // TODO: Fix @talismn/balances-react: it shouldn't pass every token to every module
      if (token.type !== "substrate-native")
        throw new Error(`This module doesn't handle tokens of type ${token.type}`)

      const chainId = token.chain?.id
      if (!chainId) throw new Error(`Token ${tokenId} has no chain`)

      // set up method, return message type and params
      const subscribeMethod = "state_subscribeStorage" // method we call to subscribe
      const responseMethod = "state_storage" // type of message we expect to receive for each subscription update
      const unsubscribeMethod = "state_unsubscribeStorage" // method we call to unsubscribe
      const params = buildParams(addresses)

      // build lookup table of `rpc hex output` -> `input address`
      const addressReferences = buildAddressReferences(addresses)

      // set up subscription
      const unsubscribe = await chainConnector.subscribe(
        chainId,
        subscribeMethod,
        unsubscribeMethod,
        responseMethod,
        params,
        (error, result) => {
          if (error) return callback(error)
          callback(null, formatRpcResult(tokenId, chainId, addressReferences, result))
        }
      )

      return unsubscribe
    })

    return () => subscriptions.forEach((promise) => promise.then((unsubscribe) => unsubscribe()))
  },

  async fetchBalances(chainConnector, chaindataProvider, addressesByToken) {
    const tokens = await chaindataProvider.tokens()

    const balances = await Promise.all(
      Object.entries(addressesByToken).map(async ([tokenId, addresses]) => {
        const token = tokens[tokenId]
        if (!token) throw new Error(`Token ${tokenId} not found`)

        const chainId = token.chain?.id
        if (!chainId) throw new Error(`Token ${tokenId} has no chain`)

        // set up method and params
        const method = "state_queryStorageAt" // method we call to fetch
        const params = buildParams(addresses)

        // build lookup table of `rpc hex output` -> `input address`
        const addressReferences = buildAddressReferences(addresses)

        // query rpc
        const response = await chainConnector.send(chainId, method, params)
        const result = response[0]

        return formatRpcResult(tokenId, chainId, addressReferences, result)
      })
    )

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
      .map((addressBytes) => blake2Concat(addressBytes).replace("0x", ""))
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
        log.error(`Failed to find address: \n${search} in \n${set}`)
        return false
      }

      const accountInfo = AccountInfoOverrides[chainId] || AccountInfo
      const balance: any = createType(new TypeRegistry(), accountInfo, change)

      const free = (balance.data?.free.toBigInt() || BigInt("0")).toString()
      const reserved = (balance.data?.reserved.toBigInt() || BigInt("0")).toString()
      const miscFrozen = (balance.data?.miscFrozen.toBigInt() || BigInt("0")).toString()
      const feeFrozen = (balance.data?.feeFrozen.toBigInt() || BigInt("0")).toString()

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
