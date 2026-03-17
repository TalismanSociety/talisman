import { AlertCircleIcon, ChevronRightIcon } from "@talismn/icons"
import { useToken } from "@ui/state/chaindata"
import { memo, Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useSwap } from "../SwapProvider"
import type { BaseQuote } from "../swap-modules/common.swap-module"
import { formatSwapExchangeRate } from "../swap-utils"
import { SwapProviderPickerModal } from "./SwapProviderPickerModal"

export const SwapProviderPickerButton = () => {
  const { fromTokenId, toTokenId, fromAmount } = useSwap()

  if (!fromTokenId || !toTokenId || !fromAmount) return null

  return (
    <Suspense fallback={<LoadingUI />}>
      <Details />
    </Suspense>
  )
}

const Details = () => {
  const { t } = useTranslation()
  const [isModalOpen, setIsModalOpen] = useState(false)

  const {
    sortedQuotes,
    isLoadingQuotes,
    hasQuoteError,
    isAllQuotesSettled,
    isQuoteDataCurrent,
    quoteErrorMessages,
    selectedProtocol,
    setSelectedProtocol,
    selectedSubProtocol,
    setSelectedSubProtocol,
  } = useSwap()

  const openModal = useCallback(() => setIsModalOpen(true), [])
  const closeModal = useCallback(() => setIsModalOpen(false), [])

  useEffect(() => {
    // When inputs change (amount, tokens, etc.), clear selection so we
    // re-pick the best provider once all new quotes arrive.
    if (!isQuoteDataCurrent) {
      if (selectedProtocol !== null) {
        setSelectedProtocol(null)
        setSelectedSubProtocol(undefined)
      }
      return
    }

    // Wait for ALL providers to respond before auto-selecting
    if (!isAllQuotesSettled) return

    // When a protocol is already selected, only clear it if no longer available
    if (selectedProtocol !== null) {
      const isAvailable = sortedQuotes.some(
        ({ quote }) =>
          quote.protocol === selectedProtocol &&
          (quote.subProtocol ? quote.subProtocol === selectedSubProtocol : true)
      )
      if (!isAvailable) {
        setSelectedProtocol(null)
        setSelectedSubProtocol(undefined)
      }
      return
    }

    // Auto-select the best quote once all providers have settled
    if (sortedQuotes.length > 0) {
      const defaultQuote = sortedQuotes[0]
      setSelectedProtocol(defaultQuote.quote.protocol)
      setSelectedSubProtocol(defaultQuote.quote.subProtocol)
    }
  }, [
    isQuoteDataCurrent,
    isAllQuotesSettled,
    selectedProtocol,
    selectedSubProtocol,
    setSelectedProtocol,
    setSelectedSubProtocol,
    sortedQuotes,
  ])

  const { displayQuote, isBestRate } = useMemo(() => {
    if (sortedQuotes.length === 0) return { displayQuote: null, isBestRate: false }
    const selectedIdx = sortedQuotes.findIndex(
      ({ quote }) =>
        selectedProtocol === quote.protocol &&
        (quote.subProtocol ? quote.subProtocol === selectedSubProtocol : true)
    )
    const idx = selectedIdx >= 0 ? selectedIdx : 0
    return { displayQuote: sortedQuotes[idx], isBestRate: idx === 0 }
  }, [sortedQuotes, selectedProtocol, selectedSubProtocol])

  // Extract the lowest provider minimum from error messages (e.g. "SimpleSwap minimum is 0.001 BTC")
  const minimumHint = useMemo(() => {
    let lowest: { amount: number; display: string; symbol: string } | null = null
    for (const msg of quoteErrorMessages) {
      const match = msg.match(/minimum is (\S+) (\S+)/)
      if (!match) continue
      const amount = Number(match[1])
      if (Number.isNaN(amount)) continue
      if (!lowest || amount < lowest.amount) {
        lowest = { amount, display: match[1], symbol: match[2] }
      }
    }
    return lowest
  }, [quoteErrorMessages])

  // Show shimmer when inputs changed and new quotes are still loading
  if (!isQuoteDataCurrent) return <LoadingUI />

  if (hasQuoteError && sortedQuotes.length === 0) {
    return (
      <SwapProviderError
        message={
          minimumHint
            ? t("No route found. Try at least {{amount}} {{symbol}}.", minimumHint)
            : t("No route found for this pair.")
        }
      />
    )
  }
  if (sortedQuotes.length === 0 && isAllQuotesSettled) {
    if (minimumHint)
      return (
        <SwapProviderError
          message={t("No route found. Try at least {{amount}} {{symbol}}.", minimumHint)}
        />
      )
    return <SwapProviderError message={t("No route found for this pair.")} />
  }

  if (sortedQuotes.length === 0 && isLoadingQuotes) return <LoadingUI />

  if (!displayQuote) return null

  return (
    <div className="flex w-full flex-col gap-[8px]">
      <div className="text-body-secondary text-sm">{t("Provider")}</div>
      <SwapProviderButton
        quote={displayQuote.quote}
        showBestRate={isBestRate}
        onClick={openModal}
      />
      <SwapProviderPickerModal isOpen={isModalOpen} onClose={closeModal} />
    </div>
  )
}

