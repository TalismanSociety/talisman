import { Modal } from "@ui/components/Modal"
import { PopupSizeModalContainer } from "@ui/components/PopupSizeModalContainer"
import { SuspenseTracker } from "@ui/components/SuspenseTracker"
import { TxProgress } from "@ui/domains/Transactions/TxProgress"
import { type FC, Suspense } from "react"

import { useBittensorChangeLockHotkeyModal } from "../hooks/useBittensorChangeLockHotkeyModal"
import { BittensorChangeLockHotkeyConfirm } from "./BittensorChangeLockHotkeyConfirm"
import { BittensorChangeLockHotkeyForm } from "./BittensorChangeLockHotkeyForm"
import {
  BITTENSOR_CHANGE_LOCK_HOTKEY_MODAL_CONTAINER_ID,
  BittensorChangeLockHotkeyWizardProvider,
  useBittensorChangeLockHotkeyWizard,
} from "./useBittensorChangeLockHotkeyWizard"

const BittensorChangeLockHotkeyRouter = () => {
  const { step, hash, networkId, close } = useBittensorChangeLockHotkeyWizard()

  switch (step) {
    case "form":
      return <BittensorChangeLockHotkeyForm />
    case "confirm":
      return <BittensorChangeLockHotkeyConfirm />
    case "submitted":
      return hash ? (
        <div className="size-full p-12">
          <TxProgress hash={hash} networkIdOrHash={networkId} onClose={close} />
        </div>
      ) : null
  }
}

export const BittensorChangeLockHotkeyModal: FC = () => {
  const { isOpen, args, close } = useBittensorChangeLockHotkeyModal()

  return (
    <Modal isOpen={isOpen && !!args} onDismiss={close}>
      <PopupSizeModalContainer id={BITTENSOR_CHANGE_LOCK_HOTKEY_MODAL_CONTAINER_ID}>
        {!!args && (
          <BittensorChangeLockHotkeyWizardProvider
            // reset wizard state whenever it is opened for a different subnet/account
            key={`${args.networkId}-${args.netuid}-${args.address ?? ""}`}
          >
            <Suspense fallback={<SuspenseTracker name="BittensorChangeLockHotkeyModal" />}>
              <BittensorChangeLockHotkeyRouter />
            </Suspense>
          </BittensorChangeLockHotkeyWizardProvider>
        )}
      </PopupSizeModalContainer>
    </Modal>
  )
}
