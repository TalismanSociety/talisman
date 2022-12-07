import { Modal as BaseModal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import StatusIcon from "@talisman/components/StatusIcon"
import { statusOptions } from "@talisman/hooks/useStatus"
import styled from "styled-components"

import { BackUpMnemonicDialog } from "./BackUpMnemonicDialog"
import { MigratePasswordProvider, useMigratePassword } from "./context"
import { EnterPasswordForm } from "./EnterPassword"
import { MigratePasswordError } from "./Error"
import { NewPasswordForm } from "./NewPasswordForm"
import { MigratePasswordSuccess } from "./Success"

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
        <StatusIcon status="SPINNING" className="my-20" />
      </ModalDialog>
    )
  if (status === statusOptions.SUCCESS) return <MigratePasswordSuccess />
  if (status === statusOptions.ERROR) return <MigratePasswordError />

  if (!hasPassword) return <EnterPasswordForm />
  if (!hasBackedUpMnemonic) return <BackUpMnemonicDialog />
  if (passwordTrimmed) {
    if (!hasNewPassword) return <NewPasswordForm />
  }
  return null
}

export const MigratePasswordModal = ({ open, onClose }: MigratePasswordModalProps) => (
  <Modal open={open} onClose={onClose}>
    <MigratePasswordProvider onComplete={onClose}>
      <MigratePasswordModalContent />
    </MigratePasswordProvider>
  </Modal>
)
