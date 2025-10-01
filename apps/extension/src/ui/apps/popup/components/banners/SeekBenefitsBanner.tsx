import { XIcon } from "@talismn/icons"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { IconButton, useOpenClose } from "talisman-ui"

import { SeekBenefitsModal } from "@ui/domains/Portfolio/SeekBenefits/SeekBenefitsModal"
import { useAppState, useFeatureFlag } from "@ui/state"

import { ReactComponent as BgIcon } from "./assets/seek-benefits-bg.svg"

export const SeekBenefitsBanner = () => {
  const { t } = useTranslation()
  const allowBanner = useFeatureFlag("SEEK_BENEFITS_BANNER")
  const [hideBanner, setHideBanner] = useAppState("hideSeekBenefitsBanner")
  const ocDialog = useOpenClose()

  const showBanner = useMemo(() => !!allowBanner && !hideBanner, [allowBanner, hideBanner])

  if (!showBanner) return null

  return (
    <>
      <div className="relative w-full">
        <button
          type="button"
          onClick={ocDialog.open}
          className="relative h-[6rem] w-full shrink-0 overflow-hidden rounded-sm p-0.5 text-left text-xs"
        >
          <div className="absolute inset-0 rounded-sm bg-gradient-to-l from-[#606060] to-[#5A6825]" />
          <div className="from-black-secondary relative size-full overflow-hidden rounded-sm bg-gradient-to-b from-30% to-[#3F3F0C]/50 to-[200%]">
            <div className="flex size-full flex-col justify-center gap-2 px-8">
              <div className="text-body truncate text-sm font-bold">
                {t("Talisman SEEK is live")}
              </div>
              <div className="text-body-secondary truncate">
                {t("Stake $SEEK now to get discounts")}
              </div>
            </div>
            <div className="absolute right-0 top-0 aspect-[142/59] h-full">
              <BgIcon className="size-full" />
            </div>
          </div>
        </button>
        <div className="absolute right-0 top-0 z-10 select-none p-4">
          <IconButton
            className="text-md select-auto text-white"
            onClick={() => setHideBanner(true)}
          >
            <XIcon />
          </IconButton>
        </div>
      </div>
      <SeekBenefitsModal isOpen={ocDialog.isOpen} containerId="main" onClose={ocDialog.close} />
    </>
  )
}
