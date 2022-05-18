import { Modal } from "@talisman/components/Modal"
import { useSendTokensModal } from "./SendTokensModalContext"
import { Send } from "./Send"

// This control is injected directly in the layout of dashboard
export const SendTokensModal = () => {
  const { config, isOpen } = useSendTokensModal()

  return (
    <Modal open={isOpen}>
      <Send {...config} />
    </Modal>
  )
}
