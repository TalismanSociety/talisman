import { FC, Suspense } from "react"
import { Modal } from "talisman-ui"

import { PopupSizeModalContainer } from "@talisman/components/PopupSizeModalContainer"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"

import { useYieldxyzClaimModal } from "./useYieldxyzClaimModal"
import { YieldxyzClaimWizardProvider } from "./useYieldxyzClaimWizard"
import { YieldxyzClaimPositionWizard } from "./YieldxyzClaimPositionWizard"

export const YieldxyzClaimPositionModal: FC = () => {
  const { isOpen, close, args: position } = useYieldxyzClaimModal()

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={close}>
      <PopupSizeModalContainer id="earn-modal">
        <Suspense fallback={<SuspenseTracker name="YieldxyzClaimPositionModal" />}>
          <YieldxyzClaimWizardProvider position={position}>
            <YieldxyzClaimPositionWizard />
          </YieldxyzClaimWizardProvider>
        </Suspense>
      </PopupSizeModalContainer>
    </Modal>
  )
}
