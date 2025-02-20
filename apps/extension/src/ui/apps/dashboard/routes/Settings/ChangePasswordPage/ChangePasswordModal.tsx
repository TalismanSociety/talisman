import { AlertTriangleIcon } from "@talismn/icons"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Modal, ModalDialog, ProcessAnimation } from "talisman-ui"

import { ChangePasswordStatusUpdateStatus, ChangePasswordStatusUpdateType } from "@extension/core"

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
      <ModalDialog title={t("Changing password")} centerTitle className="w-[40rem]">
        <ProcessAnimation status="processing" className="my-8 h-[14rem]" />
        <div className="flex flex-col gap-5">
          <p className="my-8 animate-pulse text-center">{progressDisplay}</p>
          <div className="bg-alert-warn/10 text-alert-warn flex items-center gap-6 rounded p-4 px-6 text-sm">
            <AlertTriangleIcon className="text-alert-warn shrink-0 text-lg" />
            <div>
              {t(
                "Please wait while we change your password. This can take some time. Do not close the browser window.",
              )}
            </div>
          </div>
        </div>
      </ModalDialog>
    </Modal>
  )
}
