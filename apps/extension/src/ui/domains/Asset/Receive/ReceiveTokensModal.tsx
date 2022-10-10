import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import styled from "styled-components"

import { ReceiveTokensForm } from "./ReceiveTokensForm"
import { useReceiveTokensModal } from "./ReceiveTokensModalContext"

const Dialog = styled(ModalDialog)`
  overflow: visible;
  .content {
    overflow: visible;
  }
`

// This control is injected directly in the layout of dashboard
export const ReceiveTokensModal = () => {
  const { isOpen, close } = useReceiveTokensModal()

  return (
    <Modal open={isOpen} onClose={close}>
      <Dialog title="Receive funds" onClose={close}>
        <ReceiveTokensForm />
      </Dialog>
    </Modal>
  )
}
