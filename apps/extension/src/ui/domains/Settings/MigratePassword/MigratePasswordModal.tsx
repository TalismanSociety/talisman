import { Modal } from "@ui/components/Modal"
import { ModalDialog } from "@ui/components/ModalDialog"
import { ProcessAnimation } from "@ui/components/ProcessAnimation/ProcessAnimation"
import { statusOptions } from "@ui/hooks/useStatus"
import { useTranslation } from "react-i18next"

import { BackUpMnemonicDialog } from "./BackUpMnemonicDialog"
import { MigratePasswordProvider, useMigratePassword } from "./context"
import { EnterPasswordForm } from "./EnterPassword"
import { MigratePasswordError } from "./Error"
import { NewPasswordForm } from "./NewPasswordForm"
import { MigratePasswordSuccess } from "./Success"
import { useMigratePasswordModal } from "./useMigratePasswordModal"

const MigratePasswordModalContent = () => {
  const { t } = useTranslation()
  const { hasPassword, hasBackedUpMnemonic, passwordTrimmed, hasNewPassword, status } =
    useMigratePassword()
  if (status === statusOptions.PROCESSING)
    return (
      <ModalDialog title={t("Please wait...")}>
        <ProcessAnimation status="processing" className="my-20 h-[8.75rem]" />
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

export const MigratePasswordModal = () => {
  const { isOpen, close } = useMigratePasswordModal()

  return (
    <Modal isOpen={isOpen} onDismiss={close}>
      <div className="w-[31.4375rem]">
        <MigratePasswordProvider onComplete={close}>
          <MigratePasswordModalContent />
        </MigratePasswordProvider>
      </div>
    </Modal>
  )
}
