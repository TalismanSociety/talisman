import { Modal } from "@ui/components/Modal"
import { PopupSizeModalContainer } from "@ui/components/PopupSizeModalContainer"
import { SuspenseTracker } from "@ui/components/SuspenseTracker"
import { TxProgress } from "@ui/domains/Transactions/TxProgress"
import { type FC, Suspense } from "react"

import { useBittensorConvictionLockModal } from "../hooks/useBittensorConvictionLockModal"
import { BittensorConvictionLockConfirm } from "./BittensorConvictionLockConfirm"
import { BittensorConvictionLockForm } from "./BittensorConvictionLockForm"
import {
  BITTENSOR_LOCK_MODAL_CONTAINER_ID,
  BittensorConvictionLockWizardProvider,
  useBittensorConvictionLockWizard,
} from "./useBittensorConvictionLockWizard"

const BittensorConvictionLockRouter = () => {
  const { step, hash, networkId, close } = useBittensorConvictionLockWizard()

  switch (step) {
    case "form":
      return <BittensorConvictionLockForm />
    case "confirm":
      return <BittensorConvictionLockConfirm />
    case "submitted":
      return hash ? (
        <div className="size-full p-12">
          <TxProgress hash={hash} networkIdOrHash={networkId} onClose={close} />
        </div>
      ) : null
  }
}

export const BittensorConvictionLockModal: FC = () => {
  const { isOpen, args, close } = useBittensorConvictionLockModal()

  return (
    <Modal isOpen={isOpen && !!args} onDismiss={close}>
      <PopupSizeModalContainer id={BITTENSOR_LOCK_MODAL_CONTAINER_ID}>
        {!!args && (
          <BittensorConvictionLockWizardProvider
            // reset wizard state whenever it is opened for a different subnet/account
            key={`${args.networkId}-${args.netuid}-${args.address ?? ""}`}
          >
            <Suspense fallback={<SuspenseTracker name="BittensorConvictionLockModal" />}>
              <BittensorConvictionLockRouter />
            </Suspense>
          </BittensorConvictionLockWizardProvider>
        )}
      </PopupSizeModalContainer>
    </Modal>
  )
}
