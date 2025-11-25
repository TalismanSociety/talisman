import { cn } from "@talismn/util"
import { Suspense } from "react"
import { Modal } from "talisman-ui"

import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { IS_POPUP } from "@ui/util/constants"

import { STAKING_MODAL_CONTENT_CONTAINER_ID } from "../../shared/ModalContent"
import { useBittensorBondModal } from "../hooks/useBittensorBondModal"
import { BittensorBondWizardProvider } from "../hooks/useBittensorBondWizard"
import { BittensorBondModalRouter } from "./Forms"

export const BittensorBondModal = () => {
  const { isOpen, close } = useBittensorBondModal()

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={close}>
      <div
        id={STAKING_MODAL_CONTENT_CONTAINER_ID} // acts as containerId for sub modals & drawers
        className={cn(
          "relative flex h-[60rem] max-h-[100dvh] w-[40rem] max-w-[100dvw] flex-col overflow-hidden bg-black",
          !IS_POPUP && "border-grey-850 rounded border",
        )}
      >
        <BittensorBondWizardProvider>
          <Suspense fallback={<SuspenseTracker name="BittensorBondModal" />}>
            <BittensorBondModalRouter />
          </Suspense>
        </BittensorBondWizardProvider>
      </div>
    </Modal>
  )
}
