import { appStore } from "@core/domains/app"
import { Modal } from "@talisman/components/Modal"
import { Drawer } from "@talisman/components/Drawer"
import { ModalDialog } from "@talisman/components/ModalDialog"
import { useIsBrave } from "@talisman/hooks/useIsBrave"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { useCallback, useEffect, useMemo, useState } from "react"
import styled from "styled-components"
import { BraveWarningCard } from "./BraveWarningCard"
import { BraveWarningModal } from "./BraveWarningModal"

const WarningCard = styled(BraveWarningCard)`
  margin: 0;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
`

const BraveWarningPopupBanner = () => {
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
      <Drawer open={showWarning} anchor="bottom" onClose={handleClose}>
        <WarningCard onLearnMoreClick={open} />
      </Drawer>
      <Modal open={isOpen} anchor="bottom" onClose={close}>
        <ModalDialog centerTitle title="Attention Brave Users" onClose={close}>
          <BraveWarningModal popup />
        </ModalDialog>
      </Modal>
    </>
  )
}

// use default export to enable lazy loading
export default BraveWarningPopupBanner
