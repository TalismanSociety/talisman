// biome-ignore-all lint/suspicious/noExplicitAny: legacy

import type { Account } from "@core/domains/keyring/exports"
import type { SwapEnv } from "@core/domains/swaps/env"
import type {
  ApprovalInfo,
  ApprovalParams,
  BaseQuote,
  BuildLegParams,
  BuiltLeg,
  QuoteFee,
  QuoteParams,
  SupportedSwapProtocol,
  SwapModuleTransaction,
} from "@core/domains/swaps/types"
import {
  evmErc20TokenId,
  evmNativeTokenId,
  type NetworkId,
  type NetworkOfPlatform,
  type NetworkPlatform,
  parseTokenId,
  solNativeTokenId,
  solSplTokenId,
  subNativeTokenId,
  type Token,
  type TokenId,
  type TokenOfPlatform,
} from "@talismn/chaindata-provider"
import type { PublicClient } from "viem"

import type { DepositSwapAsset, DepositTransactionParams } from "./deposit-swap-transactions"
import type { SwapExchange } from "./swap-protocols"

export type { SwapExchange } from "./swap-protocols"

export type SwapView = "form" | "approve-recipient" | "confirm" | "submitted"

export type ExchangeParams = {
  fromTokenId: TokenId
  toTokenId: TokenId
  fromAmount: bigint
  fromAddress: string | null
  toAddress: string | null
}

export type SwapBuildLegParams = BuildLegParams & {
  /** the exchange createExchange opened for this leg */
  exchange: SwapExchange | null
}

/** What a page swap module reads from the pages */
export type PageSwapEnv = Omit<SwapEnv, "getToken"> & {
  getToken: (tokenId: TokenId | undefined) => Promise<Token | null>
  getTokensMap: <P extends NetworkPlatform>(
    platform?: P
  ) => Promise<Record<TokenId, TokenOfPlatform<P>>>
  getNetworksMap: <P extends NetworkPlatform>(
    platform?: P
  ) => Promise<Record<NetworkId, NetworkOfPlatform<P>>>
  getNetworks: <P extends NetworkPlatform>(platform?: P) => Promise<NetworkOfPlatform<P>[]>
  getAccounts: () => Promise<Account[]>
  getSlippageDecimal: () => Promise<number>
  /** undefined for unknown networks and networks without an evm-native token */
  findEvmClient: (networkId: NetworkId) => Promise<PublicClient | undefined>
  estimateSubstrateDepositFee: (
    fromAsset: DepositSwapAsset,
    fromAddress: string
  ) => Promise<QuoteFee | null>
  buildSubstrateDeposit: (params: DepositTransactionParams) => Promise<SwapModuleTransaction>
}

export type SwapModule = {
  protocol: SupportedSwapProtocol
  decentralisationScore: number
  supportsSlippageSetting?: boolean

  getFromAssets: (signal: AbortSignal) => Promise<TokenId[]>
  getToAssets: (fromTokenId: TokenId | null, signal: AbortSignal) => Promise<TokenId[]>

  getQuote: (params: QuoteParams, signal: AbortSignal) => Promise<BaseQuote | BaseQuote[] | null>

  /** opens an order with the provider, once per confirm screen: the order is what the leg pays into */
  createExchange?: (params: ExchangeParams) => Promise<SwapExchange>
  buildLeg: (params: SwapBuildLegParams) => Promise<BuiltLeg>

  getApprovalInfo?: (params: ApprovalParams) => ApprovalInfo
}

/** A swap module that reads the pages through the env it is given on each call */
export type PageSwapModule = Omit<
  SwapModule,
  "getFromAssets" | "getToAssets" | "getQuote" | "createExchange" | "buildLeg"
> & {
  getFromAssets: (env: PageSwapEnv, signal: AbortSignal) => Promise<TokenId[]>
  getToAssets: (
    fromTokenId: TokenId | null,
    env: PageSwapEnv,
    signal: AbortSignal
  ) => Promise<TokenId[]>
  getQuote: (
    params: QuoteParams,
    env: PageSwapEnv,
    signal: AbortSignal
  ) => Promise<BaseQuote | BaseQuote[] | null>
  createExchange?: (params: ExchangeParams, env: PageSwapEnv) => Promise<SwapExchange>
  buildLeg: (params: SwapBuildLegParams, env: PageSwapEnv) => Promise<BuiltLeg>
}

// helpers — module-internal use only

type SwapChainType = "substrate" | "evm" | "solana"

const PLATFORM_TO_CHAIN_TYPE: Record<NetworkPlatform, SwapChainType> = {
  ethereum: "evm",
  polkadot: "substrate",
  solana: "solana",
}

export const getTokenIdForSwappableAsset = (
  chainType: SwapChainType | NetworkPlatform,
  chainId: number | string,
  contractAddress?: string
) => {
  const resolved = PLATFORM_TO_CHAIN_TYPE[chainType as NetworkPlatform] ?? chainType
  switch (resolved) {
    case "evm":
      return contractAddress
        ? evmErc20TokenId(chainId.toString(), contractAddress as `0x${string}`)
        : evmNativeTokenId(chainId.toString())
    case "substrate":
      return subNativeTokenId(chainId.toString())
    case "solana":
      return contractAddress
        ? solSplTokenId(chainId.toString(), contractAddress)
        : solNativeTokenId(chainId.toString())
    default:
      return "not-supported"
  }
}

/** Derive the network platform from a Talisman token ID. */
export const platformFromTokenId = (tokenId: string): NetworkPlatform => {
  const { type } = parseTokenId(tokenId)
  if (type.startsWith("evm-")) return "ethereum"
  if (type.startsWith("substrate-")) return "polkadot"
  if (type.startsWith("sol-")) return "solana"
  throw new Error(`Unknown token type: ${type}`)
}

/**
 * Internal type used by swap modules to cache their provider-specific asset data.
 * Not exposed outside the module layer — the public API only uses tokenIds (string).
 */
export type SwappableAssetBaseType<TContext = Partial<Record<SupportedSwapProtocol, any>>> = {
  id: string
  name: string
  symbol: string
  chainId: number | string
  contractAddress?: string
  assetHubAssetId?: string
  image?: string
  platform: NetworkPlatform
  /** protocol modules can store context here, like any special identifier */
  context: TContext
  decimals?: number
}
