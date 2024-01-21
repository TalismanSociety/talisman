import { AlertCircleIcon } from "@talismn/icons"
import { api } from "@ui/api"
import useMnemonicBackup from "@ui/hooks/useMnemonicBackup"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Button, Drawer } from "talisman-ui"

export const BackupWarningDrawer = () => {
  const { t } = useTranslation()
  const { showBackupWarningModal, snoozeBackupReminder } = useMnemonicBackup()
  const openBackup = useCallback(async () => {
    await api.dashboardOpen("/settings/mnemonics")
    window.close()
  }, [])

  return (
    <Drawer containerId="main" isOpen={showBackupWarningModal} anchor="bottom" onDismiss={close}>
      <div className="bg-black-tertiary flex max-w-[42rem] flex-col items-center gap-12 rounded-t-xl p-12">
        <AlertCircleIcon className="text-primary-500 h-20 w-20" />
        <div className="flex flex-col gap-5 text-center">
          <span className="font-bold text-white">{t("Backup Wallet")}</span>
          <span className="text-body-secondary">
            {t(
              "You have funds! Now is a great time to back up your wallet. If you don’t back up your recovery phrase you may lose access to your funds."
            )}
          </span>
        </div>
        <div className="flex w-full flex-col items-center gap-8">
          <Button fullWidth primary onClick={openBackup}>
            {t("Backup now")}
          </Button>
          <button
            type="button"
            className="text-body-secondary cursor-pointer text-base"
            onClick={snoozeBackupReminder}
          >
            {t("Remind me later")}
          </button>
        </div>
      </div>
    </Drawer>
  )
}
