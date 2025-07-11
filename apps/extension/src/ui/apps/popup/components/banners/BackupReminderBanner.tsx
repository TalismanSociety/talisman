import { XIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { appStore } from "extension-core"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Button, IconButton } from "talisman-ui"

import { api } from "@ui/api"
import {
  useAccounts,
  useAppState,
  useBalanceTotals,
  useMnemonics,
  useSessionState,
} from "@ui/state"

export const BackupReminderBanner = () => {
  const { t } = useTranslation()
  const { show, hasFundsInNotBackedUpMnemonics, onSnoozeClick, onDismissClick, onBackupClick } =
    useBackupBanner()

  if (!show) return null

  return (
    <div
      className={classNames(
        "relative z-0 overflow-hidden",
        "select-none rounded-sm p-6 py-4 text-xs",
        "border-body-secondary border",
      )}
    >
      <div className="relative z-10">
        <div className="flex items-center gap-4 text-base">
          <div className="grow text-sm font-bold">{t("Protect your funds")}</div>
          <div>
            <IconButton className="text-md text-body select-auto" onClick={onDismissClick}>
              <XIcon />
            </IconButton>
          </div>
        </div>
        <p className="text-body-secondary mt-2">
          {hasFundsInNotBackedUpMnemonics
            ? t(
                "You have funds! Talisman is a non custodial wallet so only you have access to your keys, make sure you have backed them up or you may lose access to your funds.",
              )
            : t(
                "Your recovery phrases control your accounts. Talisman is a non-custodial wallet, so only you have access to your keys. Make sure you’ve backed them up.",
              )}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <Button
            small
            onClick={onSnoozeClick}
            className="border-body-secondary text-body-secondary h-16 rounded-full text-xs"
          >
            {t("Remind me later")}
          </Button>

          <Button primary small onClick={onBackupClick} className="h-16 rounded-full text-xs">
            {t("Backup to dismiss")}
          </Button>
        </div>
      </div>
    </div>
  )
}

const useBackupBanner = () => {
  const [hideBackupWarningUntil] = useAppState("hideBackupWarningUntil")
  const [isSessionSnoozed, setIsSessionSnoozed] = useSessionState("isBackupReminderBannerSnoozed")
  const mnemonics = useMnemonics()
  const balanceTotals = useBalanceTotals() // this doesn't trigger balance subscriptions
  const accounts = useAccounts()

  const notBackedUpMnemonicIds = useMemo(
    () => mnemonics.filter((mnemonic) => !mnemonic.confirmed).map((mnemonic) => mnemonic.id),
    [mnemonics],
  )

  const notBackedUpAddresses = useMemo(
    () =>
      accounts
        .filter(
          (account) =>
            account.type === "keypair" &&
            account.mnemonicId &&
            notBackedUpMnemonicIds.includes(account.mnemonicId),
        )
        .map((account) => account.address),
    [accounts, notBackedUpMnemonicIds],
  )

  const hasFundsInNotBackedUpMnemonics = useMemo(
    () => notBackedUpAddresses.some((address) => !!balanceTotals[address]),
    [balanceTotals, notBackedUpAddresses],
  )

  const isSnoozed = useMemo(() => {
    return (
      Boolean(hideBackupWarningUntil && hideBackupWarningUntil > Date.now()) || isSessionSnoozed
    )
  }, [hideBackupWarningUntil, isSessionSnoozed])

  const show = useMemo(() => {
    return !isSnoozed && !!notBackedUpMnemonicIds.length
  }, [isSnoozed, notBackedUpMnemonicIds.length])

  /** For the `remind me later` button */
  const onSnoozeClick = useCallback(() => {
    // always snooze for 3 days
    appStore.snoozeBackupReminder()
  }, [])

  /** for the X icon button */
  const onDismissClick = useCallback(() => {
    // if user has funds, snooze for the duration of the session
    if (hasFundsInNotBackedUpMnemonics) setIsSessionSnoozed(true)
    // if user has no funds, snooze for 3 days
    else appStore.snoozeBackupReminder()
  }, [hasFundsInNotBackedUpMnemonics, setIsSessionSnoozed])

  const onBackupClick = useCallback(async () => {
    await Promise.all([api.dashboardOpen("/settings/mnemonics"), setIsSessionSnoozed(true)])
    window.close()
  }, [setIsSessionSnoozed])

  return {
    hasFundsInNotBackedUpMnemonics,
    show,
    onSnoozeClick,
    onDismissClick,
    onBackupClick,
  }
}
