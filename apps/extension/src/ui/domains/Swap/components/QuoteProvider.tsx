import { useTranslation } from "react-i18next"

import { useSwap } from "../SwapProvider"

export const QuoteProvider = () => {
  const { t } = useTranslation()
  const { selectedQuote } = useSwap()

  const isLoading = !selectedQuote

  return (
    <div className="flex h-11 w-full items-center justify-between gap-8 overflow-hidden">
      <div className="text-body-secondary text-xs">{t("Provider")}</div>

      <div className="flex grow items-center justify-end gap-4 overflow-hidden">
        {isLoading ? (
          <>
            <div className="mb-1 h-10 w-10 animate-pulse rounded-full bg-body-disabled" />
            <p className="animate-pulse truncate rounded-xs bg-body-disabled font-semibold text-body-disabled text-xs">
              SwapProvider
            </p>
          </>
        ) : (
          <>
            <img
              src={selectedQuote.providerLogo || undefined}
              alt=""
              className="mb-1 size-10 shrink-0 rounded-full"
            />
            <p className="truncate font-semibold text-body-secondary text-xs">
              {selectedQuote.providerName}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
