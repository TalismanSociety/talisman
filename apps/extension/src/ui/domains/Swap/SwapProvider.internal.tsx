import type { WalletTransactionInfo } from "@core/domains/transactions/types"
import { isTokenInTypes } from "@talismn/chaindata-provider"
import { useBalanceByParams } from "@ui/hooks/useBalancesByParams"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSwapAddresses } from "./hooks/useSwapAddresses"
import { useSwapErc20Approval } from "./hooks/useSwapErc20Approval"
import { useSwapLifiSlippage } from "./hooks/useSwapLifiSlippage"
import { useSwapQuoteManager } from "./hooks/useSwapQuoteManager"
import type { SwapInit } from "./hooks/useSwapTokensModal"
import type { SupportedSwapProtocol, SwapView } from "./swap-modules/common.swap-module"
import { useReverse, useSafeTokens, useSwapAssets } from "./swaps.api"

const EMPTY_SAFE_TOKENS = new Set<string>()
const NATIVE_TOKEN_TYPES: Array<"evm-native" | "substrate-native" | "sol-native"> = [
  "evm-native",
  "substrate-native",
  "sol-native",
]

type SwapProviderProps = {
  stateInit: SwapInit | null
}

export type { SwapView } from "./swap-modules/common.swap-module"

export const useSwapContextProvider = ({ stateInit }: SwapProviderProps) => {
  // -- View --
  const [swapView, setSwapView] = useState<SwapView>("form")

  // -- Core form state --
  const [fromTokenId, setFromTokenId] = useState<string | null>(null)
  const [toTokenId, setToTokenId] = useState<string | null>(null)
  const [fromAmount, setFromAmount] = useState<bigint | null>(null)
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
    resetFromAddressManuallySet,
    setFromAddressManuallySet,
  } = useSwapAddresses({
    fromAddress: fromAddressRaw,
    setFromAddress: setFromAddressRaw,
    toAddress: toAddressRaw,
    setToAddress: setToAddressRaw,
    fromTokenId,
    toTokenId,
  })

  // -- Submitted swap state --
  const [submittedTxHash, setSubmittedTxHash] = useState<string | null>(null)
  const [submittedNetworkId, setSubmittedNetworkId] = useState<string | null>(null)
  const [submittedTxInfo, setSubmittedTxInfo] = useState<WalletTransactionInfo | null>(null)

  const gotoSubmitted = useCallback(
    ({
      hash,
      networkId,
      txInfo,
    }: {
      hash: string
      networkId: string
      txInfo: WalletTransactionInfo
    }) => {
      setSubmittedTxHash(hash)
      setSubmittedNetworkId(networkId)
      setSubmittedTxInfo(txInfo)
      setSwapView("submitted")
    },
    []
  )

  // -- Actions --
  const [approvalCounter, setApprovalCounter] = useState(0)
  const incrementApprovalCounter = useCallback(() => setApprovalCounter((c) => c + 1), [])

  // -- Acknowledged unsafe tokens (in-memory only, survives modal open/close) --
  const [acknowledgedTokenIds, setAcknowledgedTokenIds] = useState<Set<string>>(
    () => new Set<string>()
  )
  const acknowledgeToken = useCallback(
    (tokenId: string) => setAcknowledgedTokenIds((prev) => new Set(prev).add(tokenId)),
    []
  )

  const resetForm = useCallback(() => {
    setSwapView("form")
    setFromTokenId(null)
    setToTokenId(null)
    setFromAmount(null)
    setSelectedProtocol(null)
    setSelectedSubProtocol(undefined)
    setQuoteSorting("bestRate")
    setFromAddressRaw(null)
    setApprovalCounter(0)
    setAcknowledgedTokenIds(new Set())
    resetFromAddressManuallySet()
    setSubmittedTxHash(null)
    setSubmittedNetworkId(null)
    setSubmittedTxInfo(null)
  }, [resetFromAddressManuallySet])

  // -- Async data hooks --
  const { data: safeTokens = EMPTY_SAFE_TOKENS } = useSafeTokens()
  const {
    fromAssetIds,
    toAssetIds,
    fromSupportMap,
    toSupportMap,
    isLoadingFromAssets,
    isLoadingToAssets,
  } = useSwapAssets(fromTokenId)

  // -- Initialize form from stateInit (one-shot per mount) --
  const fromInitDone = useRef(false)
  const toInitDone = useRef(false)

  useEffect(() => {
    if (!stateInit?.fromTokenId || fromInitDone.current) return
    if (!fromAssetIds?.length) return

    if (fromAssetIds.includes(stateInit.fromTokenId)) {
      setFromTokenId(stateInit.fromTokenId)
      fromInitDone.current = true
    }
  }, [stateInit?.fromTokenId, fromAssetIds])

  useEffect(() => {
    if (!stateInit?.toTokenId || toInitDone.current) return
    if (!toAssetIds?.length) return

    if (toAssetIds.includes(stateInit.toTokenId)) {
      setToTokenId(stateInit.toTokenId)
      toInitDone.current = true
    }
  }, [stateInit?.toTokenId, toAssetIds])

  useEffect(() => {
    if (!stateInit?.fromAddress) return
    setFromAddressRaw(stateInit.fromAddress)
    setFromAddressManuallySet(true)
  }, [stateInit?.fromAddress, setFromAddressManuallySet])

  const [lifiSlippagePercent] = useSwapLifiSlippage()

  const {
    isLoadingQuotes,
    isQuoteDataCurrent,
    isAllQuotesSettled,
    hasQuoteError,
    quoteErrorMessages,
    sortedQuotes,
    selectedQuote,
    selectedQuoteFees,
    selectedModule,
    toAmount,
  } = useSwapQuoteManager({
    fromTokenId,
    toTokenId,
    fromSupportMap,
    toSupportMap,
    fromAmount,
    fromAddress,
    toAddress,
    selectedProtocol,
    selectedSubProtocol,
    quoteSorting,
    lifiSlippagePercent,
    enabled: swapView !== "submitted",
    freezeQuote: swapView === "confirm",
  })

  // True when stateInit requests token pre-selection but assets haven't loaded yet
  const isInitializing = Boolean(
    (stateInit?.fromTokenId && !fromTokenId && !fromAssetIds) ||
      (stateInit?.toTokenId && !toTokenId && !toAssetIds)
  )

  const reverseRaw = useReverse(
    fromTokenId,
    setFromTokenId,
    toTokenId,
    setToTokenId,
    setFromAmount,
    toAmount
  )

  const reverse = useCallback(() => {
    reverseRaw()
    resetFromAddressManuallySet()
  }, [reverseRaw, resetFromAddressManuallySet])

  const erc20Approval = useSwapErc20Approval({
    selectedModule,
    fromTokenId,
    toTokenId,
    fromAmount,
    fromAddress,
    toAddress,
    selectedSubProtocol,
    selectedQuote,
    approvalCounter,
  })

  // Derive fast balance params from the Token type
  // const fromToken = useToken(fromTokenId ?? undefined)

  const fromBalance = useBalanceByParams({ address: fromAddress, tokenId: fromTokenId })
  const toBalance = useBalanceByParams({ address: toAddress, tokenId: toTokenId })
  const isFromTokenNative = useMemo(
    () => isTokenInTypes(fromBalance?.token, NATIVE_TOKEN_TYPES),
    [fromBalance?.token]
  )

  const onMaxFromAmountClick = useCallback(() => {
    if (isFromTokenNative || !fromBalance?.transferable.planck) return
    setFromAmount(fromBalance.transferable.planck)
  }, [fromBalance, isFromTokenNative])

  return {
    fromTokenId,
    setFromTokenId,
    toTokenId,
    setToTokenId,
    fromAmount,
    setFromAmount,
    onMaxFromAmountClick: isFromTokenNative ? undefined : onMaxFromAmountClick,
    fromAddress,
    setFromAddress,
    toAddress,
    setToAddress,
    selectedProtocol,
    setSelectedProtocol,
    selectedSubProtocol,
    setSelectedSubProtocol,
    quoteSorting,
    setQuoteSorting,
    reverse,
    resetForm,
    fromAssetIds,
    toAssetIds,
    fromSupportMap,
    toSupportMap,
    safeTokens,
    acknowledgedTokenIds,
    acknowledgeToken,
    isLoadingFromAssets,
    isLoadingToAssets,
    fromBalance,
    toBalance,
    isInitializing,
    stateInit,
    approvalCounter,
    setApprovalCounter,
    incrementApprovalCounter,

    sortedQuotes,
    selectedQuote,
    selectedQuoteFees,
    selectedModule,
    isLoadingQuotes,
    isQuoteDataCurrent,
    isAllQuotesSettled,
    hasQuoteError,
    quoteErrorMessages,
    toAmount,
    erc20Approval,

    swapView,
    setSwapView,
    submittedTxHash,
    submittedNetworkId,
    submittedTxInfo,
    gotoSubmitted,
  }
}
