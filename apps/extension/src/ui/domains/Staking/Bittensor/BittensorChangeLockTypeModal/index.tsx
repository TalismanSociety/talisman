import { Modal } from "@ui/components/Modal"
import { PopupSizeModalContainer } from "@ui/components/PopupSizeModalContainer"
import { SuspenseTracker } from "@ui/components/SuspenseTracker"
import { TxProgress } from "@ui/domains/Transactions/TxProgress"
import { type FC, Suspense } from "react"

import { useBittensorChangeLockTypeModal } from "../hooks/useBittensorChangeLockTypeModal"
import { BittensorChangeLockTypeConfirm } from "./BittensorChangeLockTypeConfirm"
import { BittensorChangeLockTypeForm } from "./BittensorChangeLockTypeForm"
import {
  BITTENSOR_CHANGE_LOCK_TYPE_MODAL_CONTAINER_ID,
  BittensorChangeLockTypeWizardProvider,
  useBittensorChangeLockTypeWizard,
} from "./useBittensorChangeLockTypeWizard"

const BittensorChangeLockTypeRouter = () => {
  const { step, hash, networkId, close } = useBittensorChangeLockTypeWizard()

  switch (step) {
    case "form":
      return <BittensorChangeLockTypeForm />
    case "confirm":
      return <BittensorChangeLockTypeConfirm />
    case "submitted":
      return hash ? (
        <div className="size-full p-12">
          <TxProgress hash={hash} networkIdOrHash={networkId} onClose={close} />
        </div>
      ) : null
  }
}

export const BittensorChangeLockTypeModal: FC = () => {
  const { isOpen, args, close } = useBittensorChangeLockTypeModal()

  return (
    <Modal isOpen={isOpen && !!args} onDismiss={close}>
      <PopupSizeModalContainer id={BITTENSOR_CHANGE_LOCK_TYPE_MODAL_CONTAINER_ID}>
        {!!args && (
          <BittensorChangeLockTypeWizardProvider
            // reset wizard state whenever it is opened for a different subnet/account
            key={`${args.networkId}-${args.netuid}-${args.address ?? ""}`}
          >
            <Suspense fallback={<SuspenseTracker name="BittensorChangeLockTypeModal" />}>
              <BittensorChangeLockTypeRouter />
            </Suspense>
          </BittensorChangeLockTypeWizardProvider>
        )}
      </PopupSizeModalContainer>
    </Modal>
  )
}
