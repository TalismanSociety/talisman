import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { AlertCircleIcon, InfoIcon } from "@talisman/theme/icons"
import { MnemonicModal } from "@ui/domains/Settings/MnemonicModal"
import useMnemonicBackup from "@ui/hooks/useMnemonicBackup"
import { useSeedPhrases } from "@ui/hooks/useSeedPhrases"
import { useTranslation } from "react-i18next"
import { Modal } from "talisman-ui"
import { Button } from "talisman-ui"

import { DashboardNotification } from "./DashboardNotification"

type BackupWarningModal = {
  isOpen: boolean
  snooze: () => void
  openBackupModal: () => void
}

export const BackupWarningModal = ({ isOpen, snooze, openBackupModal }: BackupWarningModal) => {
  const { t } = useTranslation()

  return (
    <Modal isOpen={isOpen}>
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
          <Button primary onClick={openBackupModal} className="w-[23.2rem]">
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
    </Modal>
  )
}

export const BackupNotification = () => {
  const { t } = useTranslation()
  const { isOpen, open, close } = useOpenClose()
  const { allBackedUp, isSnoozed, showBackupWarning, snoozeBackupReminder } = useMnemonicBackup()

  // todo need a way to choose mnemonic Id, for now just use the first
  const mnemonics = useSeedPhrases()
  const firstMnemonicId = Object.keys(mnemonics)[0]

  // showBackupWarning refers to the main full screen backup warning. This backup notification should be shown whenever that
  // full screen backup warning is *not* shown, as long as the account has not been backed up
  return (
    <>
      {!allBackedUp && (
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
              title={t("Please backup your account.")}
              description={t(
                "If you don't backup your recovery phrase you may lose access to all your funds."
              )}
              action={t("Backup Now")}
              onActionClick={open}
            />
          )}
        </>
      )}
      <MnemonicModal mnemonicId={firstMnemonicId} open={isOpen} onClose={close} />
    </>
  )
}
