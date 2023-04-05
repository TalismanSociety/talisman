import { Drawer } from "@talisman/components/Drawer"
import { Modal } from "@talisman/components/Modal"
import { FC } from "react"

import { CopyAddressWizard } from "./CopyAddressWizard"
import { useCopyAddressModal } from "./useCopyAddressModal"

export const CopyAddressModal = () => {
  const { isOpen, close, inputs } = useCopyAddressModal()

  return (
    <Modal open={isOpen} anchor="center" onClose={close}>
      {inputs && <CopyAddressWizard inputs={inputs} />}
    </Modal>
  )
}
