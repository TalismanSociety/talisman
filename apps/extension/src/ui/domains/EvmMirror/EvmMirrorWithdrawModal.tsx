import { Modal } from "@ui/components/Modal"
import { PopupSizeModalContainer } from "@ui/components/PopupSizeModalContainer"
import { SuspenseTracker } from "@ui/components/SuspenseTracker"
import { TxProgress } from "@ui/domains/Transactions/TxProgress"
import { type FC, Suspense } from "react"

import { EvmMirrorWithdrawConfirm } from "./EvmMirrorWithdrawConfirm"
import { EvmMirrorWithdrawForm } from "./EvmMirrorWithdrawForm"
import { useEvmMirrorWithdrawModal } from "./useEvmMirrorWithdrawModal"
import {
  EVM_MIRROR_WITHDRAW_MODAL_CONTAINER_ID,
  EvmMirrorWithdrawWizardProvider,
  useEvmMirrorWithdrawWizard,
} from "./useEvmMirrorWithdrawWizard"

const EvmMirrorWithdrawRouter = () => {
  const { step, hash, token, close } = useEvmMirrorWithdrawWizard()

  switch (step) {
    case "amount":
      return <EvmMirrorWithdrawForm />
    case "confirm":
      return <EvmMirrorWithdrawConfirm />
    case "submitted":
      return hash && token ? (
        <div className="size-full p-12">
          <TxProgress hash={hash} networkIdOrHash={token.networkId} onClose={close} />
        </div>
      ) : null
  }
}

export const EvmMirrorWithdrawModal: FC = () => {
  const { isOpen, args, openKey, close } = useEvmMirrorWithdrawModal()

  return (
    <Modal analyticsId="evm_mirror_withdraw" isOpen={isOpen && !!args} onDismiss={close}>
      <PopupSizeModalContainer id={EVM_MIRROR_WITHDRAW_MODAL_CONTAINER_ID}>
        {!!args && (
          <EvmMirrorWithdrawWizardProvider key={openKey}>
            <Suspense fallback={<SuspenseTracker name="EvmMirrorWithdrawModal" />}>
              <EvmMirrorWithdrawRouter />
            </Suspense>
          </EvmMirrorWithdrawWizardProvider>
        )}
      </PopupSizeModalContainer>
    </Modal>
  )
}
