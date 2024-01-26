import { Modal } from "talisman-ui"

import { Acknowledgement } from "./Acknowledgement"
import { MnemonicCreateModalProvider, Stages, useMnemonicCreateModal } from "./context"
import { MnemonicCreateForm } from "./MnenomicForm"

export { MnemonicCreateModalProvider, useMnemonicCreateModal }

export const MnemonicCreateModal = () => {
  const { stage, cancel, isOpen } = useMnemonicCreateModal()

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={cancel}>
      {stage === Stages.Acknowledgement && <Acknowledgement />}
      {stage === Stages.Show && <MnemonicCreateForm />}
    </Modal>
  )
}
