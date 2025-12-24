import { cn } from "@talismn/util"
import { Suspense } from "react"
import { Modal } from "talisman-ui"

import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { IS_POPUP } from "@ui/util/constants"

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
          "relative flex h-[60rem] max-h-[100dvh] w-[40rem] max-w-[100dvw] flex-col overflow-hidden bg-black",
          !IS_POPUP && "border-grey-850 rounded border",
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
