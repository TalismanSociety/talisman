import { useIsBrave } from "@talisman/hooks/useIsBrave"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { BraveIcon } from "@talismn/icons"
import { BraveWarningModal } from "@ui/domains/Settings/BraveWarning/BraveWarningModal"
import { useAppState } from "@ui/hooks/useAppState"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Modal, ModalDialog } from "talisman-ui"

import { DashboardNotification } from "./DashboardNotification"

export const BraveWarningNotification = () => {
  const { t } = useTranslation()
  const isBrave = useIsBrave()
  const [hideBraveWarning, setHideBraveWarning] = useAppState("hideBraveWarning")
  const { isOpen, close, open } = useOpenClose()

  const showWarning = useMemo(() => isBrave && !hideBraveWarning, [hideBraveWarning, isBrave])

  const handleHide = useCallback(() => {
    setHideBraveWarning(true)
  }, [setHideBraveWarning])

  if (!showWarning) return null

  return (
    <>
      <DashboardNotification
        icon={<BraveIcon className="icon" />}
        title={t("Attention Brave users.")}
        description={t(
          "Due to a recent Brave update, users may be experiencing issues loading balances."
        )}
        action={t("Learn more")}
        onActionClick={open}
        onClose={handleHide}
      />
      <Modal isOpen={isOpen} onDismiss={close}>
        <ModalDialog centerTitle title={t("Attention Brave Users")} onClose={close}>
          <BraveWarningModal />
        </ModalDialog>
      </Modal>
    </>
  )
}
