import { AlertCircleIcon, XIcon } from "@talismn/icons"
import { IconButton } from "@ui/components/IconButton"
import { useAppState } from "@ui/state/app"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"

const HIDE_AFTER = Date.UTC(2026, 10, 1)

export const BittensorRootRewardsInfo = () => {
  const { t } = useTranslation()
  const [hidden, setHidden] = useAppState("hideBittensorRootRewardsInfo")

  const handleDismiss = useCallback(() => {
    setHidden(true)
  }, [setHidden])

  if (hidden || Date.now() >= HIDE_AFTER) return null

  return (
    <div className="rounded-sm bg-linear-to-r from-primary/35 to-[#606060]/25 p-[0.6px]">
      <div className="relative flex items-start gap-5 rounded-sm bg-black px-6 py-8">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <AlertCircleIcon className="size-10 text-primary" />
        </div>
        <div className="pr-10 text-body-secondary text-xs leading-paragraph">
          {t(
            "Since the Root Reborn update, per-subnet claim options are no longer available. Root rewards now accrue as a basket held by the validator you select, and are redeemed to TAO staked back on root."
          )}
        </div>
        <IconButton
          className="absolute top-5 right-5 text-base text-body"
          onClick={handleDismiss}
          aria-label={t("Dismiss")}
        >
          <XIcon />
        </IconButton>
      </div>
    </div>
  )
}
