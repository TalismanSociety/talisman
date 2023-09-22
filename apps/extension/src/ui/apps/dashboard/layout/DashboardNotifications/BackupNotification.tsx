import { InfoIcon } from "@talismn/icons"
import useMnemonicBackup from "@ui/hooks/useMnemonicBackup"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { DashboardNotification } from "./DashboardNotification"

const BackupNotificationDisplay = () => {
  const { t } = useTranslation()

  const navigate = useNavigate()

  const handleBackupNowClick = useCallback(() => {
    navigate("/settings/mnemonics?showBackupModal")
  }, [navigate])

  return (
    <DashboardNotification
      icon={<InfoIcon />}
      title={t("Please backup your recovery phrases.")}
      description={t(
        "If you don't backup your recovery phrases, you may lose access to all your funds."
      )}
      action={t("Backup Now")}
      onActionClick={handleBackupNowClick}
    />
  )
}

export const BackupNotification = () => {
  const { showBackupNotification } = useMnemonicBackup()

  return showBackupNotification ? <BackupNotificationDisplay /> : null
}
