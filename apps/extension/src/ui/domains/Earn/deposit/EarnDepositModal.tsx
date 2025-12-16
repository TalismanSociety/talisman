import { FC, Suspense } from "react"
import { Modal } from "talisman-ui"

import { PopupSizeModalContainer } from "@talisman/components/PopupSizeModalContainer"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"

import { EarnDepositWizardProvider } from "./context"
import { EarnDepositWizard } from "./EarnDepositWizard"
import { useEarnDepositModal } from "./useEarnDepositModal"

export const EarnDepositWizardModal: FC = () => {
  const { isOpen, close, args } = useEarnDepositModal()

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={close}>
      <PopupSizeModalContainer id="earn-deposit-modal">
        <Suspense fallback={<SuspenseTracker name="EarnDepositModal" />}>
          <EarnDepositWizardProvider args={args}>
            <EarnDepositWizard />
          </EarnDepositWizardProvider>
        </Suspense>
      </PopupSizeModalContainer>
    </Modal>
  )
}
