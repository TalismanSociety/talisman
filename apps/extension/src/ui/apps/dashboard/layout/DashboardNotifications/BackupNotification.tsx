import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { InfoIcon } from "@talisman/theme/icons"
import { MnemonicModal } from "@ui/domains/Settings/MnemonicModal"
import useMnemonicBackup from "@ui/hooks/useMnemonicBackup"

import { DashboardNotification } from "./DashboardNotification"

export const BackupNotification = () => {
  const { isOpen, open, close } = useOpenClose()
  const { isNotConfirmed, confirm } = useMnemonicBackup()

  if (!isNotConfirmed) return null

  return (
    <>
      <DashboardNotification
        icon={<InfoIcon />}
        title="Please backup your recovery phrase. "
        description="If you don't backup your recovery phrase you may lose access to all your funds."
        action="Backup Now"
        onActionClick={open}
        onClose={confirm}
      />
      <MnemonicModal open={isOpen} onClose={close} />
    </>
  )
}
