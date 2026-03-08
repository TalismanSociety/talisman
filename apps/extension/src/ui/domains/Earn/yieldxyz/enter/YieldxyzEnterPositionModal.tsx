import { Modal } from "@ui/components/Modal"
import { PopupSizeModalContainer } from "@ui/components/PopupSizeModalContainer"
import { SuspenseTracker } from "@ui/components/SuspenseTracker"
import { type FC, Suspense } from "react"

import { useYieldxyzEnterModal } from "./useYieldxyzEnterModal"
import { YieldxyzEnterWizardProvider } from "./useYieldxyzEnterWizard"
import { YieldxyzEnterPositionWizard } from "./YieldxyzEnterPositionWizard"

export const YieldxyzEnterPositionModal: FC = () => {
  const { isOpen, close, args: stateInit } = useYieldxyzEnterModal()

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={close}>
      <PopupSizeModalContainer id="earn-modal">
        <Suspense fallback={<SuspenseTracker name="YieldxyzEnterPositionModal" />}>
          <YieldxyzEnterWizardProvider stateInit={stateInit}>
            <YieldxyzEnterPositionWizard />
          </YieldxyzEnterWizardProvider>
        </Suspense>
      </PopupSizeModalContainer>
    </Modal>
  )
}
