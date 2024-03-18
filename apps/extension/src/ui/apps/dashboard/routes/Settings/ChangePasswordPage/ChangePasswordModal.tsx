import { ChangePasswordStatusUpdateStatus, ChangePasswordStatusUpdateType } from "@extension/core"
import { StatusIcon } from "@talisman/components/StatusIcon"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Modal, ModalDialog } from "talisman-ui"

export const ChangePasswordModal = ({
  isOpen,
  progressStage,
}: {
  isOpen: boolean
  progressStage?: ChangePasswordStatusUpdateType
}) => {
  const { t } = useTranslation("admin")
  const progressDisplay = useMemo(() => {
    switch (progressStage) {
      case ChangePasswordStatusUpdateStatus.VALIDATING:
        return t("Validating password")
      case ChangePasswordStatusUpdateStatus.PREPARING:
        return t("Preparing to change password")
      case ChangePasswordStatusUpdateStatus.MNEMONICS:
        return t("Migrating recovery phrases")
      case ChangePasswordStatusUpdateStatus.KEYPAIRS:
        return t("Migrating keypairs")
      case ChangePasswordStatusUpdateStatus.AUTH:
        return t("Migrating authentication")
      default:
        return ""
    }
  }, [progressStage, t])

  return (
    <Modal isOpen={isOpen}>
      <ModalDialog title={t("Changing password")} centerTitle>
        <StatusIcon className="text-3xl" status={"SPINNING"} />
        <div className="mt-4 flex flex-col gap-5 text-center">
          <p className="animate-pulse">{progressDisplay}</p>
          <p className="text-alert-warn border-alert-warn rounded border p-2 text-sm">
            {t(
              "Please wait while we change your password. This can take some time. Do not close the browser window."
            )}
          </p>
        </div>
      </ModalDialog>
    </Modal>
  )
}
