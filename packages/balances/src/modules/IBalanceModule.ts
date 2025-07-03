import type { Address, IBalance } from "@talismn/balances"
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

export type PlatformOfToken<T extends TokenType> = TokenOfType<T>["platform"]

export type ConnectorOfPlatform<P extends PlatformOfToken<TokenType>> = P extends "ethereum"
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

type CallDataOfPlatform<P extends PlatformOfToken<TokenType>> = P extends "ethereum"
  ? EthTransferCallData
  : P extends "polkadot"
    ? DotTransferCallData
    : never

export type TokensWithAddresses = Array<[Token, Address[]]>

type MiniMetadataOfPlatform<P extends PlatformOfToken<TokenType>> = P extends "polkadot"
  ? AnyMiniMetadata
  : null

export interface IBalanceModule<
  Type extends TokenType,
  TokenConfig = unknown,
  BalanceConfig = unknown,
> {
  type: Type

  platform: PlatformOfToken<Type>

  // compact metadata for storage and runtime apis + "extra" which contains constant values
  // => extra could actually stay encoded in the metadata, would just need to keep constant keys when compacting
  getMiniMetadata: (arg: {
    networkId: string
    specVersion: number
    metadataRpc: `0x${string}`
    config?: BalanceConfig
  }) => MiniMetadataOfPlatform<PlatformOfToken<Type>>

  // ex: fetch missing erc20s info from contracts, but pick from cache instead if its already there
  // most modules wouldnt leverage the cache, unless there is a network issue ?
  // chaindata would handle the storage of the cache (which could be just one file that stores all tokens of all types)
  fetchTokens: (arg: {
    networkId: string
    tokens: TokenConfig[]
    connector: ConnectorOfPlatform<PlatformOfToken<Type>>
    miniMetadata: MiniMetadataOfPlatform<PlatformOfToken<Type>>
    cache: Record<TokenId, unknown>
  }) => Promise<TokenOfType<Type>[]>

  fetchBalances: (arg: {
    networkId: string
    addressesByToken: TokensWithAddresses
    connector: ConnectorOfPlatform<PlatformOfToken<Type>>
    miniMetadata: MiniMetadataOfPlatform<PlatformOfToken<Type>>
  }) => Promise<IBalance[]>

  subscribeBalances: (arg: {
    networkId: string
    addressesByToken: TokensWithAddresses
    connector: ConnectorOfPlatform<PlatformOfToken<Type>>
    miniMetadata: MiniMetadataOfPlatform<PlatformOfToken<Type>>
  }) => Observable<IBalance[]>

  getTransferCallData: (arg: {
    from: string
    to: string
    planck: string
    token: TokenOfType<Type>
    metadataRpc: `0x${string}`
  }) => CallDataOfPlatform<PlatformOfToken<Type>>
}
