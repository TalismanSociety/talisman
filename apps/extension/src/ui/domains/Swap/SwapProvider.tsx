import { provideContext } from "@ui/util/provideContext"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import type { SwapInit } from "./hooks/useSwapTokensModal"
import type {
  SupportedSwapProtocol,
  SwappableAssetWithDecimals,
  SwapView,
} from "./swap-modules/common.swap-module"
import {
  useFromAccount,
  useReverse,
  useSafeTokens,
  useSetToAddress,
  useSwapAssets,
  useSwapErc20Approval,
  useSwapQuotes,
} from "./swaps.api"
import { Decimal } from "./swaps-port/Decimal"

export type { SwapView } from "./swap-modules/common.swap-module"

type SwapProviderProps = {
  stateInit: SwapInit | null
}

const useSwapProviderContext = ({ stateInit }: SwapProviderProps) => {
  const { t } = useTranslation()

  // -- View --
  const [swapView, setSwapView] = useState<SwapView>("form")

  // -- Core form state --
  const [fromAsset, setFromAsset] = useState<SwappableAssetWithDecimals | null>(null)
  const [toAsset, setToAsset] = useState<SwappableAssetWithDecimals | null>(null)
  const [fromAmount, setFromAmount] = useState<Decimal>(Decimal.fromPlanck(0n, 1))
  const [selectedProtocol, setSelectedProtocol] = useState<SupportedSwapProtocol | null>(null)
  const [selectedSubProtocol, setSelectedSubProtocol] = useState<string | undefined>(undefined)
  const [quoteSorting, setQuoteSorting] = useState<
    "decentalised" | "cheapest" | "fastest" | "bestRate"
  >("bestRate")

  // -- Address state --
  const [fromEvmAddress, setFromEvmAddress] = useState<string | null>(null)
  const [fromSubstrateAddress, setFromSubstrateAddress] = useState<string | null>(null)
  const [toEvmAddress, setToEvmAddress] = useState<string | null>(null)
  const [toSubstrateAddress, setToSubstrateAddress] = useState<string | null>(null)
  const [toBtcAddress, setToBtcAddress] = useState<string | null>(null)

  // -- Computed addresses --
  const fromAddress = useMemo(() => {
    if (!fromAsset) return null
    if (fromAsset.networkType === "evm") return fromEvmAddress
    return fromSubstrateAddress
  }, [fromAsset, fromEvmAddress, fromSubstrateAddress])

  const toAddress = useMemo(() => {
    if (!toAsset) return null
    if (toAsset.networkType === "evm") return toEvmAddress
    if (toAsset.networkType === "btc") return toBtcAddress
    return toSubstrateAddress
  }, [toAsset, toEvmAddress, toSubstrateAddress, toBtcAddress])

  // -- Token tab --
  const [tokenTab, setTokenTab] = useState("all")

  // -- Actions --
  const [quoteRefresher, setQuoteRefresher] = useState(Date.now())
  const refreshQuotes = useCallback(() => setQuoteRefresher(Date.now()), [])
  const [approvalCounter, setApprovalCounter] = useState(0)
  const incrementApprovalCounter = useCallback(() => setApprovalCounter((c) => c + 1), [])

  const resetForm = useCallback(() => {
    setSwapView("form")
    setFromAsset(null)
    setToAsset(null)
    setFromAmount(Decimal.fromPlanck(0n, 1))
    setSelectedProtocol(null)
    setSelectedSubProtocol(undefined)
    setQuoteSorting("bestRate")
    setFromEvmAddress(null)
    setFromSubstrateAddress(null)
    setToEvmAddress(null)
    setToSubstrateAddress(null)
    setToBtcAddress(null)
    setTokenTab("all")
    setApprovalCounter(0)
  }, [])

  // -- Async data hooks --
  const safeTokensLoadable = useSafeTokens()
  const safeTokensData = useMemo(
    () => (safeTokensLoadable.state === "hasData" ? safeTokensLoadable.data : new Set<string>()),
    [safeTokensLoadable]
  )
  const { fromAssetsLoadable, toAssetsLoadable } = useSwapAssets(
    fromAsset,
    tokenTab,
    t,
    safeTokensData
  )

  const {
    quotesLoadable,
    sortedQuotesLoadable,
    selectedQuoteLoadable,
    selectedModuleLoadable,
    toAmountLoadable,
  } = useSwapQuotes({
    fromAsset,
    toAsset,
    fromAmount,
    fromAddress,
    toAddress,
    selectedProtocol,
    selectedSubProtocol,
    quoteSorting,
    quoteRefresher,
  })

  // -- Side-effect hooks --
  const { ethAccounts, substrateAccounts, fromEvmAccount, fromSubstrateAccount } = useFromAccount(
    fromEvmAddress,
    setFromEvmAddress,
    fromSubstrateAddress,
    setFromSubstrateAddress
  )

  useSetToAddress(
    fromAddress,
    toAsset,
    toEvmAddress,
    setToEvmAddress,
    toSubstrateAddress,
    setToSubstrateAddress,
    toBtcAddress,
    setToBtcAddress
  )

  const reverse = useReverse(
    fromAsset,
    setFromAsset,
    toAsset,
    setToAsset,
    setFromAmount,
    toAmountLoadable
  )

  // Extract selected module/quote data for approval hook
  const selectedModuleData =
    selectedModuleLoadable.state === "hasData" ? selectedModuleLoadable.data : undefined
  const selectedQuoteData =
    selectedQuoteLoadable.state === "hasData" ? selectedQuoteLoadable.data : null

  const erc20Approval = useSwapErc20Approval({
    selectedModule: selectedModuleData,
    fromAsset,
    toAsset,
    fromAmount,
    fromAddress,
    toAddress,
    selectedSubProtocol,
    selectedQuote: selectedQuoteData,
    approvalCounter,
  })

  return useMemo(
    () => ({
      // View
      swapView,
      setSwapView,

      // Form state
      fromAsset,
      setFromAsset,
      toAsset,
      setToAsset,
      fromAmount,
      setFromAmount,
      selectedProtocol,
      setSelectedProtocol,
      selectedSubProtocol,
      setSelectedSubProtocol,
      quoteSorting,
      setQuoteSorting,

      // Addresses
      fromEvmAddress,
      setFromEvmAddress,
      fromSubstrateAddress,
      setFromSubstrateAddress,
      toEvmAddress,
      setToEvmAddress,
      toSubstrateAddress,
      setToSubstrateAddress,
      toBtcAddress,
      setToBtcAddress,
      fromAddress,
      toAddress,

      // Token tab
      tokenTab,
      setTokenTab,

      // Actions
      resetForm,
      refreshQuotes,
      reverse,
      approvalCounter,
      setApprovalCounter,
      incrementApprovalCounter,

      // Async state
      fromAssetsLoadable,
      toAssetsLoadable,
      quotesLoadable,
      sortedQuotesLoadable,
      selectedQuoteLoadable,
      selectedModuleLoadable,
      toAmountLoadable,
      safeTokensLoadable,

      // Account info
      ethAccounts,
      substrateAccounts,
      fromEvmAccount,
      fromSubstrateAccount,

      // ERC20 approval
      erc20Approval,

      // Init args
      stateInit,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      swapView,
      fromAsset,
      toAsset,
      fromAmount,
      selectedProtocol,
      selectedSubProtocol,
      quoteSorting,
      fromEvmAddress,
      fromSubstrateAddress,
      toEvmAddress,
      toSubstrateAddress,
      toBtcAddress,
      fromAddress,
      toAddress,
      tokenTab,
      resetForm,
      refreshQuotes,
      reverse,
      approvalCounter,
      incrementApprovalCounter,
      fromAssetsLoadable,
      toAssetsLoadable,
      quotesLoadable,
      sortedQuotesLoadable,
      selectedQuoteLoadable,
      selectedModuleLoadable,
      toAmountLoadable,
      safeTokensLoadable,
      ethAccounts,
      substrateAccounts,
      fromEvmAccount,
      fromSubstrateAccount,
      erc20Approval,
      stateInit,
    ]
  )
}

export const [SwapProvider, useSwap] = provideContext(useSwapProviderContext)
