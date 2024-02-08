import { Modal } from "talisman-ui"

import { Acknowledgement } from "./Acknowledgement"
import { Complete } from "./Complete"
import { MnemonicCreateModalProvider, Stages, useMnemonicCreateModal } from "./context"
import { MnemonicCreateForm } from "./MnenomicForm"
import { Verify } from "./Verify"

export { MnemonicCreateModalProvider, useMnemonicCreateModal }

export const MnemonicCreateModal = () => {
  const { stage, cancel, isOpen } = useMnemonicCreateModal()

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={cancel}>
      {stage === Stages.Acknowledgement && <Acknowledgement />}
      {stage === Stages.Create && <MnemonicCreateForm />}
      {stage === Stages.Verify && <Verify />}
      {stage === Stages.Complete && <Complete />}
    </Modal>
  )
}
