import { XIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useCallback, useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Button, IconButton } from "talisman-ui"

import { api } from "@ui/api"
import { useAppState, useMnemonics, useSessionState } from "@ui/state"

export const BackupReminderBanner = () => {
  const { t } = useTranslation()
  const mnemonics = useMnemonics()
  const [hideBanner, setHideBanner] = useAppState("hideBackupReminderBanner")
  const [isSnoozed, setIsSnoozed] = useSessionState("isBackupReminderBannerSnoozed")

  const showBanner = useMemo(
    () => !isSnoozed && !hideBanner && !!mnemonics.length,
    [hideBanner, mnemonics.length, isSnoozed],
  )

  const onHideClick = useCallback(() => setHideBanner(true), [setHideBanner])

  const onSnoozeClick = useCallback(() => setIsSnoozed(true), [setIsSnoozed])

  const goToMnemonics = useCallback(async () => {
    await Promise.all([api.dashboardOpen("/settings/mnemonics"), setIsSnoozed(true)])
    window.close()
  }, [setIsSnoozed])

  if (!showBanner) return null

  return (
    <div
      className={classNames(
        "relative z-0 overflow-hidden",
        "select-none rounded-sm p-6 text-xs",
        "border border-white",
      )}
    >
      <div className="relative z-10">
        <div className="flex items-center gap-4 text-base">
          <div className="grow text-sm font-bold">{t("Protect your funds")}</div>
          <div>
            <IconButton className="text-md text-body select-auto" onClick={onSnoozeClick}>
              <XIcon />
            </IconButton>
          </div>
        </div>
        <p className="text-body-secondary mt-2">
          <Trans
            t={t}
            defaults="Your recovery phrases control your accounts. Talisman is a non custodial wallet so only you have access to your keys, make sure you have backed them up."
          ></Trans>
        </p>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <Button
            small
            onClick={onHideClick}
            className="border-body-secondary text-body-secondary h-16 rounded-full text-xs"
          >
            {t("Don't show again")}
          </Button>

          <Button primary small onClick={goToMnemonics} className="h-16 rounded-full text-xs">
            {t("Backup Now")}
          </Button>
        </div>
      </div>
    </div>
  )
}
