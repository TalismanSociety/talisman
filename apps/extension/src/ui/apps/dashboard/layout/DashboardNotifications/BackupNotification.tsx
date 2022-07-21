import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { InfoIcon } from "@talisman/theme/icons"
import Mnemonic from "@ui/domains/Account/Mnemonic"
import useMnemonicBackup from "@ui/hooks/useMnemonicBackup"
import { Notification } from "./Notification"

export const BackupNotification = () => {
  const { isOpen, open, close } = useOpenClose()
  const { isNotConfirmed, confirm } = useMnemonicBackup()

  if (!isNotConfirmed) return null

  return (
    <>
      <Notification
        icon={<InfoIcon />}
        title="Please backup your account. "
        description="If you don't backup your account you may lose access to all your funds."
        action="Backup Now"
        onActionClick={open}
        onClose={confirm}
      />
      <Modal open={isOpen} onClose={close}>
        <ModalDialog title="Secret Phrase" onClose={close}>
          <Mnemonic />
        </ModalDialog>
      </Modal>
    </>
  )
}
