import { appStore } from "@extension/core"
import { useIsBrave } from "@talisman/hooks/useIsBrave"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Drawer, Modal, ModalDialog } from "talisman-ui"

import { BraveWarningCard } from "./BraveWarningCard"
import { BraveWarningModal } from "./BraveWarningModal"

const BraveWarningPopupBanner = () => {
  const { t } = useTranslation()
  const { isOpen, open, close } = useOpenClose()

  const isBrave = useIsBrave()
  // persisted setting, hide by default
  const [hideBraveWarning, setHideBraveWarning] = useState<boolean | undefined>(true)
  // we should display the warning only once in the popup
  const [hasBraveWarningBeenShown, setHasBraveWarningBeenShown] = useState<boolean | undefined>(
    true
  )

  useEffect(() => {
    const sub = appStore.observable.subscribe((settings) => {
      setHideBraveWarning(settings.hideBraveWarning)
      setHasBraveWarningBeenShown(settings.hasBraveWarningBeenShown)
    })
    return () => sub.unsubscribe()
  }, [])

  const handleClose = useCallback(() => {
    appStore.set({ hasBraveWarningBeenShown: true })
  }, [])

  const showWarning = useMemo(
    () => isBrave && !hideBraveWarning && !hasBraveWarningBeenShown,
    [hasBraveWarningBeenShown, hideBraveWarning, isBrave]
  )

  if (!showWarning && !isOpen) return null

  return (
    <>
      <Drawer isOpen={showWarning} containerId="main" anchor="bottom" onDismiss={handleClose}>
        <BraveWarningCard className="!m-0 !rounded-b-none" onLearnMoreClick={open} />
      </Drawer>
      <Modal isOpen={isOpen} anchor="bottom" onDismiss={close}>
        <ModalDialog centerTitle title={t("Attention Brave Users")} onClose={close}>
          <BraveWarningModal popup />
        </ModalDialog>
      </Modal>
    </>
  )
}

// use default export to enable lazy loading
export default BraveWarningPopupBanner
