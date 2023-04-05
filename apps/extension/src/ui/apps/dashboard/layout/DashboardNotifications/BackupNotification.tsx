import { Modal } from "@talisman/components/Modal"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { AlertCircleIcon, InfoIcon } from "@talisman/theme/icons"
import { MnemonicModal } from "@ui/domains/Settings/MnemonicModal"
import useMnemonicBackup from "@ui/hooks/useMnemonicBackup"
import { Button } from "talisman-ui"

import { DashboardNotification } from "./DashboardNotification"

type BackupWarningModal = {
  isOpen: boolean
  snooze: () => void
  openBackupModal: () => void
}

export const BackupWarningModal = ({ isOpen, snooze, openBackupModal }: BackupWarningModal) => {
  return (
    <Modal open={isOpen}>
      <div className="align-center bg-black-primary border-black-tertiary flex flex-col items-center gap-[3.2rem] rounded-lg border-2 p-[2.4rem] text-center">
        <div className="flex flex-col items-center gap-8 p-0">
          <AlertCircleIcon className="text-primary-500 h-20 w-20" />
          <span className="text-lg text-white">Backup wallet</span>
        </div>
        <div className="text-body-secondary w-[40.5rem]">
          You have funds! Now is a great time to back up your wallet. If you don’t back up your
          recovery phrase, you may lose access to your funds.
        </div>
        <div className="flex flex-col items-center gap-8">
          <Button primary onClick={openBackupModal} className="w-[23.2rem]">
            Backup now
          </Button>
          <span className="text-body-secondary cursor-pointer text-base" onClick={snooze}>
            Remind me later
          </span>
        </div>
      </div>
    </Modal>
  )
}

export const BackupNotification = () => {
  const { isOpen, open, close } = useOpenClose()
  const { isNotConfirmed, isSnoozed, showBackupWarning, snoozeBackupReminder } = useMnemonicBackup()

  // showBackupWarning refers to the main full screen backup warning. This backup notification should be shown whenever that
  // full screen backup warning is *not* shown, as long as the account has not been backed up
  return (
    <>
      {isNotConfirmed && (
        <>
          {showBackupWarning && (
            <BackupWarningModal
              snooze={snoozeBackupReminder}
              isOpen={showBackupWarning}
              openBackupModal={open}
            />
          )}
          {isSnoozed && (
            <DashboardNotification
              icon={<InfoIcon />}
              title="Please backup your account. "
              description="If you don't backup your recovery phrase you may lose access to all your funds."
              action="Backup Now"
              onActionClick={open}
            />
          )}
        </>
      )}
      <MnemonicModal open={isOpen} onClose={close} />
    </>
  )
}
