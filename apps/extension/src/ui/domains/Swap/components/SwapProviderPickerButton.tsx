import { AlertCircleIcon, ChevronRightIcon } from "@talismn/icons"
import { planckToTokens } from "@talismn/util"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { useToken } from "@ui/state/chaindata"
import { memo, Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useSwap } from "../SwapProvider"
import type { BaseQuote } from "../swap-modules/common.swap-module"
import { QuoteCountdown } from "./QuoteCountdown"
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
    selectedProtocol,
    setSelectedProtocol,
    selectedSubProtocol,
    setSelectedSubProtocol,
  } = useSwap()

  const openModal = useCallback(() => setIsModalOpen(true), [])
  const closeModal = useCallback(() => setIsModalOpen(false), [])

  useEffect(() => {
    const isSelectedProtocolAvailable = sortedQuotes.some(
      ({ quote }) => quote.protocol === selectedProtocol
    )
    if (!isSelectedProtocolAvailable) {
      setSelectedProtocol(null)
      setSelectedSubProtocol(undefined)
    }
    if ((!selectedSubProtocol || !selectedProtocol) && sortedQuotes.length > 0) {
      const defaultQuote = sortedQuotes[0]
      if (!selectedProtocol) setSelectedProtocol(defaultQuote.quote.protocol)
      if (defaultQuote?.quote.subProtocol) setSelectedSubProtocol(defaultQuote.quote.subProtocol)
    }
  }, [
    selectedProtocol,
    setSelectedProtocol,
    sortedQuotes,
    setSelectedSubProtocol,
    selectedSubProtocol,
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

  if (hasQuoteError && sortedQuotes.length === 0) {
    return <SwapProviderError message={t("No route found. Try larger amount.")} />
  }
  if (sortedQuotes.length === 0 && isAllQuotesSettled)
    return <SwapProviderError message={t("Pair is unavailable.")} />

  if (sortedQuotes.length === 0 && isLoadingQuotes)
    return (
      <>
        <LoadingUI />
        <span className="sr-only" aria-live="polite">
          {t("Loading quotes...")}
        </span>
      </>
    )

  if (!displayQuote) return null

  return (
    <div className="flex w-full flex-col gap-[8px]">
      <span className="sr-only" aria-live="polite">
        {isLoadingQuotes
          ? t("Loading quotes...")
          : t("{{count}} quotes found", { count: sortedQuotes.length })}
      </span>
      <div className="flex items-center justify-between">
        <span className="font-semibold text-[14px] text-white/60">{t("Provider")}</span>
        <QuoteCountdown isLoading={isLoadingQuotes} />
      </div>
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
      <span className="font-semibold text-[14px] text-white/60">{t("Provider")}</span>
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

    const amount = quote.outputAmountBN

    const toQuote = useMemo(() => {
      if (!amount || !fromAmount || !toToken || !fromToken) return undefined
      const toNum = Number(planckToTokens(amount.toString(), toToken.decimals) ?? "0")
      const fromNum = Number(planckToTokens(fromAmount.toString(), fromToken.decimals) ?? "1")
      const res = toNum / (fromNum || 1)
      if (res < 0.0001) return "0"
      return res.toString()
    }, [fromAmount, fromToken, amount, toToken])

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
          <span className="truncate text-[12px] text-body-secondary">
            1 {fromToken?.symbol} = <Tokens amount={toQuote} symbol={toToken?.symbol} noCountUp />
          </span>
        </div>
        {showBestRate && (
          <div className="shrink-0 whitespace-nowrap rounded-full bg-primary/10 px-4 py-2 font-semibold text-primary text-xs">
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
