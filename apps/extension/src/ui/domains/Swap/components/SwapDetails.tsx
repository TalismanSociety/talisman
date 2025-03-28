import { LoaderIcon } from "@talismn/icons"
import { useAtom, useAtomValue } from "jotai"
import { loadable } from "jotai/utils"
import { Loadable } from "jotai/vanilla/utils/loadable"
import { Suspense, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import {
  BaseQuote,
  fromAmountAtom,
  fromAssetAtom,
  selectedProtocolAtom,
  selectedSubProtocolAtom,
  toAssetAtom,
} from "../swap-modules/common.swap-module"
import { sortedQuotesAtom } from "../swaps.api"
import { SwapDetailsCard } from "./SwapDetailsCard"
import { SwapDetailsCardSkeleton } from "./SwapDetailsCardSkeleton"
import { SwapDetailsError } from "./SwapDetailsError"

export const SwapDetails: React.FC = () => {
  const fromAsset = useAtomValue(fromAssetAtom)
  const toAsset = useAtomValue(toAssetAtom)
  const fromAmount = useAtomValue(fromAmountAtom)

  if (!fromAsset || !toAsset || !fromAmount.planck) return null

  return (
    <div className="bg-grey-900 flex w-full flex-col gap-4 rounded p-8">
      {/* Details component handles its own error already. This is just in case there is an unhandled error */}
      <Suspense fallback={<LoadingUI />}>
        <Details />
      </Suspense>
    </div>
  )
}

const Details = () => {
  const { t } = useTranslation()
  const quotes = useAtomValue(loadable(sortedQuotesAtom))
  const [selectedProtocol, setSelectedProtocol] = useAtom(selectedProtocolAtom)
  const [selectedSubProtocol, setSelectedSubProtocol] = useAtom(selectedSubProtocolAtom)
  const [cachedQuotes, setCachedQuotes] = useState<
    { fees?: number; quote: Loadable<BaseQuote | null> }[]
  >([])
  const fromAmount = useAtomValue(fromAmountAtom)
  const fromAsset = useAtomValue(fromAssetAtom)
  const toAsset = useAtomValue(toAssetAtom)

  // Reset cached quotes when any of the swap parameters change
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

  useEffect(() => {
    // Reset protocol selection if no valid protocol found in cached quotes
    const isSelectedProtocolAvailable = !cachedQuotes.find(
      ({ quote }) => quote.state === "hasData" && quote.data?.protocol === selectedProtocol,
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
    const cachedQuoteError =
      cachedQuotes[0]?.quote?.state === "hasError" &&
      (cachedQuotes[0]?.quote?.error as any)?.message // eslint-disable-line @typescript-eslint/no-explicit-any
    return (
      <SwapDetailsError
        message={
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (quotes.state === "hasError" ? (quotes.error as any) : {})?.message ??
          cachedQuoteError ??
          "No route found. Try larger amount."
        }
      />
    )
  }
  if (quotes.state === "hasData" && quotes.data?.length === 0)
    return <SwapDetailsError message={t("Pair is unavailable.")} />

  if (cachedQuotes.length <= 0) return <SwapDetailsCardSkeleton />

  return cachedQuotes.map(({ quote }, index) =>
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
      <SwapDetailsCardSkeleton key={index} />
    ) : null,
  )
}

const LoadingUI: React.FC<{ title?: string; description?: React.ReactNode }> = ({
  title,
  description,
}) => (
  <div className="border-grey-800 flex flex-col items-center justify-center gap-4 rounded-sm border p-8">
    <div className="flex h-[94px] w-[94px] items-center justify-center">
      <LoaderIcon className="animate-spin-slow" />
    </div>
    <div>
      <h4 className="text-center text-sm font-bold">{title}</h4>
      <p className="text-body-secondary text-center text-sm">{description}</p>
    </div>
  </div>
)
