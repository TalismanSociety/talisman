import type { IBalance } from "@talismn/balances"
import type { ChainConnector } from "@talismn/chain-connector"
import type { ChainConnectorEvm } from "@talismn/chain-connector-evm"
import {
  AnyMiniMetadata,
  Token,
  TokenId,
  TokenOfType,
  TokenType,
} from "@talismn/chaindata-provider"
import { Observable } from "rxjs"

import { SubHydrationBalanceModule } from "./SubHydrationBalanceModule"

const UNKNOWN = null as unknown

/**
 * Changes:
 * - each method is standalone
 * - decoupled from chaindataProvider (which uses indexedDB so cant be used in node)
 * - all methods are network specific: this way they can return without waiting on other networks, while still being able to group multiple fetchs in one query
 * - connector is passed as a parameter on every method that needs one, so that an evm module doesnt need a substrate connector, and also to allow using a module without connector
 * - miniMetadatas are be fully typed
 * - TokenConfig would be made much simpler
 * - the logic about what data to fetch and cache (ex: erc20 symbols/decimals) would be here, where it belongs
 */

// would be defined in chaindata provider, for now we dont know the type of the extra field
// would be null for all ethereum tokens so we dont have to store them

// // would be defined in chaindata provider
// type TokenConfig<Type extends TokenType> = object

type TokenPlatform<T extends TokenType> = TokenOfType<T>["platform"]

// could actually be just a method instead, like sapi takes as input
// not sure how to handle subscriptions in that case though
type ConnectorOfPlatform<P extends TokenPlatform<TokenType>> = P extends "ethereum"
  ? ChainConnectorEvm
  : P extends "polkadot"
    ? ChainConnector
    : never

type DotTransferCallData = {
  address: string
  method: `0x${string}`
}

type EthTransferCallData = {
  from: string
  to: string
  data: `0x${string}`
  value?: `0x${string}` // optional, for native transfers only
}

type CallDataOfPlatform<P extends TokenPlatform<TokenType>> = P extends "ethereum"
  ? EthTransferCallData
  : P extends "polkadot"
    ? DotTransferCallData
    : never

export type TokensWithAddresses = Array<[Token, string[]]>

export interface IBalanceModule<
  Type extends TokenType,
  TokenConfig = unknown,
  BalanceConfig = unknown,
> {
  type: Type

  platform: TokenPlatform<Type>

  // compact metadata for storage and runtime apis + "extra" which contains constant values
  // => extra could actually stay encoded in the metadata, would just need to keep constant keys when compacting
  getMiniMetadata: (arg: {
    networkId: string
    specVersion: number
    metadataRpc: `0x${string}`
    config?: BalanceConfig
  }) => AnyMiniMetadata

  // ex: fetch missing erc20s info from contracts, but pick from cache instead if its already there
  // most modules wouldnt leverage the cache, unless there is a network issue ?
  // chaindata would handle the storage of the cache (which could be just one file that stores all tokens of all types)
  fetchTokens: (arg: {
    networkId: string
    tokens: TokenConfig[]
    connector: ConnectorOfPlatform<TokenPlatform<Type>>
    miniMetadata: AnyMiniMetadata
    cache: Record<TokenId, Token>
  }) => Promise<TokenOfType<Type>[]>

  fetchBalances: (arg: {
    networkId: string
    addressesByToken: TokensWithAddresses
    connector: ConnectorOfPlatform<TokenPlatform<Type>>
    miniMetadata: AnyMiniMetadata
  }) => Promise<IBalance[]>

  subscribeBalances: (arg: {
    networkId: string
    addressesByToken: TokensWithAddresses
    connector: ConnectorOfPlatform<TokenPlatform<Type>>
    miniMetadata: AnyMiniMetadata
  }) => Observable<IBalance[]>

  getTransferCallData: (arg: {
    from: string
    to: string
    planck: string
    token: Token
    metadataRpc: `0x${string}`
  }) => CallDataOfPlatform<TokenPlatform<Type>>
}

