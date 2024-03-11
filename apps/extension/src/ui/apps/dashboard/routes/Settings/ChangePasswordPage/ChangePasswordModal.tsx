import { ChangePasswordStatusUpdateType } from "@core/domains/app/types"
import { StatusIcon } from "@talisman/components/StatusIcon"
import { useTranslation } from "react-i18next"
import { Modal, ModalDialog } from "talisman-ui"

export enum ChangePasswordStatuses {
  IN_PROGRESS = "SPINNING",
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
}

export const ChangePasswordModal = ({
  isOpen,
  status,
  progressStage,
}: {
  isOpen: boolean
  status: ChangePasswordStatuses
  progressStage?: ChangePasswordStatusUpdateType
}) => {
  const { t } = useTranslation("admin")

  return (
    <Modal isOpen={isOpen}>
      <ModalDialog title={t("Changing password")}>
        <StatusIcon className="text-3xl" status={status} />
        <span className="text-body mt-4">
          {t(
            "Please wait while we change your password. This can take some time. Do not close your browser."
          )}
        </span>
        <p>Progress: {progressStage}</p>
      </ModalDialog>
    </Modal>
  )
}
