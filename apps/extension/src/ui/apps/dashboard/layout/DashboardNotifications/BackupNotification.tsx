import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { InfoIcon } from "@talisman/theme/icons"
import { MnemonicModal } from "@ui/domains/Settings/MnemonicModal"
import useMnemonicBackup from "@ui/hooks/useMnemonicBackup"

import { DashboardNotification } from "./DashboardNotification"

export const BackupNotification = () => {
  const { isOpen, open, close } = useOpenClose()
  const { isNotConfirmed, showBackupWarning } = useMnemonicBackup()

  // showBackupWarning refers to the main full screen backup warning. This backup notification should be shown whenever that
  // full screen backup warning is *not* shown, as long as the account has not been backed up
  if (!isNotConfirmed || showBackupWarning) return null

  return (
    <>
      <DashboardNotification
        icon={<InfoIcon />}
        title="Please backup your account. "
        description="If you don't backup your recovery phrase you may lose access to all your funds."
        action="Backup Now"
        onActionClick={open}
      />
      <MnemonicModal open={isOpen} onClose={close} />
    </>
  )
}
