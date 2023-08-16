import { MnemonicForm } from "@ui/domains/Account/MnemonicForm"
import { useTranslation } from "react-i18next"
import { ModalDialog } from "talisman-ui"
import { Modal } from "talisman-ui"

type MnemonicModalProps = {
  mnemonicId: string
  open: boolean
  onClose: () => void
}

export const MnemonicModal = ({ open, onClose, mnemonicId }: MnemonicModalProps) => {
  const { t } = useTranslation()
  return (
    <Modal isOpen={open} onDismiss={onClose}>
      <ModalDialog className="!w-[50.3rem]" title={t("Backup recovery phrase")} onClose={onClose}>
        <MnemonicForm mnemonicId={mnemonicId} />
      </ModalDialog>
    </Modal>
  )
}
