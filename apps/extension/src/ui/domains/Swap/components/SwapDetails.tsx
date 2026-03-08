import { LoaderIcon } from "@talismn/icons"
import type { Loadable } from "jotai/vanilla/utils/loadable"
import { type ReactNode, Suspense, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { useSwap } from "../SwapProvider"
import type { BaseQuote } from "../swap-modules/common.swap-module"
import { SwapDetailsCard } from "./SwapDetailsCard"
import { SwapDetailsCardSkeleton } from "./SwapDetailsCardSkeleton"
import { SwapDetailsContainer } from "./SwapDetailsContainer"
import { SwapDetailsError } from "./SwapDetailsError"

export const SwapDetails = () => {
  const { fromAsset, toAsset, fromAmount } = useSwap()

  if (!fromAsset || !toAsset || !fromAmount.planck) return null

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
    sortedQuotesLoadable: quotes,
    selectedProtocol,
    setSelectedProtocol,
    selectedSubProtocol,
    setSelectedSubProtocol,
    fromAmount,
    fromAsset,
    toAsset,
  } = useSwap()
  const [cachedQuotes, setCachedQuotes] = useState<
    { fees?: number; quote: Loadable<BaseQuote | null> }[]
  >([])

  // Reset cached quotes when any of the swap parameters change
  // biome-ignore lint/correctness/useExhaustiveDependencies: legacy
  useEffect(() => {
    setCachedQuotes([])
  }, [fromAmount, fromAsset, toAsset])

  // Update cached quotes when quotes change
  useEffect(() => {
    if (quotes.state === "hasData" && quotes.data) {
      const allQuotesLoaded = quotes.data.every(({ quote }) => quote.state !== "loading")
      setCachedQuotes((prev) => (prev.length === 0 || allQuotesLoaded ? quotes.data! : prev))
    }
  }, [quotes])

  // biome-ignore lint/correctness/useExhaustiveDependencies: legacy
  useEffect(() => {
    // Reset protocol selection if no valid protocol found in cached quotes
    const isSelectedProtocolAvailable = !cachedQuotes.find(
      ({ quote }) => quote.state === "hasData" && quote.data?.protocol === selectedProtocol
    )
    if (isSelectedProtocolAvailable) {
      setSelectedProtocol(null)
      setSelectedSubProtocol(undefined)
    }

    // Select default subprotocol if nothing is selected and the first quote has a subprotocol
    if ((!selectedSubProtocol || !selectedProtocol) && cachedQuotes.length > 0) {
      const defaultQuote = cachedQuotes[0]
      if (defaultQuote?.quote.state === "hasData" && defaultQuote.quote.data?.subProtocol)
        setSelectedSubProtocol(defaultQuote.quote.data?.subProtocol)
    }
  }, [
    selectedProtocol,
    setSelectedProtocol,
    quotes,
    cachedQuotes,
    setSelectedSubProtocol,
    selectedSubProtocol,
  ])

  if (
    quotes.state === "hasError" ||
    cachedQuotes.every(({ quote }) => quote?.state === "hasError")
  ) {
    const cachedQuoteError = cachedQuotes
      .flatMap((cachedQuote) =>
        // biome-ignore lint/suspicious/noExplicitAny: legacy
        cachedQuote.quote?.state === "hasError" ? (cachedQuote.quote?.error as any)?.message : []
      )
      .join("\n")
    return (
      <SwapDetailsContainer>
        <SwapDetailsError
          messageClassName="whitespace-pre-wrap text-[12px] leading-6 mt-4"
          message={
            // biome-ignore lint/suspicious/noExplicitAny: legacy
            (quotes.state === "hasError" ? (quotes.error as any) : {})?.message ??
            cachedQuoteError ??
            "No route found. Try larger amount."
          }
        />
      </SwapDetailsContainer>
    )
  }
  if (quotes.state === "hasData" && quotes.data?.length === 0)
    return (
      <SwapDetailsContainer>
        <SwapDetailsError message={t("Pair is unavailable.")} />
      </SwapDetailsContainer>
    )

  if (cachedQuotes.length <= 0) return <SwapDetailsCardSkeleton />

  return (
    <div className="flex w-full flex-col gap-4">
      {cachedQuotes.map(({ quote }, index) =>
        quote.state === "hasData" && quote.data ? (
          <SwapDetailsCard
            key={`${quote.data.protocol}${quote.data.subProtocol}`}
            quote={quote.data}
            selected={
              selectedProtocol === null
                ? index === 0
                : quote.state === "hasData" &&
                  selectedProtocol === quote.data?.protocol &&
                  (quote.data.subProtocol ? quote.data.subProtocol === selectedSubProtocol : true)
            }
          />
        ) : quote.state === "loading" ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: legacy
          <SwapDetailsCardSkeleton key={index} />
        ) : null
      )}
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
