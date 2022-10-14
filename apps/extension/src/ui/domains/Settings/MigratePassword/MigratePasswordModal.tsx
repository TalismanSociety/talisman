import { Modal as BaseModal } from "@talisman/components/Modal"
import { useMigratePassword, MigratePasswordProvider } from "./context"
import styled from "styled-components"
import { BackUpMnemonicDialog } from "./BackUpMnemonicDialog"
import { EnterPasswordForm } from "./EnterPassword"
import { MigratePasswordSuccess } from "./Success"
import { NewPasswordForm } from "./NewPasswordForm"
import { statusOptions } from "@talisman/hooks/useStatus"
import StatusIcon from "@talisman/components/StatusIcon"
import { ModalDialog } from "@talisman/components/ModalDialog"

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
  const { hasPassword, hasBackedUpMnemonic, passwordTrimmed, hasNewPassword, status } =
    useMigratePassword()
  if (status === statusOptions.PROCESSING)
    return (
      <ModalDialog title="Please wait...">
        <StatusIcon status="SPINNING" />
      </ModalDialog>
    )
  if (status === statusOptions.SUCCESS) return <MigratePasswordSuccess />

  if (!hasPassword) return <EnterPasswordForm />
  if (!hasBackedUpMnemonic) return <BackUpMnemonicDialog />
  if (passwordTrimmed) {
    if (!hasNewPassword) return <NewPasswordForm />
  }
  return null
}

export const MigratePasswordModal = ({ open, onClose }: MigratePasswordModalProps) => (
  <Modal open={open} onClose={onClose}>
    <MigratePasswordProvider>
      <MigratePasswordModalContent />
    </MigratePasswordProvider>
  </Modal>
)
