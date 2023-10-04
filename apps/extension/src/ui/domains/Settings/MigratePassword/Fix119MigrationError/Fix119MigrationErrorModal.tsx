import { StatusIcon } from "@talisman/components/StatusIcon"
import { statusOptions } from "@talisman/hooks/useStatus"
import { useTranslation } from "react-i18next"
import { ModalDialog } from "talisman-ui"
import { Modal } from "talisman-ui"

import { MigratePasswordError } from "../Error"
import { Fix119MigrationErrorProvider, useFix119MigrationError } from "./context"
import { EnterPasswordForm } from "./EnterPassword"
import { Fix119MigrationErrorSuccess } from "./Success"
import { useFixBrokenMigrationModal } from "./useFixBrokenMigrationModal"

const Fix119MigrationErrorContent = () => {
  const { t } = useTranslation()
  const { status } = useFix119MigrationError()
  if (status === statusOptions.PROCESSING)
    return (
      <ModalDialog title={t("Please wait...")}>
        <StatusIcon status="SPINNING" className="my-20" />
      </ModalDialog>
    )
  if (status === statusOptions.SUCCESS) return <Fix119MigrationErrorSuccess />
  if (status === statusOptions.ERROR) return <MigratePasswordError />

  if (status === statusOptions.INITIALIZED) return <EnterPasswordForm />
  return null
}

export const Fix119MigrationErrorModal = () => {
  const { isOpen, close } = useFixBrokenMigrationModal()

  return (
    <Modal isOpen={isOpen} onDismiss={close}>
      <div className="w-[50.3rem]">
        <Fix119MigrationErrorProvider onComplete={close}>
          <Fix119MigrationErrorContent />
        </Fix119MigrationErrorProvider>
      </div>
    </Modal>
  )
}
