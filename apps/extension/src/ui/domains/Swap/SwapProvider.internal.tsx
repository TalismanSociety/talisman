import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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

const EMPTY_SAFE_TOKENS = new Set<string>()

type SwapProviderProps = {
  stateInit: SwapInit | null
}

export const useSwapContextProvider = ({ stateInit }: SwapProviderProps) => {
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
    resetFromAddressManuallySet,
  } = useSwapAddresses({
    fromAddress: fromAddressRaw,
    setFromAddress: setFromAddressRaw,
    toAddress: toAddressRaw,
    setToAddress: setToAddressRaw,
    fromAsset,
    toAsset,
  })

  // -- Token tab --
  const [tokenTab, setTokenTab] = useState("all")

  // -- Actions --
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
    resetFromAddressManuallySet()
  }, [resetFromAddressManuallySet])

  // -- Async data hooks --
  const { data: safeTokens = EMPTY_SAFE_TOKENS } = useSafeTokens()
  const { fromAssets, toAssets } = useSwapAssets(fromAsset, tokenTab, t, safeTokens)

  // -- Initialize form from stateInit (one-shot per mount) --
  const fromInitDone = useRef(false)
  const toInitDone = useRef(false)

  useEffect(() => {
    if (!stateInit?.fromTokenId || fromInitDone.current) return
    if (!fromAssets?.length) return

    const match = fromAssets.find((a) => a.id === stateInit.fromTokenId)
    if (match) {
      setFromAsset(match)
      fromInitDone.current = true
    }
  }, [stateInit?.fromTokenId, fromAssets])

  useEffect(() => {
    if (!stateInit?.toTokenId || toInitDone.current) return
    if (!toAssets?.length) return

    const match = toAssets.find((a) => a.id === stateInit.toTokenId)
    if (match) {
      setToAsset(match)
      toInitDone.current = true
    }
  }, [stateInit?.toTokenId, toAssets])

  useEffect(() => {
    if (!stateInit?.fromAddress) return
    setFromAddressRaw(stateInit.fromAddress)
  }, [stateInit?.fromAddress])

  const {
    isLoadingQuotes,
    isAllQuotesSettled,
    hasQuoteError,
    sortedQuotes,
    selectedQuote,
    selectedQuoteFees,
    selectedModule,
    toAmount,
  } = useSwapQuoteManager({
    fromAsset,
    toAsset,
    fromAmount,
    fromAddress,
    toAddress,
    selectedProtocol,
    selectedSubProtocol,
    quoteSorting,
  })

  // True when stateInit requests token pre-selection but assets haven't loaded yet
  const isInitializing = Boolean(
    (stateInit?.fromTokenId && !fromAsset && !fromAssets) ||
      (stateInit?.toTokenId && !toAsset && !toAssets)
  )

  const reverse = useReverse(fromAsset, setFromAsset, toAsset, setToAsset, setFromAmount, toAmount)

  const erc20Approval = useSwapErc20Approval({
    selectedModule,
    fromAsset,
    toAsset,
    fromAmount,
    fromAddress,
    toAddress,
    selectedSubProtocol,
    selectedQuote,
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
      reverse,
      approvalCounter,
      setApprovalCounter,
      incrementApprovalCounter,

      // Async state
      fromAssets,
      toAssets,
      safeTokens,

      // Quote state (new shape)
      isLoadingQuotes,
      isAllQuotesSettled,
      hasQuoteError,
      sortedQuotes,
      selectedQuote,
      selectedQuoteFees,
      selectedModule,
      toAmount,

      // Account info
      ethAccounts,
      substrateAccounts,
      fromEvmAccount,
      fromSubstrateAccount,

      // ERC20 approval
      erc20Approval,

      // Loading state
      isInitializing,

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
      reverse,
      approvalCounter,
      incrementApprovalCounter,
      fromAssets,
      toAssets,
      safeTokens,
      isLoadingQuotes,
      isAllQuotesSettled,
      hasQuoteError,
      sortedQuotes,
      selectedQuote,
      selectedQuoteFees,
      selectedModule,
      toAmount,
      ethAccounts,
      substrateAccounts,
      fromEvmAccount,
      fromSubstrateAccount,
      erc20Approval,
      isInitializing,
      stateInit,
    ]
  )
}
