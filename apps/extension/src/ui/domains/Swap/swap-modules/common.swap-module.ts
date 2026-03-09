// biome-ignore-all lint/suspicious/noExplicitAny: legacy

import {
  isAccountCompatibleWithNetwork,
  isAddressCompatibleWithNetwork,
} from "@core/domains/accounts/helpers"
import type { Account } from "@core/domains/keyring/exports"
import { isAccountPlatformEthereum } from "@core/domains/keyring/exports"
import type { SignerPayloadJSON } from "@core/domains/signing/types"
import {
  evmErc20TokenId,
  evmNativeTokenId,
  type Network,
  subNativeTokenId,
} from "@talismn/chaindata-provider"
import { isBitcoinAddress, isEthereumAddress, isSs58Address } from "@talismn/crypto"
import type { ScaleApi } from "@talismn/sapi"
import type BigNumber from "bignumber.js"
import type { TransactionRequest } from "viem"

// Forward references — these types are exported by the module files
// We use dynamic import types to avoid circular dependencies at runtime
type SimpleswapExchange = import("./simpleswap-swap-module").SimpleswapExchange
type StealthexExchange = import("./stealthex-swap-module").StealthexExchange

export type SupportedSwapProtocol = "simpleswap" | "stealthex" | "lifi"

export type SwappableAssetBaseType<TContext = Partial<Record<SupportedSwapProtocol, any>>> = {
  id: string
  name: string
  symbol: string
  chainId: number | string
  contractAddress?: string
  assetHubAssetId?: string
  image?: string
  networkType: "evm" | "substrate" | "btc"
  /** protocol modules can store context here, like any special identifier */
  context: TContext
  decimals?: number
}

export type SwappableAssetWithDecimals<TContext = Partial<Record<SupportedSwapProtocol, any>>> = {
  decimals: number
} & SwappableAssetBaseType<TContext>

export type QuoteFee = {
  name: string
  amount: BigNumber
  tokenId: string
}

export type BaseQuote<TData = any> = {
  decentralisationScore: number
  protocol: SupportedSwapProtocol
  subProtocol?: string
  outputAmountBN: bigint
  inputAmountBN: bigint
  error?: string
  fees: QuoteFee[]
  talismanFee?: number
  data?: TData
  timeInSec: number
  providerLogo: string
  providerName: string

  /** If defined, the UI must account for a gas buffer of `maxNativeTokenGasBuffer` wei to be used for the swap */
  maxNativeTokenGasBuffer?: string
}

export type QuoteResponse = {
  query: {
    amount: string
    quote: {
      intermediateAmount?: string
      egressAmount: string
      includedFees: Array<{
        type: "LIQUIDITY" | "NETWORK" | "INGRESS" | "EGRESS" | "BROKER" | "BOOST"
        chain: unknown
        asset: unknown
        amount: string
      }>
      lowLiquidityWarning: boolean | undefined
      estimatedDurationSeconds: number
    }
  }
}

export type SwapView = "form" | "approve-recipient" | "approve-erc20" | "confirm"

// --- Param types for SwapModule methods ---

export type QuoteParams = {
  fromAsset: SwappableAssetWithDecimals
  toAsset: SwappableAssetWithDecimals
  fromAmount: bigint
  fromAddress: string | null
  toAddress: string | null
  selectedSubProtocol?: string
}

export type ExchangeParams = {
  fromAsset: SwappableAssetWithDecimals
  toAsset: SwappableAssetWithDecimals
  fromAmount: bigint
  fromAddress: string | null
  toAddress: string | null
}

export type EvmTxParams = {
  fromAsset: SwappableAssetWithDecimals
  fromAddress: string
  exchange: unknown // specific exchange type varies per module
}

export type SubstrateTxParams = {
  fromAsset: SwappableAssetWithDecimals
  fromAddress: string
  exchange: unknown // specific exchange type varies per module
  sapi: ScaleApi
  allowReap?: boolean
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

  getFromAssets: (signal: AbortSignal) => Promise<SwappableAssetBaseType[]>
  getToAssets: (
    fromAsset: SwappableAssetWithDecimals | null,
    signal: AbortSignal
  ) => Promise<SwappableAssetBaseType[]>

  getQuote: (params: QuoteParams, signal: AbortSignal) => Promise<BaseQuote | BaseQuote[] | null>

  createExchange: (
    params: ExchangeParams
  ) => Promise<SimpleswapExchange | StealthexExchange | undefined>
  getEvmTransaction: (params: EvmTxParams) => Promise<TransactionRequest | undefined>
  getSubstratePayload: (
    params: SubstrateTxParams
  ) => Promise<{ payload: SignerPayloadJSON; txMetadata?: Uint8Array } | null>

  getApprovalInfo?: (
    params: QuoteParams & { quoteData: BaseQuote | BaseQuote[] | null }
  ) => ApprovalInfo
}

// atoms shared between swap module
export const validateAddress = (
  account: Account | undefined,
  address: string,
  network: Network | undefined,
  networkType: "evm" | "substrate" | "btc"
) => {
  if (network) {
    if (account) return isAccountCompatibleWithNetwork(network, account)
    if (address) return isAddressCompatibleWithNetwork(network, address)
  }

  switch (networkType) {
    case "evm":
      return account ? isAccountPlatformEthereum(account) : isEthereumAddress(address)
    case "substrate":
      return account
        ? network && isAccountCompatibleWithNetwork(network, account)
        : isSs58Address(address)
    case "btc":
      return isBitcoinAddress(address)
    default:
      throw new Error("Invalid network type")
  }
}

// helpers

export const getTokenIdForSwappableAsset = (
  chainType: "substrate" | "evm" | "btc",
  chainId: number | string,
  contractAddress?: string
) => {
  switch (chainType) {
    case "evm":
      return contractAddress
        ? evmErc20TokenId(chainId.toString(), contractAddress as `0x${string}`)
        : evmNativeTokenId(chainId.toString())
    case "substrate":
      return subNativeTokenId(chainId.toString())
    case "btc":
      return "btc-native"
    default:
      return "not-supported"
  }
}
