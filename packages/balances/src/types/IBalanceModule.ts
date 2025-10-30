import type {
  IChainConnectorDot,
  IChainConnectorEth,
  IChainConnectorSol,
} from "@talismn/chain-connectors"
import { TransactionInstruction } from "@solana/web3.js"
import {
  DotNetworkId,
  EthNetworkId,
  SolNetworkId,
  Token,
  TokenId,
  TokenOfType,
  TokenType,
} from "@talismn/chaindata-provider"
import { Observable } from "rxjs"

import type { Address, IBalance, MiniMetadata } from "."

export type TokenPlatform<T extends TokenType> = TokenOfType<T>["platform"]

export type PlatformConnector<P extends TokenPlatform<TokenType>> = P extends "ethereum"
  ? IChainConnectorEth
  : P extends "polkadot"
    ? IChainConnectorDot
    : P extends "solana"
      ? IChainConnectorSol
      : never

type DotTransferCallData = {
  address: string
  method: `0x${string}`
}

type EthTransferCallData = {
  from: string
  to: string
  data: `0x${string}`
  value?: string // optional, for native transfers only
}

type SolTransferCallData = TransactionInstruction[]

export type BalanceTransferType = "keep-alive" | "all" | "allow-death"

type CallDataOf<P extends TokenPlatform<TokenType>> = P extends "ethereum"
  ? EthTransferCallData
  : P extends "polkadot"
    ? DotTransferCallData
    : P extends "solana"
      ? SolTransferCallData
      : never

export type TokensWithAddresses = Array<[Token, Address[]]>

export type FetchBalanceErrors = Array<{ tokenId: TokenId; address: Address; error: Error }>

export type FetchBalanceResults = {
  success: IBalance[]
  errors: FetchBalanceErrors
  /**
   * tokens identified at runtime while fetching balances, that were not part of the original request
   */
  dynamicTokens?: Token[]
}

export interface IBalanceModule<
  Type extends TokenType,
  TokenConfig = unknown,
  ModuleConfig = unknown,
  MiniMetadataExtra = unknown,
> {
  type: Type

  platform: TokenPlatform<Type>

  // compact metadata for storage and runtime apis + "extra" which contains constant values
  // => extra could actually stay encoded in the metadata, would just need to keep constant keys when compacting
  getMiniMetadata: (
    arg: TokenPlatform<Type> extends "polkadot"
      ? {
          networkId: string
          specVersion: number
          metadataRpc: `0x${string}`
          config?: ModuleConfig
        }
      : never,
  ) => TokenPlatform<Type> extends "polkadot" ? MiniMetadata<MiniMetadataExtra> : never

  // cache is used for modules that need to do a lot of queries to validate token data from chain, such as evm-erc20 and evm-uniswapv2
  // chaindata handles the storage of the cache
  fetchTokens: (
    arg: TokenPlatform<Type> extends "polkadot"
      ? {
          networkId: DotNetworkId
          tokens: TokenConfig[]
          connector: PlatformConnector<TokenPlatform<Type>>
          miniMetadata: MiniMetadata<MiniMetadataExtra>
          cache: Record<TokenId, unknown>
        }
      : {
          networkId: SolNetworkId
          tokens: TokenConfig[]
          connector: PlatformConnector<TokenPlatform<Type>>
          cache: Record<TokenId, unknown>
        },
  ) => Promise<TokenOfType<Type>[]>

  fetchBalances: (
    arg: TokenPlatform<Type> extends "polkadot"
      ? {
          networkId: DotNetworkId
          tokensWithAddresses: TokensWithAddresses
          connector: PlatformConnector<TokenPlatform<Type>>
          miniMetadata: MiniMetadata<MiniMetadataExtra>
        }
      : {
          networkId: EthNetworkId
          tokensWithAddresses: TokensWithAddresses
          connector: PlatformConnector<TokenPlatform<Type>>
        },
  ) => Promise<FetchBalanceResults>

  subscribeBalances: (
    arg: TokenPlatform<Type> extends "polkadot"
      ? {
          networkId: DotNetworkId
          tokensWithAddresses: TokensWithAddresses
          connector: PlatformConnector<TokenPlatform<Type>>
          miniMetadata: MiniMetadata<MiniMetadataExtra>
        }
      : {
          networkId: EthNetworkId
          tokensWithAddresses: TokensWithAddresses
          connector: PlatformConnector<TokenPlatform<Type>>
        },
  ) => Observable<FetchBalanceResults>

  getTransferCallData: (
    arg: TokenPlatform<Type> extends "polkadot"
      ? {
          from: string
          to: string
          value: string
          token: Token
          metadataRpc: `0x${string}`
          type: BalanceTransferType
          connector: PlatformConnector<TokenPlatform<Type>>
          config?: ModuleConfig
        }
      : TokenPlatform<Type> extends "ethereum"
        ? {
            from: string
            to: string
            value: string
            token: Token
          }
        : TokenPlatform<Type> extends "solana"
          ? {
              from: string
              to: string
              value: string
              token: Token
              connector: PlatformConnector<TokenPlatform<Type>>
            }
          : never,
  ) => CallDataOf<TokenPlatform<Type>> | Promise<CallDataOf<TokenPlatform<Type>>> // because of psp22
}
