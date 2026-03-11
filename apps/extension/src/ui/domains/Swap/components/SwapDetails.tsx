import { LoaderIcon } from "@talismn/icons"
import { type ReactNode, Suspense, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useSwap } from "../SwapProvider"
import { SwapDetailsCard } from "./SwapDetailsCard"
import { SwapDetailsCardSkeleton } from "./SwapDetailsCardSkeleton"
import { SwapDetailsError } from "./SwapDetailsError"

export const SwapDetails = () => {
  const { fromAsset, toAsset, fromAmount } = useSwap()

  if (!fromAsset || !toAsset || !fromAmount) return null

  return (
    <Suspense fallback={<LoadingUI />}>
      <Details />
    </Suspense>
  )
}

const Details = () => {
  const { t } = useTranslation()
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
    return <SwapDetailsError message={"No route found. Try larger amount."} />
  }
  if (sortedQuotes.length === 0 && isAllQuotesSettled)
    return <SwapDetailsError message={t("Pair is unavailable.")} />

  if (sortedQuotes.length === 0 && isLoadingQuotes)
    return (
      <div className="flex w-full flex-col gap-[8px]">
        <span className="font-semibold text-[14px] text-white/60">{t("Provider")}</span>
        <SwapDetailsCardSkeleton />
      </div>
    )

  if (!displayQuote) return null

  return (
    <div className="flex w-full flex-col gap-[8px]">
      <span className="font-semibold text-[14px] text-white/60">{t("Provider")}</span>
      <SwapDetailsCard quote={displayQuote.quote} showBestRate={isBestRate} />
    </div>
  )
}

const LoadingUI = ({ title, description }: { title?: string; description?: ReactNode }) => (
  <div className="flex w-full flex-col gap-[8px]">
    <div className="flex flex-col items-center justify-center gap-4 rounded-[12px] bg-grey-900 p-8">
      <div className="flex h-[48px] w-[48px] items-center justify-center">
        <LoaderIcon className="animate-spin-slow" />
      </div>
      <div>
        <h4 className="text-center font-bold text-sm">{title}</h4>
        <p className="text-center text-body-secondary text-sm">{description}</p>
      </div>
    </div>
  </div>
)
