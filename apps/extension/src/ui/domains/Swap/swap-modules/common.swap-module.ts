/* eslint-disable @typescript-eslint/no-explicit-any */

import type { SubmittableExtrinsic } from "@polkadot/api/types"
import type { Atom, Getter, SetStateAction, Setter } from "jotai"
import type { TransactionRequest } from "viem"
import {
  evmErc20TokenId,
  evmNativeTokenId,
  Network,
  subNativeTokenId,
} from "@talismn/chaindata-provider"
import { isBitcoinAddress, isEthereumAddress, isSs58Address } from "@talismn/crypto"
import { ScaleApi } from "@talismn/sapi"
import BigNumber from "bignumber.js"
import {
  Account,
  isAccountCompatibleWithNetwork,
  isAccountPlatformEthereum,
  isAddressCompatibleWithNetwork,
  remoteConfigStore,
  SignerPayloadJSON,
} from "extension-core"
import { atom } from "jotai"
import { atomWithStorage, createJSONStorage, unstable_withStorageValidator } from "jotai/utils"
import { Loadable } from "jotai/vanilla/utils/loadable"

import { Decimal } from "../swaps-port/Decimal"
import { swapViewAtom } from "../swaps-port/swapViewAtom"
import { SimpleswapExchange } from "./simpleswap-swap-module"
import { StealthexExchange } from "./stealthex-swap-module"

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

type SwapProps = {
  allowReap?: boolean
  toAmount: Decimal | null
}

export type SwapActivity<TData> = {
  protocol: SupportedSwapProtocol
  timestamp: number
  data: TData
  depositRes?: {
    chainId: string | number
    extrinsicId?: string
    txHash?: string
    error?: string
  }
}

export type EstimateGasTx =
  | {
      type: "evm"
      chainId: number
      tx: TransactionRequest
    }
  | {
      type: "substrate"
      fromAddress: string
      tx: SubmittableExtrinsic<"promise">
    }

export type QuoteFunction<TData = any> = Atom<
  Loadable<Promise<BaseQuote<TData> | Loadable<Promise<BaseQuote<TData> | null>>[] | null>>
>
export type SwapFunction<TData> = (
  get: Getter,
  set: Setter,
  props: SwapProps,
) => Promise<Omit<SwapActivity<TData>, "timestamp">>
export type GetEstimateGasTxFunction = (get: Getter) => Promise<QuoteFee | null>

export type SwapModule = {
  protocol: SupportedSwapProtocol
  fromAssetsSelector: Atom<Promise<SwappableAssetBaseType[]>>
  toAssetsSelector: Atom<Promise<SwappableAssetBaseType[]>>
  quote: QuoteFunction

  exchangeAtom: Atom<Promise<SimpleswapExchange | StealthexExchange | undefined>>
  evmTransactionAtom: Atom<Promise<TransactionRequest | undefined>>
  substratePayloadAtom: (
    sapi?: ScaleApi | null,
    allowReap?: boolean,
  ) => Atom<Promise<{ payload: SignerPayloadJSON; txMetadata?: Uint8Array } | null>>

  // talisman curated data
  decentralisationScore: number
  approvalAtom?: Atom<{
    contractAddress: string
    amount: bigint
    tokenAddress: string
    chainId: number
    fromAddress: string
    protocolName: string
  } | null>
}

