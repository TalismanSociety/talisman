import { Modal } from "@ui/components/Modal"
import { SuspenseTracker } from "@ui/components/SuspenseTracker"
import { cn } from "@ui/util/cn"
import { IS_POPUP } from "@ui/util/constants"
import { Suspense } from "react"

import { BITTENSOR_CLAIM_SETTINGS_MODAL_CONTENT_CONTAINER_ID } from "./constants"
import { BittensorClaimSettingsModalRouter } from "./forms"
import { useBittensorClaimSettingsModal } from "./hooks/useBittensorClaimSettingsModal"
import { BittensorClaimSettingsWizardProvider } from "./hooks/useBittensorClaimSettingsWizard"

export const BittensorClaimSettingsModal = () => {
  const { isOpen, close } = useBittensorClaimSettingsModal()

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={close}>
      <div
        id={BITTENSOR_CLAIM_SETTINGS_MODAL_CONTENT_CONTAINER_ID} // acts as containerId for sub modals & drawers
        className={cn(
          "relative flex h-150 max-h-dvh w-100 max-w-dvw flex-col overflow-hidden bg-black",
          !IS_POPUP && "rounded border border-grey-850"
        )}
      >
        <BittensorClaimSettingsWizardProvider>
          <Suspense fallback={<SuspenseTracker name="BittensorClaimSettingsModal" />}>
            <BittensorClaimSettingsModalRouter />
          </Suspense>
        </BittensorClaimSettingsWizardProvider>
      </div>
    </Modal>
  )
}
