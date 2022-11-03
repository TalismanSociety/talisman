import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import styled from "styled-components"

import { BuyTokensForm } from "./BuyTokensForm"
import { useBuyTokensModal } from "./BuyTokensModalContext"

const Dialog = styled(ModalDialog)`
  overflow: visible;
  .content {
    overflow: visible;
  }
`

// This control is injected directly in the layout of dashboard
export const BuyTokensModal = () => {
  const { isOpen, close } = useBuyTokensModal()

  return (
    <Modal open={isOpen} onClose={close}>
      <Dialog title="Buy Crypto" onClose={close}>
        <BuyTokensForm />
      </Dialog>
    </Modal>
  )
}
