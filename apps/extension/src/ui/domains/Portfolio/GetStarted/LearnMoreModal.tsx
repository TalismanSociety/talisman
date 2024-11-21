import { Modal, useOpenClose } from "talisman-ui"

export const useLearnMoreModal = () => useOpenClose()

export const LearnMoreModal = () => {
  const { isOpen, close } = useLearnMoreModal()

  return (
    <Modal isOpen={isOpen} onDismiss={close} containerId="main">
      hi
    </Modal>
  )
}
