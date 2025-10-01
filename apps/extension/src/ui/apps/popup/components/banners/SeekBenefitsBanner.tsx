import { XIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { IconButton } from "talisman-ui"

import { useAppState, useFeatureFlag } from "@ui/state"

import { ReactComponent as BgIcon } from "./assets/seek-benefits-bg.svg"

export const SeekBenefitsBanner = () => {
  const { t } = useTranslation()
  const allowBanner = useFeatureFlag("SEEK_BENEFITS_BANNER")
  const [hideBanner, setHideBanner] = useAppState("hideSeekBenefitsBanner")

  const showBanner = useMemo(() => !!allowBanner && !hideBanner, [allowBanner, hideBanner])

  if (!showBanner) return null

  return (
    <div
      className={classNames(
        "border-body-secondary relative z-0 h-[6rem] shrink-0 select-none overflow-hidden rounded-sm border text-xs",
        "from-black-secondary bg-gradient-to-b to-[#3F3F0C]/50",
      )}
    >
      <div className="flex size-full flex-col justify-center gap-2 px-8">
        <div className="text-body truncate text-sm font-bold">{t("Talisman SEEK is live")}</div>
        <div className="text-body-secondary truncate">{t("Stake $SEEK now to get discounts")}</div>
      </div>
      <div className="absolute right-0 top-0 aspect-[142/59] h-full">
        <BgIcon className="size-full" />
      </div>
      <div className="absolute right-4 top-4">
        <IconButton className="text-md text-body select-auto" onClick={() => setHideBanner(true)}>
          <XIcon />
        </IconButton>
      </div>
    </div>
  )
}
