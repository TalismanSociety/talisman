// biome-ignore-all lint/suspicious/noExplicitAny: legacy

import type { SignerPayloadJSON } from "@core/domains/signing/types"
import type { SolRpc } from "@talismn/chain-connectors"
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
import { isAddressEqual } from "@talismn/crypto"
import type { ScaleApi } from "@talismn/sapi"
import type { SolTransaction } from "@talismn/solana"
import type BigNumber from "bignumber.js"
import type { TransactionRequest } from "viem"

import type { SupportedSwapProtocol, SwapExchange } from "./swap-protocols"

export type { SupportedSwapProtocol, SwapExchange } from "./swap-protocols"

/** Charged by Talisman out of the input amount, shown as its own row on the confirm screen */
export const TALISMAN_FEE_NAME = "Talisman Fee"

export type QuoteFee = {
  name: string
  amount: BigNumber
  tokenId: TokenId
  /**
   * Charged on top of the input amount and of the network fee, shown as "Additional Fee" on the confirm screen.
   * Only fees in the source network's native token are balance-checked and allowed in the transaction value.
   */
  additional?: boolean
}

export type NonEmpty<T> = [T, ...T[]]

/**
 * One transaction the funds go through. A quote's legs run in order: each leg spends what the previous one delivers,
 * signed by the previous leg's recipient. Addresses are null while the form has none yet.
 */
export type QuoteLeg = {
  protocol: SupportedSwapProtocol
  fromTokenId: TokenId
  toTokenId: TokenId
  signer: string | null
  recipient: string | null
  inputAmount: bigint
  outputAmount: bigint
  fees: QuoteFee[]
  timeInSec: number
  /** module specific, handed back to the module that quoted the leg when it builds the leg */
  data?: unknown
}

export type BaseQuote = {
  decentralisationScore: number
  protocol: SupportedSwapProtocol
  subProtocol?: string
  legs: NonEmpty<QuoteLeg>
  /** the first leg's input */
  inputAmountBN: bigint
  /** the last leg's output */
  outputAmountBN: bigint
  /** every leg's fees */
  fees: QuoteFee[]
  /** every leg's duration, added up */
  timeInSec: number
  error?: string
  talismanFee?: number
  providerLogo: string
  providerName: string
  /** Short provider-specific remark shown on the confirmation screen */
  note?: string
  /** Provider-specific notice shown as an info banner on the confirmation screen */
  notice?: string

  /** If defined, the UI must account for a gas buffer of `maxNativeTokenGasBuffer` wei to be used for the swap */
  maxNativeTokenGasBuffer?: string
}

type QuoteSummary = "legs" | "inputAmountBN" | "outputAmountBN" | "fees" | "timeInSec"

export const quoteFromLegs = (
  legs: NonEmpty<QuoteLeg>,
  presentation: Omit<BaseQuote, QuoteSummary>
): BaseQuote => {
  legs.slice(1).forEach((leg, index) => {
    const previous = legs[index]
    if (leg.fromTokenId !== previous.toTokenId) throw new Error("Quote legs do not chain")
    if (leg.signer && previous.recipient && !isAddressEqual(leg.signer, previous.recipient))
      throw new Error("Quote legs do not chain")
  })

  return {
    ...presentation,
    legs,
    inputAmountBN: legs[0].inputAmount,
    outputAmountBN: legs[legs.length - 1].outputAmount,
    fees: legs.flatMap((leg) => leg.fees),
    timeInSec: legs.reduce((total, leg) => total + leg.timeInSec, 0),
  }
}

export type SwapView = "form" | "approve-recipient" | "confirm" | "submitted"

// --- Param types for SwapModule methods ---

export type QuoteParams = {
  fromTokenId: TokenId | null
  toTokenId: TokenId | null
  fromAmount: bigint | null
  fromAddress: string | null
  toAddress: string | null
  selectedSubProtocol?: string
  /** exact: the sender holds fromAmount now. upTo: a later leg, the sender holds at most fromAmount once the previous leg lands */
  input: "exact" | "upTo"
}

export type ExchangeParams = {
  fromTokenId: TokenId
  toTokenId: TokenId
  fromAmount: bigint
  fromAddress: string | null
  toAddress: string | null
}

export type SwapTransactionContext =
  | { platform: "ethereum" }
  | { platform: "polkadot"; sapi: ScaleApi; allowReap?: boolean }
  | { platform: "solana"; rpc: SolRpc }

export type GetTransactionParams = {
  fromTokenId: TokenId
  fromAddress: string
  /** amount entered by the user, and the only amount shown on the confirmation screen */
  fromAmount: bigint
  exchange: unknown // specific exchange type varies per module
  context: SwapTransactionContext
  /** recipient selected by the user, lets modules reject a quote built for another recipient */
  toAddress?: string
}

export type SwapModuleTransaction =
  | {
      platform: "ethereum"
      transaction: TransactionRequest
    }
  | {
      platform: "polkadot"
      payload: SignerPayloadJSON
      txMetadata?: Uint8Array
    }
  | {
      platform: "solana"
      transaction: SolTransaction
    }

export type ApprovalInfo = {
  contractAddress: string
  amount: bigint
  tokenAddress: string
  chainId: number
  fromAddress: string
  protocolName: string
} | null

export type SwapModule = {
  protocol: SupportedSwapProtocol
  decentralisationScore: number
  supportsSlippageSetting?: boolean

  getFromAssets: (signal: AbortSignal) => Promise<TokenId[]>
  getToAssets: (fromTokenId: TokenId | null, signal: AbortSignal) => Promise<TokenId[]>

  getQuote: (params: QuoteParams, signal: AbortSignal) => Promise<BaseQuote | BaseQuote[] | null>

  createExchange: (params: ExchangeParams) => Promise<SwapExchange | null>
  getTransaction: (params: GetTransactionParams) => Promise<SwapModuleTransaction | null>

  getApprovalInfo?: (
    params: Omit<QuoteParams, "input"> & { quoteData: BaseQuote | BaseQuote[] | null }
  ) => ApprovalInfo
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
