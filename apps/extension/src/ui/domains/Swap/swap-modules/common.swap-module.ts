// biome-ignore-all lint/suspicious/noExplicitAny: legacy

import type {
  ApprovalInfo,
  ApprovalParams,
  BaseQuote,
  BuildLegParams,
  BuiltLeg,
  QuoteParams,
  SupportedSwapProtocol,
} from "@core/domains/swaps/types"
import {
  evmErc20TokenId,
  evmNativeTokenId,
  type NetworkPlatform,
  parseTokenId,
  solNativeTokenId,
  solSplTokenId,
  subNativeTokenId,
  type TokenId,
} from "@talismn/chaindata-provider"

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
