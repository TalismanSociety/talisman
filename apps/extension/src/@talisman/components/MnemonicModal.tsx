import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import Mnemonic from "@ui/domains/Account/Mnemonic"

type MnemonicModalProps = {
  open: boolean
  onClose: () => void
}

export const MnemonicModal = ({ open, onClose }: MnemonicModalProps) => (
  <Modal open={open} onClose={onClose}>
    <ModalDialog title="Secret Phrase" onClose={onClose}>
      <Mnemonic />
    </ModalDialog>
  </Modal>
)
