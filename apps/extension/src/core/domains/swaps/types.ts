import type { FeatureFlag } from "@core/domains/app/types"
import type { SignerPayloadJSON } from "@core/domains/signing/types"
import type { WalletTransactionInfo } from "@core/domains/transactions/types"
import type { SolRpc } from "@talismn/chain-connectors"
import type { TokenId } from "@talismn/chaindata-provider"
import type { ScaleApi } from "@talismn/sapi"
import type { SolTransaction } from "@talismn/solana"
import type BigNumber from "bignumber.js"
import type { TransactionRequest } from "viem"

import type { SwapEnv } from "./env"

export type SupportedSwapProtocol =
  | "simpleswap"
  | "stealthex"
  | "lifi"
  | "bittensor-evm"
  | "forevermoney"

export type QuoteFee = {
  name: string
  amount: BigNumber
  tokenId: TokenId
  /**
   * Charged on top of the input amount and of the network fee, shown as "Additional Fee" on the confirm screen.
   * Only fees in the source network's native token are balance-checked and allowed in the transaction value.
   */
  additional?: boolean
  /** A network fee the user pays on top of the swap, on any leg's network */
  gas?: boolean
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

export type SwapTransactionContext =
  | { platform: "ethereum" }
  | { platform: "polkadot"; sapi: ScaleApi; allowReap?: boolean }
  | { platform: "solana"; rpc: SolRpc }

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

export type BuildLegParams = {
  leg: QuoteLeg
  /** what the leg's signer spends, the amount the user entered for the first leg */
  input: bigint
  context: SwapTransactionContext
  /** decimal, 0.005 is 0.5% */
  slippage: number
}

export type BuiltLeg = {
  transaction: SwapModuleTransaction
  /** fees read when the leg was built, the confirm screen shows them instead of the quote's */
  fees: QuoteFee[]
  expectedOutput: bigint
  /** the least output the user accepted for this leg. Set only when `expectedOutput` is below it: the user signs it on screen, seeing the drop */
  acceptedOutput?: bigint
  txInfo: WalletTransactionInfo
}

export type ApprovalInfo = {
  contractAddress: string
  amount: bigint
  tokenAddress: string
  chainId: number
  fromAddress: string
  protocolName: string
} | null

/** the quote whose first leg is approved: a plan leg passes itself as a one-leg quote */
type ApprovalQuote = Pick<BaseQuote, "legs" | "subProtocol">

export type ApprovalParams = Omit<QuoteParams, "input"> & {
  quoteData: ApprovalQuote | ApprovalQuote[] | null
}

/**
 * A route this module can finish once another module moved the funds to its source token first.
 * ForeverMoney declares Finney TAO → 964 TAO via bittensor-evm, so a Finney TAO → Base TAO quote
 * becomes a two-leg plan held by an owned EVM account in between.
 */
export type EntryHop = {
  from: TokenId
  /** this module's source token, the via module must route from → hub */
  hub: TokenId
  via: SupportedSwapProtocol
  flag: FeatureFlag
}

/** A swap module that runs in the UI and in the background: everything it reads from the realm goes through `env` */
export type BackgroundSwapModule = {
  protocol: SupportedSwapProtocol
  decentralisationScore: number

  getFromAssets: (signal: AbortSignal) => Promise<TokenId[]>
  getToAssets: (fromTokenId: TokenId | null, signal: AbortSignal) => Promise<TokenId[]>

  getQuote: (
    params: QuoteParams,
    env: SwapEnv,
    signal: AbortSignal
  ) => Promise<BaseQuote | BaseQuote[] | null>
  buildLeg: (params: BuildLegParams, env: SwapEnv) => Promise<BuiltLeg>

  entryHops?: EntryHop[]

  getApprovalInfo?: (params: ApprovalParams) => ApprovalInfo
}
