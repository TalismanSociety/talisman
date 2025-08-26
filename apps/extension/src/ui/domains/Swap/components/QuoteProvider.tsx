import { useAtomValue } from "jotai"
import { loadable } from "jotai/utils"
import { useTranslation } from "react-i18next"

import { selectedQuoteAtom } from "../swaps.api"

export const QuoteProvider = () => {
  const { t } = useTranslation()
  const quote = useAtomValue(loadable(selectedQuoteAtom))

  const isLoading =
    quote.state !== "hasData" ||
    !quote.data ||
    quote.data.quote.state !== "hasData" ||
    !quote.data.quote.data

  return (
    <div className="flex items-center justify-between">
      <div className="text-body-secondary text-xs">{t("Provider")}</div>

      <div className="flex items-center justify-end gap-4">
        {isLoading ? (
          <>
            <div className="bg-body-disabled mb-1 h-10 w-10 animate-pulse rounded-full" />
            <p className="text-body-disabled bg-body-disabled rounded-xs max-w-60 animate-pulse truncate text-xs font-semibold">
              SwapProvider
            </p>
          </>
        ) : (
          <>
            <img
              src={
                (quote.state === "hasData" &&
                  quote.data &&
                  quote.data.quote.state === "hasData" &&
                  quote.data.quote.data &&
                  quote.data.quote.data.providerLogo) ||
                undefined
              }
              alt=""
              className="mb-1 h-10 rounded-full"
            />
            <p className="text-body-secondary max-w-60 truncate text-xs font-semibold">
              {quote.state === "hasData" &&
                quote.data &&
                quote.data.quote.state === "hasData" &&
                quote.data.quote.data &&
                quote.data.quote.data.providerName}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
