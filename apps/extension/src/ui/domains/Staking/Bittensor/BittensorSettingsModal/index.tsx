import { Modal } from "@ui/components/Modal"
import { SuspenseTracker } from "@ui/components/SuspenseTracker"
import { cn } from "@ui/util/cn"
import { IS_POPUP } from "@ui/util/constants"
import { Suspense } from "react"

import { BITTENSOR_SETTINGS_MODAL_CONTENT_CONTAINER_ID } from "./constants"
import { BittensorSettingsModalRouter } from "./forms"
import { useBittensorSettingsModal } from "./hooks/useBittensorSettingsModal"
import { BittensorSettingsWizardProvider } from "./hooks/useBittensorSettingsWizard"

export const BittensorSettingsModal = () => {
  const { isOpen, close } = useBittensorSettingsModal()

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={close}>
      <div
        id={BITTENSOR_SETTINGS_MODAL_CONTENT_CONTAINER_ID} // acts as containerId for sub modals & drawers
        className={cn(
          "relative flex h-150 max-h-dvh w-100 max-w-dvw flex-col overflow-hidden bg-black",
          !IS_POPUP && "rounded border border-grey-850"
        )}
      >
        <BittensorSettingsWizardProvider>
          <Suspense fallback={<SuspenseTracker name="BittensorSettingsModal" />}>
            <BittensorSettingsModalRouter />
          </Suspense>
        </BittensorSettingsWizardProvider>
      </div>
    </Modal>
  )
}
