import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import MnemonicForm from "@ui/domains/Account/MnemonicForm"
import { useTranslation } from "react-i18next"

type MnemonicModalProps = {
  open: boolean
  onClose: () => void
}

export const MnemonicModal = ({ open, onClose }: MnemonicModalProps) => {
  const { t } = useTranslation()
  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog className="!w-[50.3rem]" title={t("Backup recovery phrase")} onClose={onClose}>
        <MnemonicForm />
      </ModalDialog>
    </Modal>
  )
}
