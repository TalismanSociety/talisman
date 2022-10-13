import { Modal as BaseModal } from "@talisman/components/Modal"
import { useMigratePassword, MigratePasswordProvider } from "./context"
import styled from "styled-components"
import { BackUpMnemonicDialog } from "./BackUpMnemonicDialog"
import { EnterPasswordForm } from "./EnterPassword"

type MigratePasswordModalProps = {
  open: boolean
  onClose: () => void
}

const Modal = styled(BaseModal)`
  .modal-dialog {
    width: 50.3rem;
  }
`

const MigratePasswordModalContent = () => {
  const { hasPassword, hasBackedUpMnemonic, mnemonic } = useMigratePassword()
  if (!hasPassword) return <EnterPasswordForm />
  if (!hasBackedUpMnemonic && mnemonic) return <BackUpMnemonicDialog />
  return <>COOL stuff thanks</>
}

export const MigratePasswordModal = ({ open, onClose }: MigratePasswordModalProps) => (
  <Modal open={open} onClose={onClose}>
    <MigratePasswordProvider>
      <MigratePasswordModalContent />
    </MigratePasswordProvider>
  </Modal>
)