const LoadingUI = () => {
  const { t } = useTranslation()
  return (
    <div className="flex w-full flex-col gap-[8px]">
      <span className="text-body-secondary text-sm">{t("Provider")}</span>
      <SwapProviderButtonSkeleton />
    </div>
  )
}

const SwapProviderButton = memo(
  ({
    quote,
    showBestRate,
    onClick,
  }: {
    quote: BaseQuote
    showBestRate?: boolean
    onClick?: () => void
  }) => {
    const { t } = useTranslation()

    const { toTokenId, fromTokenId, fromAmount } = useSwap()

    const fromToken = useToken(fromTokenId ?? undefined)
    const toToken = useToken(toTokenId ?? undefined)

    const exchangeRate = useMemo(() => {
      if (!fromAmount || !fromToken || !toToken) return undefined
      return formatSwapExchangeRate({
        fromAmount,
        fromDecimals: fromToken.decimals,
        fromSymbol: fromToken.symbol,
        toDecimals: toToken.decimals,
        toSymbol: toToken.symbol,
        outputAmountBN: quote.outputAmountBN,
      })
    }, [fromAmount, fromToken, toToken, quote.outputAmountBN])

    if (!toToken) return null

    return (
      <button
        type="button"
        aria-haspopup="dialog"
        className="flex h-[64px] w-full items-center gap-[8px] rounded-[13px] bg-grey-900 px-[12px] transition-colors hover:bg-grey-800"
        onClick={onClick}
      >
        <img
          src={quote.providerLogo}
          alt=""
          className="h-[32px] w-[32px] shrink-0 rounded-[20px]"
        />
        <div className="flex flex-1 flex-col items-start gap-[2px] overflow-hidden">
          <span className="truncate font-semibold text-[14px] text-white">
            {quote.providerName}
          </span>
          <span className="truncate text-[12px] text-body-secondary">{exchangeRate}</span>
        </div>
        {showBestRate && (
          <div className="shrink-0 whitespace-nowrap rounded-full bg-primary/10 px-4 py-2 text-primary text-xs">
            {t("Best Rate")}
          </div>
        )}
        <ChevronRightIcon className="h-[20px] w-[20px] shrink-0 text-body-secondary" />
      </button>
    )
  }
)

const SwapProviderButtonSkeleton = () => {
  return (
    <div className="flex h-[64px] w-full items-center gap-[8px] rounded-[13px] bg-grey-900 px-[12px]">
      <div className="h-[32px] w-[32px] shrink-0 animate-pulse rounded-[20px] bg-black-tertiary" />
      <div className="flex flex-1 flex-col gap-[4px]">
        <div className="h-[14px] w-[80px] animate-pulse rounded bg-black-tertiary" />
        <div className="h-[12px] w-[120px] animate-pulse rounded bg-black-tertiary" />
      </div>
      <div className="h-[24px] w-[60px] animate-pulse rounded-[24px] bg-black-tertiary" />
    </div>
  )
}

const SwapProviderError = ({ message }: { message?: string }) => {
  return (
    <div className="flex h-[48px] items-center gap-[8px] rounded-[12px] bg-alert-warn/10 px-[12px]">
      <AlertCircleIcon className="h-[24px] w-[24px] shrink-0 text-[#f48f45]" />
      <p className="text-[#f48f45] text-[10px] leading-tight">{message}</p>
    </div>
  )
}
