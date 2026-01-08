import { FC, Suspense } from "react"
import { Modal } from "talisman-ui"

import { PopupSizeModalContainer } from "@talisman/components/PopupSizeModalContainer"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"

import { useYieldxyzManageModal } from "./useYieldxyzManageModal"
import { YieldxyzManageWizardProvider } from "./useYieldxyzManageWizard"
import { YieldxyzManagePositionWizard } from "./YieldxyzManagePositionWizard"

export const YieldxyzManagePositionModal: FC = () => {
  const { isOpen, close, args } = useYieldxyzManageModal()

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={close}>
      <PopupSizeModalContainer id="earn-modal">
        <Suspense fallback={<SuspenseTracker name="YieldxyzManagePositionModal" />}>
          <YieldxyzManageWizardProvider
            position={args?.position}
            pendingAction={args?.pendingAction}
            balance={args?.balance}
          >
            <YieldxyzManagePositionWizard />
          </YieldxyzManageWizardProvider>
        </Suspense>
      </PopupSizeModalContainer>
    </Modal>
  )
}
