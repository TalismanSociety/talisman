import { LoaderIcon } from "@talismn/icons"
import { type ReactNode, Suspense, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useSwap } from "../SwapProvider"
import { SwapDetailsCard } from "./SwapDetailsCard"
import { SwapDetailsCardSkeleton } from "./SwapDetailsCardSkeleton"
import { SwapDetailsContainer } from "./SwapDetailsContainer"
import { SwapDetailsError } from "./SwapDetailsError"

export const SwapDetails = () => {
  const { fromAsset, toAsset, fromAmount } = useSwap()

  if (!fromAsset || !toAsset || !fromAmount) return null

  return (
    // Details component handles its own error already. This is just in case there is an unhandled error
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

  if (hasQuoteError && sortedQuotes.length === 0) {
    return (
      <SwapDetailsContainer>
        <SwapDetailsError
          messageClassName="whitespace-pre-wrap text-[12px] leading-6 mt-4"
          message={"No route found. Try larger amount."}
        />
      </SwapDetailsContainer>
    )
  }
  if (sortedQuotes.length === 0 && isAllQuotesSettled)
    return (
      <SwapDetailsContainer>
        <SwapDetailsError message={t("Pair is unavailable.")} />
      </SwapDetailsContainer>
    )

  if (sortedQuotes.length === 0 && isLoadingQuotes) return <SwapDetailsCardSkeleton />

  return (
    <div className="flex w-full flex-col gap-4">
      {sortedQuotes.map(({ quote }, index) => (
        <SwapDetailsCard
          key={`${quote.protocol}${quote.subProtocol}`}
          quote={quote}
          selected={
            selectedProtocol === null
              ? index === 0
              : selectedProtocol === quote.protocol &&
                (quote.subProtocol ? quote.subProtocol === selectedSubProtocol : true)
          }
        />
      ))}
    </div>
  )
}

const LoadingUI = ({ title, description }: { title?: string; description?: ReactNode }) => (
  <SwapDetailsContainer>
    <div className="flex flex-col items-center justify-center gap-4 rounded-sm border border-grey-800 p-8">
      <div className="flex h-[94px] w-[94px] items-center justify-center">
        <LoaderIcon className="animate-spin-slow" />
      </div>
      <div>
        <h4 className="text-center font-bold text-sm">{title}</h4>
        <p className="text-center text-body-secondary text-sm">{description}</p>
      </div>
    </div>
  </SwapDetailsContainer>
)
