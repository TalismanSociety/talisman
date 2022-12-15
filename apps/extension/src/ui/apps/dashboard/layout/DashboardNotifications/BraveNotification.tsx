import { appStore } from "@core/domains/app/store.app"
import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import { useIsBrave } from "@talisman/hooks/useIsBrave"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { BraveIcon } from "@talisman/theme/icons"
import { BraveWarningModal } from "@ui/domains/Settings/BraveWarning/BraveWarningModal"
import { useAppState } from "@ui/hooks/useAppState"
import { useCallback, useMemo } from "react"

import { Notification } from "./Notification"

export const BraveWarningNotification = () => {
  const isBrave = useIsBrave()
  const { hideBraveWarning } = useAppState()
  const { isOpen, close, open } = useOpenClose()

  const showWarning = useMemo(() => isBrave && !hideBraveWarning, [hideBraveWarning, isBrave])

  const handleHide = useCallback(() => {
    appStore.set({ hideBraveWarning: true })
  }, [])

  if (!showWarning) return null

  return (
    <>
      <Notification
        icon={<BraveIcon className="icon" />}
        title="Attention Brave users. "
        description="Due to a recent Brave update, users may be experiencing issues loading balances."
        action="Learn more"
        onActionClick={open}
        onClose={handleHide}
      />
      <Modal open={isOpen} onClose={close}>
        <ModalDialog centerTitle title="Attention Brave Users" onClose={close}>
          <BraveWarningModal />
        </ModalDialog>
      </Modal>
    </>
  )
}
