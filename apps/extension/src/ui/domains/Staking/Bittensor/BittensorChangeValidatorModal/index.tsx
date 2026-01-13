import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { cn } from "@talismn/util"
import { IS_POPUP } from "@ui/util/constants"
import { Suspense } from "react"
import { Modal } from "talisman-ui"

import { STAKING_MODAL_CONTENT_CONTAINER_ID } from "../../shared/ModalContent"
import { useBittensorChangeValidatorModal } from "../hooks/useBittensorChangeValidatorModal"
import { BittensorChangeValidatorWizardProvider } from "../hooks/useBittensorChangeValidatorWizard"
import { ChangeValidatorModalRouter } from "./Forms"

export const BittensorChangeValidatorModal = () => {
  const { isOpen, close } = useBittensorChangeValidatorModal()

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={close}>
      <div
        id={STAKING_MODAL_CONTENT_CONTAINER_ID}
        className={cn(
          "relative flex h-[60rem] max-h-[100dvh] w-[40rem] max-w-[100dvw] flex-col overflow-hidden bg-black",
          !IS_POPUP && "rounded border border-grey-850"
        )}
      >
        <BittensorChangeValidatorWizardProvider>
          <Suspense fallback={<SuspenseTracker name="BittensorChangeValidatorModal" />}>
            <ChangeValidatorModalRouter />
          </Suspense>
        </BittensorChangeValidatorWizardProvider>
      </div>
    </Modal>
  )
}
