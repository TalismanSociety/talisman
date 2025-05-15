import { useTranslation } from "react-i18next"

export const SwapDetailsCardSkeleton = () => {
  const { t } = useTranslation()

  return (
    <div>
      <div className="flex w-full items-center justify-between">
        <div className="bg-black-tertiary h-[1.2em] animate-pulse select-none rounded-sm text-transparent">
          {t("Provider")}
        </div>
        <div className="flex items-center justify-end gap-4">
          <div className="bg-black-tertiary mb-1 h-10 w-10 animate-pulse rounded-full" />
          <p className="bg-black-tertiary h-10 max-w-60 animate-pulse select-none truncate rounded-sm text-xs font-semibold text-transparent">
            SimpleSwap
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-4 border-t border-t-[#3f3f3f] pt-4 text-sm">
        <div className="flex items-center gap-4">
          <div className="bg-black-tertiary h-[1em] w-80 animate-pulse rounded-sm" />
          <div className="text-muted-foreground bg-black-tertiary h-[1em] w-44 animate-pulse rounded-sm" />
        </div>

        <div className="bg-black-tertiary ml-auto flex h-[1em] w-20 animate-pulse items-center gap-2 rounded-sm" />
      </div>
    </div>
  )
}
