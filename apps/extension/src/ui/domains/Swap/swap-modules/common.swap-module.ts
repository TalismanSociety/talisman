// biome-ignore-all lint/suspicious/noExplicitAny: legacy

import type { FeatureFlag, RemoteConfigStoreData } from "@core/domains/app/types"
import type { Account } from "@core/domains/keyring/exports"
import type { SignerPayloadJSON } from "@core/domains/signing/types"
import type { WalletTransactionInfo } from "@core/domains/transactions/types"
import type { Balances } from "@talismn/balances"
import type { SolRpc } from "@talismn/chain-connectors"
import {
  evmErc20TokenId,
  evmNativeTokenId,
  type Network,
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
import type { ScaleApi } from "@talismn/sapi"
import type { SolTransaction } from "@talismn/solana"
import type BigNumber from "bignumber.js"
import type { Hex, PublicClient, TransactionRequest } from "viem"

import type { DepositSwapAsset, DepositTransactionParams } from "./deposit-swap-transactions"
import type { SwapExchange } from "./swap-protocols"

export type { SwapExchange } from "./swap-protocols"

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
  /** the validator a TAO to dTAO stake goes to, when the user picked one. Other modules ignore it */
  stakeHotkey?: string
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

/** why a leg stopped short of the next leg: reverted, cancelled by a replacement, lost by the wallet, or not delivered by the provider */
export type LegStop = "failed" | "cancelled" | "untracked" | "undelivered"

/** a sent transaction once the wallet settled it. hash: the speed-up that mined in its place, when one did */
export type SettledTransaction =
  | { landed: true; hash: Hex }
  | { landed: false; hash: Hex; stop: Exclude<LegStop, "undelivered"> }

export type LegOutcome =
  | { landed: true; hash: Hex; amount: bigint }
  | { landed: false; hash: Hex; stop: LegStop }

export type SettleLegParams = {
  leg: QuoteLeg
  hash: Hex
  input: bigint
}

type ApprovalQuote = Pick<BaseQuote, "legs" | "subProtocol">

export type ApprovalParams = Omit<QuoteParams, "input"> & {
  quoteData: ApprovalQuote | ApprovalQuote[] | null
}

export type EntryHop = {
  from: TokenId
  /** this module's source token, the via module must route from → hub */
  hub: TokenId
  via: SupportedSwapProtocol
  flag: FeatureFlag
}

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

export type SwapsConfig = RemoteConfigStoreData["swaps"]

export type BittensorSwapConfig = {
  remote: RemoteConfigStoreData["bittensor"]
  /** decimal, 0.05 takes 5% off the Talisman fee */
  seekDiscount: number
}

/** Everything a swap module reads from the wallet that runs it */
export type SwapEnv = {
  getNetwork: (networkId: NetworkId) => Promise<Network | null>
  getToken: (tokenId: TokenId | undefined) => Promise<Token | null>
  /** rejects for a network that is not an EVM network */
  evmClient: (networkId: NetworkId) => Promise<PublicClient>
  /** rejects for a network that is not a substrate network */
  substrateApi: (networkId: NetworkId) => Promise<ScaleApi>
  /** a fetch that carries the Gandalf token the Talisman API proxies require */
  proxyFetch: typeof fetch
  fetch: typeof fetch
  getSwapsConfig: () => Promise<SwapsConfig>
  getBittensorConfig: () => Promise<BittensorSwapConfig>
  getBalances: () => Promise<Balances>
  getTokensMap: <P extends NetworkPlatform>(
    platform?: P
  ) => Promise<Record<TokenId, TokenOfPlatform<P>>>
  getNetworksMap: <P extends NetworkPlatform>(
    platform?: P
  ) => Promise<Record<NetworkId, NetworkOfPlatform<P>>>
  getNetworks: <P extends NetworkPlatform>(platform?: P) => Promise<NetworkOfPlatform<P>[]>
  getAccounts: () => Promise<Account[]>
  getSlippageDecimal: () => Promise<number>
  findEvmClient: (networkId: NetworkId) => Promise<PublicClient | undefined>
  estimateSubstrateDepositFee: (
    fromAsset: DepositSwapAsset,
    fromAddress: string
  ) => Promise<QuoteFee | null>
  buildSubstrateDeposit: (params: DepositTransactionParams) => Promise<SwapModuleTransaction>
  /** settles once the transaction is final, failed, replaced or no longer tracked; never for one the wallet did not send */
  waitForTransaction: (
    networkId: NetworkId,
    hash: Hex,
    signal: AbortSignal
  ) => Promise<SettledTransaction>
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

  entryHops?: EntryHop[]

  getApprovalInfo?: (params: ApprovalParams) => ApprovalInfo

  settleLeg?: (params: SettleLegParams, signal: AbortSignal) => Promise<LegOutcome>
}

export type SwapModuleDefinition = Omit<
  SwapModule,
  "getFromAssets" | "getToAssets" | "getQuote" | "createExchange" | "buildLeg" | "settleLeg"
> & {
  getFromAssets: (env: SwapEnv, signal: AbortSignal) => Promise<TokenId[]>
  getToAssets: (
    fromTokenId: TokenId | null,
    env: SwapEnv,
    signal: AbortSignal
  ) => Promise<TokenId[]>
  getQuote: (
    params: QuoteParams,
    env: SwapEnv,
    signal: AbortSignal
  ) => Promise<BaseQuote | BaseQuote[] | null>
  createExchange?: (params: ExchangeParams, env: SwapEnv) => Promise<SwapExchange>
  buildLeg: (params: SwapBuildLegParams, env: SwapEnv) => Promise<BuiltLeg>
  settleLeg?: (params: SettleLegParams, env: SwapEnv, signal: AbortSignal) => Promise<LegOutcome>
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
