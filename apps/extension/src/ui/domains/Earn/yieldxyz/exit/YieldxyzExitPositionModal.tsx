import { PopupSizeModalContainer } from "@talisman/components/PopupSizeModalContainer"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { Modal } from "@ui/talisman-ui/components/Modal"
import { type FC, Suspense } from "react"

import { useYieldxyzExitModal } from "./useYieldxyzExitModal"
import { YieldxyzExitWizardProvider } from "./useYieldxyzExitWizard"
import { YieldxyzExitPositionWizard } from "./YieldxyzExitPositionWizard"

export const YieldxyzExitPositionModal: FC = () => {
  const { isOpen, close, args: position } = useYieldxyzExitModal()

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={close}>
      <PopupSizeModalContainer id="earn-modal">
        <Suspense fallback={<SuspenseTracker name="YieldxyzExitPositionModal" />}>
          <YieldxyzExitWizardProvider position={position}>
            <YieldxyzExitPositionWizard />
          </YieldxyzExitWizardProvider>
        </Suspense>
      </PopupSizeModalContainer>
    </Modal>
  )
}
