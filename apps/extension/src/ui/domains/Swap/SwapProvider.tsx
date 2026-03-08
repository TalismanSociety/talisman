import { provideContext } from "@ui/util/provideContext"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useSwapAddresses } from "./hooks/useSwapAddresses"
import { useSwapErc20Approval } from "./hooks/useSwapErc20Approval"
import { useSwapQuoteManager } from "./hooks/useSwapQuoteManager"
import type { SwapInit } from "./hooks/useSwapTokensModal"
import type {
  SupportedSwapProtocol,
  SwappableAssetWithDecimals,
  SwapView,
} from "./swap-modules/common.swap-module"
import { useReverse, useSafeTokens, useSwapAssets } from "./swaps.api"
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

  // -- Unified address state --
  const [fromAddressRaw, setFromAddressRaw] = useState<string | null>(null)
  const [toAddressRaw, setToAddressRaw] = useState<string | null>(null)

  const {
    fromAddress,
    toAddress,
    setFromAddress,
    setToAddress,
    ethAccounts,
    substrateAccounts,
    fromEvmAccount,
    fromSubstrateAccount,
  } = useSwapAddresses({
    fromAddress: fromAddressRaw,
    setFromAddress: setFromAddressRaw,
    toAddress: toAddressRaw,
    setToAddress: setToAddressRaw,
    toAsset,
  })

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
    setFromAddressRaw(null)
    setToAddressRaw(null)
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
  } = useSwapQuoteManager({
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

      // Addresses (unified)
      fromAddress,
      toAddress,
      setFromAddress,
      setToAddress,

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
      fromAddress,
      toAddress,
      setFromAddress,
      setToAddress,
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
