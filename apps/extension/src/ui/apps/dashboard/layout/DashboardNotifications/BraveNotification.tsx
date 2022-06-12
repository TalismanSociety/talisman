import { appStore } from "@core/domains/app"
import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import { useIsBrave } from "@talisman/hooks/useIsBrave"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { BraveIcon } from "@talisman/theme/icons"
import { BraveWarningModal } from "@ui/domains/Settings/BraveWarning/BraveWarningModal"
import { useEffect, useMemo, useState } from "react"
import { Notification } from "./Notification"

export const BraveWarningNotification = () => {
  const isBrave = useIsBrave()
  const [hideBraveWarning, setHideBraveWarning] = useState<boolean | undefined>(true)
  const [hasBraveWarningBeenShown, setHasBraveWarningBeenShown] = useState<boolean | undefined>(
    true
  )
  const { isOpen, close, open } = useOpenClose()

  useEffect(() => {
    const sub = appStore.observable.subscribe((settings) => {
      setHideBraveWarning(settings.hideBraveWarning)
      setHasBraveWarningBeenShown(settings.hasBraveWarningBeenShown)
    })
    return () => sub.unsubscribe()
  }, [])

  const showWarning = useMemo(() => isBrave && !hideBraveWarning, [hideBraveWarning, isBrave])

  useEffect(() => {
    if (showWarning && !hasBraveWarningBeenShown) open()
  }, [hasBraveWarningBeenShown, open, showWarning])

  if (!showWarning) return null

  return (
    <>
      <Notification
        icon={<BraveIcon className="icon" />}
        title="Attention Brave users! "
        description="Due to a recent update, users may be experiencing issues loading balances"
        action="Learn more"
        onActionClick={open}
        onClose={confirm}
      />
      <Modal open={isOpen} onClose={close}>
        <ModalDialog centerTitle title="Attention Brave Users" onClose={close}>
          <BraveWarningModal />
        </ModalDialog>
      </Modal>
    </>
  )
}
