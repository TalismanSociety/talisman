import { XIcon } from "@talismn/icons"
import { cn } from "@talismn/util"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { IconButton } from "talisman-ui"

import { useSeekBenefitsModal } from "@ui/domains/Portfolio/SeekBenefits/SeekBenefitsModal"
import { useAppState, useFeatureFlag } from "@ui/state"

import { ReactComponent as BgIconLarge } from "./seek-benefits-bg-large.svg"
import { ReactComponent as BgIconSmall } from "./seek-benefits-bg-small.svg"

export const SeekBenefitsBanner: FC<{ variant: "small" | "large"; className?: string }> = ({
  variant,
  className,
}) => {
  const { t } = useTranslation()
  const allowBanner = useFeatureFlag("SEEK_BENEFITS")
  const [hideBanner, setHideBanner] = useAppState("hideSeekBenefitsBanner")
  const ocDialog = useSeekBenefitsModal()

  const showBanner = useMemo(() => !!allowBanner && !hideBanner, [allowBanner, hideBanner])

  if (!showBanner) return null

  return (
    <div className={cn("relative w-full", className)}>
      <button
        type="button"
        onClick={ocDialog.open}
        className={cn(
          "relative h-[6.4rem] w-full shrink-0 overflow-hidden rounded-sm p-0.5 text-left text-xs",
          variant === "large" && "h-[6.4rem]",
          variant === "small" && "h-[6rem]",
        )}
      >
        <div className="absolute inset-0 rounded-sm bg-gradient-to-l from-[#606060]/60 to-[#5A6825]" />
        <div className="from-black-secondary relative size-full overflow-hidden rounded-sm bg-gradient-to-b from-30% to-[#3F3F0C]/50 to-[200%]">
          <div
            className={cn(
              "absolute left-0 top-0 z-10 flex size-full flex-col justify-center gap-2 overflow-hidden px-8",
              variant === "large" && "gap-3",
              variant === "small" && "gap-2",
            )}
          >
            <div className="text-body truncate text-sm font-bold">{t("Talisman SEEK is live")}</div>
            <div className="text-body-secondary truncate">
              {t("Stake SEEK now to get discounts")}
            </div>
          </div>
          <div
            className={cn(
              "absolute right-0 top-0 aspect-[272/64] h-full",
              variant === "large" && "aspect-[272/64]",
              variant === "small" && "aspect-[142/59]",
            )}
          >
            {variant === "large" && <BgIconLarge className="size-full" />}
            {variant === "small" && <BgIconSmall className="size-full" />}
          </div>
        </div>
      </button>
      <div className="absolute right-0 top-0 z-10 select-none p-4">
        <IconButton className="text-md select-auto text-white" onClick={() => setHideBanner(true)}>
          <XIcon />
        </IconButton>
      </div>
    </div>
  )
}
