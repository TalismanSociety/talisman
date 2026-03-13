import { useTranslation } from "react-i18next"

import { useSwap } from "../SwapProvider"

export const QuoteProvider = () => {
  const { t } = useTranslation()
  const { selectedQuote } = useSwap()

  const isLoading = !selectedQuote

  return (
    <div className="flex h-11 items-center justify-between">
      <div className="text-body-secondary text-xs">{t("Provider")}</div>

      <div className="flex items-center justify-end gap-4">
        {isLoading ? (
          <>
            <div className="mb-1 h-10 w-10 animate-pulse rounded-full bg-body-disabled" />
            <p className="max-w-60 animate-pulse truncate rounded-xs bg-body-disabled font-semibold text-body-disabled text-xs">
              SwapProvider
            </p>
          </>
        ) : (
          <>
            <img
              src={selectedQuote.providerLogo || undefined}
              alt=""
              className="mb-1 h-10 rounded-full"
            />
            <p className="max-w-60 truncate font-semibold text-body-secondary text-xs">
              {selectedQuote.providerName}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
