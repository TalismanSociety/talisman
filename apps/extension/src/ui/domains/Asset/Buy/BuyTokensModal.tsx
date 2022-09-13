import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"

import { BuyTokensForm } from "./BuyTokensForm"
import { useBuyTokensModal } from "./BuyTokensModalContext"

// This control is injected directly in the layout of dashboard
export const BuyTokensModal = () => {
  const { isOpen, close } = useBuyTokensModal()

  return (
    <Modal open={isOpen} onClose={close}>
      <ModalDialog title="Buy Crypto" onClose={close}>
        <BuyTokensForm />
      </ModalDialog>
    </Modal>
  )
}