const BALANCE_MODULES_DEFINITIONS = {
  "substrate-native": UNKNOWN as IBalanceModule<"substrate-native">,
  "substrate-assets": UNKNOWN as IBalanceModule<"substrate-assets">,
  "substrate-foreignassets": UNKNOWN as IBalanceModule<"substrate-foreignassets">,
  "substrate-psp22": UNKNOWN as IBalanceModule<"substrate-psp22">,
  "substrate-tokens": UNKNOWN as IBalanceModule<"substrate-tokens">,
  "evm-native": UNKNOWN as IBalanceModule<"evm-native">,
  "evm-erc20": UNKNOWN as IBalanceModule<"evm-erc20">,
  "evm-uniswapv2": UNKNOWN as IBalanceModule<"evm-uniswapv2">,

  "substrate-hydration": SubHydrationBalanceModule,
}

// const BALANCE_MODULES = [
//   null as unknown as IBalanceModule<"substrate-native", { disable?: boolean }>,
//   null as unknown as IBalanceModule<"substrate-assets", null>,
//   null as unknown as IBalanceModule<"substrate-foreignassets", null>,
//   null as unknown as IBalanceModule<"substrate-psp22", null>,
//   null as unknown as IBalanceModule<"substrate-tokens", { palletId?: string }>,
//   null as unknown as IBalanceModule<"evm-native", null>,
//   null as unknown as IBalanceModule<"evm-erc20", null>,
//   null as unknown as IBalanceModule<"evm-uniswapv2", null>,
// ]

// const BALANCE_MODULES_BY_TYPE = keyBy(BALANCE_MODULES, (mod) => mod.type)

// type BalanceModuleKey = (typeof BALANCE_MODULES)[number]["type"]

// type BalanceMod = (typeof BALANCE_MODULES)[number]

// type BalanceModule<T extends TokenType = TokenType> = Extract<BalanceMod, { type: T }>

// const test4 = null as unknown as BalanceModOfType
// const test3 = null as unknown as BalanceModOfType<"substrate-native">

// test4.getMiniMetadata()

type BalanceModuleKey = keyof typeof BALANCE_MODULES_DEFINITIONS

export type BalanceModule<T extends BalanceModuleKey> = (typeof BALANCE_MODULES_DEFINITIONS)[T]

// type ConfigTypeOfModule<T extends BalanceModuleKey> = Parameters<BalanceModule<T>["getMiniMetadata"]>[2]

// const mod = UNKNOWN as BalanceModule<"substrate-native">

// const mod2 = UNKNOWN as BalanceModule<BalanceModuleKey>

// if (mod2.platform === "polkadot")
//   mod2.fetchTokens({
//     networkId: "",
//     tokens: [{}],
//     connector: UNKNOWN as ChainConnector,
//     cache: {},
//   })

const BALANCE_MODULES = Object.values(
  BALANCE_MODULES_DEFINITIONS,
) as BalanceModule<BalanceModuleKey>[]

// for (const mod of BALANCE_MODULES) {
//   if (mod.platform === "polkadot") {
//     mod.fetchTokens({
//       networkId: "",
//       tokens: [{}],
//       connector: UNKNOWN as ChainConnector,
//       cache: {},
//     })
//   } else if (mod.platform === "ethereum") {
//     mod.fetchTokens({
//       networkId: "",
//       tokens: [{}],
//       connector: UNKNOWN as ChainConnectorEvm,
//       cache: {},
//     })
//   }
// }

// const test = null as unknown as BalanceModule
// const test2 = null as unknown as BalanceModule<"evm-native">
// const test3 = null as unknown as BalanceModule<"substrate-native">

// //const BALANCE_MODULES = values(BALANCE_MODULES_DEFINITIONS)

// const dotConnector = null as unknown as ChainConnector
// const ethConnector = null as unknown as ChainConnectorEvm

// for (const mod of BALANCE_MODULES.map((m) => m as BalanceModule)) {
//     const key = mod.type as BalanceModuleKey
//     type ConfigType = ModuleConfig<typeof key>

//     const config = null as unknown as ConfigType

//     type ModuleConfig = Parameters<(typeof mod)["getMiniMetadata"]>[2]

//     if (mod.platform === "polkadot") {
//       const connector = null as unknown as ChainConnector

//       const moduleType = mod.type as TokenType
//       const moduleConfig = null as unknown as ConfigType

//       mod.getMiniMetadata(
//         "hydration",
//         "0x",
//         null as unknown as anyConfigTypeOfModule<typeof mod.type>,
//       )
//     }
// }

export { BALANCE_MODULES, BALANCE_MODULES_DEFINITIONS }
