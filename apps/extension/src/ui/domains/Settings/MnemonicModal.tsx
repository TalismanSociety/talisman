import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import Mnemonic from "@ui/domains/Account/Mnemonic"
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
      <Mnemonic />
    </Dialog>
  </Modal>
)
