import type { WalletTransactionInfo } from "@core/domains/transactions/types"
import { useBalanceByParams } from "@ui/hooks/useBalancesByParams"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useSwapAddresses } from "./hooks/useSwapAddresses"
import { useSwapErc20Approval } from "./hooks/useSwapErc20Approval"
import { useSwapQuoteManager } from "./hooks/useSwapQuoteManager"
import type { SwapInit } from "./hooks/useSwapTokensModal"
import type { SupportedSwapProtocol, SwapView } from "./swap-modules/common.swap-module"
import { useReverse, useSafeTokens, useSwapAssets } from "./swaps.api"

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
    fromTokenId,
    toTokenId,
  })

  // -- Token tab --
  const [tokenTab, setTokenTab] = useState("all")

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

  const resetForm = useCallback(() => {
    setSwapView("form")
    setFromTokenId(null)
    setToTokenId(null)
    setFromAmount(null)
    setSelectedProtocol(null)
    setSelectedSubProtocol(undefined)
    setQuoteSorting("bestRate")
    setFromAddressRaw(null)
    setToAddressRaw(null)
    setTokenTab("all")
    setApprovalCounter(0)
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
  } = useSwapAssets(fromTokenId, tokenTab, t, safeTokens)

  // Merge from+to support maps for quote manager routing
  const combinedSupportMap = useMemo(() => {
    if (!fromSupportMap && !toSupportMap) return null
    const merged = new Map<string, Set<SupportedSwapProtocol>>()
    for (const map of [fromSupportMap, toSupportMap]) {
      if (!map) continue
      for (const [tokenId, protocols] of map) {
        const existing = merged.get(tokenId)
        if (existing) {
          for (const p of protocols) existing.add(p)
        } else {
          merged.set(tokenId, new Set(protocols))
        }
      }
    }
    return merged
  }, [fromSupportMap, toSupportMap])

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
    fromTokenId,
    toTokenId,
    supportMap: combinedSupportMap,
    fromAmount,
    fromAddress,
    toAddress,
    selectedProtocol,
    selectedSubProtocol,
    quoteSorting,
  })

  // True when stateInit requests token pre-selection but assets haven't loaded yet
  const isInitializing = Boolean(
    (stateInit?.fromTokenId && !fromTokenId && !fromAssetIds) ||
      (stateInit?.toTokenId && !toTokenId && !toAssetIds)
  )

  const reverse = useReverse(
    fromTokenId,
    setFromTokenId,
    toTokenId,
    setToTokenId,
    setFromAmount,
    toAmount
  )

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

  return {
    // View
    swapView,
    setSwapView,

    // Form state
    fromTokenId,
    setFromTokenId,
    toTokenId,
    setToTokenId,
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
    gotoSubmitted,

    // Submitted swap state
    submittedTxHash,
    submittedNetworkId,
    submittedTxInfo,

    // Async state
    fromAssetIds,
    toAssetIds,
    fromSupportMap,
    toSupportMap,
    safeTokens,
    isLoadingFromAssets,
    isLoadingToAssets,

    // Quote state
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

    // Balance
    fromBalance,
    toBalance,

    // Loading state
    isInitializing,

    // Init args
    stateInit,
  }
}
