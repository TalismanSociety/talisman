import { Modal } from "@ui/components/Modal"
import { PopupSizeModalContainer } from "@ui/components/PopupSizeModalContainer"
import { SuspenseTracker } from "@ui/components/SuspenseTracker"
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
