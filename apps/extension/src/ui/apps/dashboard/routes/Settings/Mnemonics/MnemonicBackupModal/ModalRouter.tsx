/* eslint-disable react/display-name */
import { useMemo } from "react"
import { Modal, ModalDialog } from "talisman-ui"

import { Acknowledgement } from "./Acknowledgement"
import { Stages, useMnemonicBackupModal } from "./context"
import { ShowMnemonic } from "./ShowMnemonic"
import { TitleComponent } from "./types"

export const MnemonicBackupModalRouter = () => {
  const { close, isOpen, stage } = useMnemonicBackupModal()

  const Component: TitleComponent = useMemo(() => {
    switch (stage) {
      case Stages.Acknowledgement:
        return Acknowledgement
      case Stages.Show:
        return ShowMnemonic
      case Stages.Verify:
        return () => <>Verify</>
      case Stages.Complete:
        return () => <>Complete</>
      default:
        return Acknowledgement
    }
  }, [stage])

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={close}>
      <ModalDialog
        className="!w-[54rem] p-2"
        title={<span className="text-md font-semibold">{Component.title}</span>}
        onClose={close}
      >
        {Component && <Component />}
      </ModalDialog>
    </Modal>
  )
}
