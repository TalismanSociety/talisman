import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import MnemonicForm from "@ui/domains/Account/MnemonicForm"
import styled from "styled-components"

type MnemonicModalProps = {
  open: boolean
  onClose: () => void
}

const Dialog = styled(ModalDialog)`
  width: 50.3rem;
`

export const MnemonicModal = ({ open, onClose }: MnemonicModalProps) => (
  <Modal open={open} onClose={onClose}>
    <Dialog title="Backup recovery phrase" onClose={onClose}>
      <MnemonicForm />
    </Dialog>
  </Modal>
)
