import { XIcon } from "@talismn/icons"
import { cn } from "@talismn/util"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { IconButton } from "talisman-ui"

import { useAppState, useFeatureFlag } from "@ui/state"

import { ReactComponent as BgIconSmall } from "./seek-presale-bg.svg"

const PRESALE_URL = "https://docs.talisman.xyz/talisman/seek/launchpad-pre-sale"

export const SeekPresaleBanner: FC<{ variant: "small" | "large"; className?: string }> = ({
  variant,
  className,
}) => {
  const { t } = useTranslation()
  const allowBanner = useFeatureFlag("SEEK_PRESALE")
  const [hideBanner, setHideBanner] = useAppState("hideSeekPresaleBanner")

  const showBanner = useMemo(() => !!allowBanner && !hideBanner, [allowBanner, hideBanner])

  if (!showBanner) return null

  return (
    <div className={cn("relative w-full", className)}>
      <button
        type="button"
        onClick={() => window.open(PRESALE_URL, "_blank", "noreferrer")}
        className={cn(
          "relative h-[6.4rem] w-full shrink-0 overflow-hidden rounded-sm p-0.5 text-left text-xs",
          variant === "large" && "h-[6.4rem]",
          variant === "small" && "h-[5.9rem]",
        )}
      >
        <div className="absolute inset-0 rounded-sm bg-gradient-to-l from-[#606060]/60 to-[#5A6825]" />
        <div className="from-black-secondary relative size-full overflow-hidden rounded-sm bg-gradient-to-b from-30% to-[#3F3F0C]/50">
          <div
            className={cn(
              "absolute left-0 top-0 z-10 flex size-full flex-col justify-center gap-2 overflow-hidden px-8",
              variant === "large" && "gap-3",
              variant === "small" && "gap-2",
            )}
          >
            <div className="text-body truncate text-sm font-bold">
              {t("SEEK Pre-Sale Ends Soon")}
            </div>
            <div className="text-body-secondary truncate">
              {t("Closes Dec 2nd. Don’t miss out!")}
              {variant === "large" && <> {t("Click here to learn more.")}</>}
            </div>
          </div>
          <div className={"absolute right-0 top-0 aspect-[200/59] h-full"}>
            <BgIconSmall className="size-full" />
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
