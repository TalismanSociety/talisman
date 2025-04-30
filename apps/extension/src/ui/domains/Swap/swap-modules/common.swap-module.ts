/* eslint-disable @typescript-eslint/no-explicit-any */

import type { SubmittableExtrinsic } from "@polkadot/api/types"
import type { Atom, Getter, SetStateAction, Setter } from "jotai"
import type { TransactionRequest } from "viem"
import type { Chain as ViemChain } from "viem/chains"
import { isAddress as isSubstrateAddress } from "@polkadot/util-crypto"
import { evmErc20TokenId, evmNativeTokenId, subNativeTokenId } from "@talismn/balances"
import { isBitcoinAddress } from "@talismn/crypto/src/address/encoding/bitcoin"
import { remoteConfigStore } from "extension-core"
import { atom } from "jotai"
import { atomWithStorage, createJSONStorage, unstable_withStorageValidator } from "jotai/utils"
import { Loadable } from "jotai/vanilla/utils/loadable"
import { isAddress } from "viem"
import {
  arbitrum,
  base,
  blast,
  bsc,
  mainnet,
  manta,
  moonbeam,
  moonriver,
  optimism,
  polygon,
  sonic,
} from "viem/chains"

import { Decimal } from "../swaps-port/Decimal"
import { swapViewAtom } from "../swaps-port/swapViewAtom"

export const supportedEvmChains: Record<string, ViemChain> = {
  eth: mainnet,
  bsc,
  base,
  arbitrum,
  optimism,
  blast,
  polygon,
  manta,
  movr: moonriver,
  glmr: moonbeam,
  s: sonic,
}

export type SupportedSwapProtocol = "simpleswap"

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

type QuoteFee = {
  name: string
  amount: Decimal
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
  talismanFeeBps?: number
  data?: TData
  timeInSec: number
  providerLogo: string
  providerName: string
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
  // /** Returns whether the swap succeeded or not */
  // swap: SwapFunction<any>

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

// atoms shared between swap modules

export const validateAddress = (address: string, networkType: "evm" | "substrate" | "btc") => {
  switch (networkType) {
    case "evm":
      return isAddress(address)
    case "substrate":
      return isSubstrateAddress(address)
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
export const fromEvmAddressAtom = atom<`0x${string}` | null>(null)
export const fromAddressAtom = atom((get) => {
  const fromAsset = get(fromAssetAtom)
  const evmAddress = get(fromEvmAddressAtom)
  const substrateAddress = get(fromSubstrateAddressAtom)
  if (!fromAsset) return null
  return fromAsset.networkType === "evm" ? evmAddress : substrateAddress
})

export const toAssetAtom = atom<SwappableAssetWithDecimals | null>(null)
export const toSubstrateAddressAtom = atom<string | null>(null)
export const toEvmAddressAtom = atom<`0x${string}` | null>(null)
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
        ? evmErc20TokenId(chainId.toString(), contractAddress)
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
