import { FC, Suspense } from "react"
import { Modal } from "talisman-ui"

import { PopupSizeModalContainer } from "@talisman/components/PopupSizeModalContainer"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"

import { useYieldxyzEnterModal } from "./useYieldxyzEnterModal"
import { YieldxyzEnterWizardProvider } from "./useYieldxyzEnterWizard"
import { YieldxyzEnterPositionWizard } from "./YieldxyzEnterPositionWizard"

export const YieldxyzEnterPositionModal: FC = () => {
  const { isOpen, close, args: stateInit } = useYieldxyzEnterModal()

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={close}>
      <PopupSizeModalContainer id="earn-modal">
        <Suspense fallback={<SuspenseTracker name="EarnDepositModal" />}>
          <YieldxyzEnterWizardProvider stateInit={stateInit}>
            <YieldxyzEnterPositionWizard />
          </YieldxyzEnterWizardProvider>
        </Suspense>
      </PopupSizeModalContainer>
    </Modal>
  )
}
