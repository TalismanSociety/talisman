import { Modal } from "@ui/components/Modal"
import { useMemo } from "react"

import { Acknowledgement } from "./Acknowledgement"
import { Complete } from "./Complete"
import { Stages, useMnemonicBackupModal } from "./context"
import { ShowMnemonic } from "./Show"

export const MnemonicBackupModalRouter = () => {
  const { close, isOpen, stage } = useMnemonicBackupModal()

  const Component = useMemo(() => {
    switch (stage) {
      case Stages.Acknowledgement:
        return Acknowledgement
      case Stages.Show:
      case Stages.Verify:
        return ShowMnemonic
      case Stages.Complete:
        return Complete
      default:
        return Acknowledgement
    }
  }, [stage])

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={close}>
      {Component && <Component />}
    </Modal>
  )
}