// atoms shared between swap module
export const validateAddress = (
  account: Account | undefined,
  address: string,
  network: Network | undefined,
  networkType: "evm" | "substrate" | "btc",
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

export const selectedProtocolAtom = atom<SupportedSwapProtocol | null>(null)
export const selectedSubProtocolAtom = atom<string | undefined>(undefined)
export const fromAssetAtom = atom<SwappableAssetWithDecimals | null>(null)
export const fromAmountAtom = atom<Decimal>(Decimal.fromPlanck(0n, 1))
export const fromSubstrateAddressAtom = atom<string | null>(null)
export const fromEvmAddressAtom = atom<string | null>(null)
export const fromAddressAtom = atom((get) => {
  const fromAsset = get(fromAssetAtom)
  const evmAddress = get(fromEvmAddressAtom)
  const substrateAddress = get(fromSubstrateAddressAtom)
  if (!fromAsset) return null
  return fromAsset.networkType === "evm" ? evmAddress : substrateAddress
})

// TODO: Make this select from the URL so we can link it to the button in the seek banner
export const toAssetAtom = atom<SwappableAssetWithDecimals | null>(null)
export const toSubstrateAddressAtom = atom<string | null>(null)
export const toEvmAddressAtom = atom<string | null>(null)
export const toBtcAddressAtom = atom<string | null>(null)

export const toAddressAtom = atom((get) => {
  const toAsset = get(toAssetAtom)
  const evmAddress = get(toEvmAddressAtom)
  const substrateAddress = get(toSubstrateAddressAtom)
  const btcAddress = get(toBtcAddressAtom)
  if (!toAsset) return null
  switch (toAsset.networkType) {
    case "evm":
      return evmAddress
    case "substrate":
      return substrateAddress
    case "btc":
      return btcAddress
    default:
      return null
  }
})

export const swappingAtom = atom(false)
export const quoteSortingAtom = atom<"decentalised" | "cheapest" | "fastest" | "bestRate">(
  "bestRate",
)
export const swapQuoteRefresherAtom = atom(new Date().getTime())

export const resetSwapFormAtom = atom(null, (_, set) => {
  set(fromEvmAddressAtom, null)
  set(fromSubstrateAddressAtom, null)
  set(toEvmAddressAtom, null)
  set(toSubstrateAddressAtom, null)
  set(fromAssetAtom, null)
  set(toAssetAtom, null)
  set(fromAmountAtom, Decimal.fromPlanck(0n, 0))
  set(swapViewAtom, "form")
})

// swaps history related atoms

type StoredSwaps = SwapActivity<any>[]

const validateSwaps = (value: unknown): value is StoredSwaps => {
  if (!Array.isArray(value)) return false
  for (const swap of value) {
    if (typeof swap?.protocol !== "string" || typeof swap?.timestamp !== "number" || !swap?.data)
      return false
  }
  return true
}

const _swapsStorage = unstable_withStorageValidator(validateSwaps)(
  createJSONStorage(() => globalThis.localStorage, {
    reviver: (key, value) => {
      if (key === "timestamp" && typeof value === "number") new Date(value)
      return value
    },
  }),
)

const filterAndSortStoredSwaps = (swaps: StoredSwaps) =>
  swaps.toSorted((a, b) => b.timestamp - a.timestamp)

const swapsStorage: typeof _swapsStorage = {
  ..._swapsStorage,
  getItem: (key, initialValue) =>
    filterAndSortStoredSwaps(_swapsStorage.getItem(key, initialValue)),
  setItem: (key, newValue) => _swapsStorage.setItem(key, filterAndSortStoredSwaps(newValue)),
}

const swapsStorageAtom = atomWithStorage("@talisman/swaps", [], swapsStorage)

export const swapsAtom = atom(
  (get) => filterAndSortStoredSwaps(get(swapsStorageAtom)),
  (_, set, swaps: SetStateAction<StoredSwaps>) => set(swapsStorageAtom, swaps),
)

// helpers

export const getTokenIdForSwappableAsset = (
  chainType: "substrate" | "evm" | "btc",
  chainId: number | string,
  contractAddress?: string,
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

export const saveAddressForQuest = async (
  swapId: string,
  fromAddress: string,
  provider: string,
) => {
  const { questApi } = await remoteConfigStore.get("swaps")
  if (!questApi) return

  await fetch(`${questApi}/api/quests/swap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ swapId, fromAddress, provider }),
  })
}
