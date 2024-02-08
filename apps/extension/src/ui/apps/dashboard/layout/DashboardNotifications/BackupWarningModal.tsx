import { AlertCircleIcon } from "@talismn/icons"
import useMnemonicBackup from "@ui/hooks/useMnemonicBackup"
import { FC, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Button, Modal } from "talisman-ui"

const ModalContent: FC<{ snooze: () => void }> = ({ snooze }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const handleBackupClick = useCallback(async () => {
    navigate("/settings/mnemonics")
  }, [navigate])

  return (
    <div className="align-center bg-black-primary border-black-tertiary flex flex-col items-center gap-[3.2rem] rounded-lg border-2 p-[2.4rem] text-center">
      <div className="flex flex-col items-center gap-8 p-0">
        <AlertCircleIcon className="text-primary-500 h-20 w-20" />
        <span className="text-lg text-white">{t("Backup wallet")}</span>
      </div>
      <div className="text-body-secondary w-[40.5rem]">
        {t(
          "You have funds! Now is a great time to back up your wallet. If you don’t back up your recovery phrase, you may lose access to your funds."
        )}
      </div>
      <div className="flex flex-col items-center gap-8">
        <Button primary onClick={handleBackupClick} className="w-[23.2rem]">
          {t("Backup now")}
        </Button>
        <button
          type="button"
          className="text-body-secondary hover:text-grey-200 cursor-pointer text-base"
          onClick={snooze}
        >
          {t("Remind me later")}
        </button>
      </div>
    </div>
  )
}

export const BackupWarningModal = () => {
  const { showBackupWarningModal, snoozeBackupReminder } = useMnemonicBackup()

  return (
    <Modal isOpen={showBackupWarningModal}>
      <ModalContent snooze={snoozeBackupReminder} />
    </Modal>
  )
}
