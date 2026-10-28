import type { FeatureFlag } from "@core/domains/app/types"
import type { SignerPayloadJSON } from "@core/domains/signing/types"
import type { WalletTransaction, WalletTransactionInfo } from "@core/domains/transactions/types"
import type { SolRpc } from "@talismn/chain-connectors"
import type { TokenId } from "@talismn/chaindata-provider"
import type { ScaleApi } from "@talismn/sapi"
import type { SolTransaction } from "@talismn/solana"
import type BigNumber from "bignumber.js"
import type { Hex, TransactionRequest } from "viem"

import type { SwapEnv } from "./env"
import type { PersistedQuoteLeg, PlanSummary, SwapPlanId } from "./plans/types"

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
  txInfo: WalletTransactionInfo
}

/** What the chain says about a sent leg. The engine maps these answers onto the plan's state machine */
export type LegObservation =
  /** scanned: blocks this observation read without finding the leg, so no later one reads them again */
  | { status: "pending"; scanned?: number[] }
  /** hash: the transaction that landed, a speed-up's when one replaced the leg's own */
  | { status: "landed"; hash: Hex; amount: bigint }
  /** proven never executed: nothing moved */
  | { status: "dropped" }
  /** hash: the transaction that executed, a cancel's when the user cancelled the leg */
  | { status: "failed"; reason: "reverted" | "cancelled"; hash: Hex }
  | { status: "failed"; reason: "replaced" | "indeterminate" }

/** a transaction the user sent on a leg's nonce: the same call with higher fees, or a no-op */
export type LegReplacement = {
  kind: "speed-up" | "cancel"
  hash: Hex
  /** resent while the leg is pending: the same bytes keep the same hash */
  raw: Hex
  sentAt: number
}

export type SentEvidence =
  | {
      platform: "ethereum"
      /** the signed bytes when the background signed: a resend of the same bytes keeps the same hash */
      raw?: Hex
      /** oldest first. Whichever transaction on the leg's nonce lands decides the leg */
      replacements?: LegReplacement[]
    }
  | {
      platform: "polkadot"
      /** the mortal era: the extrinsic can only land in [birth, birth + period) */
      era: { birth: number; period: number }
      /** finalised blocks of the era already read without the extrinsic */
      scanned?: number[]
    }

export type SentLeg = {
  hash: Hex
  nonce: number
  sentAt: number
  evidence: SentEvidence
  /** the transactionsV2 row: evidence, not a verdict */
  row: WalletTransaction | null
}

export type ObserveLegParams = {
  leg: QuoteLeg
  sent: SentLeg
  /** a later leg spends what this one delivers, so the landed amount must be chain evidence of the delivery */
  handsOver: boolean
}

export type BoundLegParams = {
  leg: QuoteLeg
  /** decimal, 0.005 is 0.5% */
  slippage: number
  /** the previous leg's quoted output: a later leg never spends, value and gas, more than the plan brought */
  maxSpend: bigint
}

export type LegBoundCall = {
  /** the approved calldata with every free amount slot zeroed */
  template: Hex
  /** 32-byte word indices after the selector that hold an amount */
  amountSlots: number[]
  /** gas × maxFeePerGas cap for this function, in wei */
  maxNetworkFee: string
}

/**
 * An approved calldata template for a leg the background signs alone. Admission parses the signed
 * bytes and compares: everything is pinned except the amount slots, which must hold at least `floor`.
 */
export type LegBound = {
  platform: "ethereum"
  chainId: number
  signer: Hex
  to: Hex
  calls: NonEmpty<LegBoundCall>
  /** in planck of the leg's output token */
  floor: string
  /** in wei, the value plus gas × maxFeePerGas */
  maxSpend: string
}

export type SwapPlanProposeRequest = {
  id: SwapPlanId
  legs: NonEmpty<PersistedQuoteLeg>
  summary: PlanSummary
  /** the nonce of the leg 0 payload the page built: admission holds the signed leg to it */
  leg0Nonce: number
}

export interface SwapsMessages {
  /** one proposal per id, rejected while a started or newer plan holds its intermediate. The background computes the bounds */
  "pri(swaps.plan.propose)": [SwapPlanProposeRequest, boolean]
  /** proposed to aborted, a paused or building plan to stopped. False once the current leg is sent */
  "pri(swaps.plan.cancel)": [{ id: SwapPlanId }, boolean]
}

export type ApprovalInfo = {
  contractAddress: string
  amount: bigint
  tokenAddress: string
  chainId: number
  fromAddress: string
  protocolName: string
} | null

export type ApprovalParams = Omit<QuoteParams, "input"> & {
  quoteData: BaseQuote | BaseQuote[] | null
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
  /** who holds the funds between the legs */
  intermediate: "owned-evm"
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

  /** how long a sent leg may stay pending before the plan calls it indeterminate */
  legDeadlineMs: number
  /** the template admission checks before the background signs this leg alone. Null: the leg always needs the user */
  boundLeg: (params: BoundLegParams, env: SwapEnv) => Promise<LegBound | null>
  /** what the chain says about a sent leg, from chain evidence only */
  observeLeg: (params: ObserveLegParams, env: SwapEnv) => Promise<LegObservation>

  entryHops?: EntryHop[]

  getApprovalInfo?: (params: ApprovalParams) => ApprovalInfo
}

/** What the plan engine needs from a module whose legs it admits and observes, whether or not it can build them */
export type PlanLegRuntime = Pick<BackgroundSwapModule, "legDeadlineMs" | "boundLeg" | "observeLeg">
