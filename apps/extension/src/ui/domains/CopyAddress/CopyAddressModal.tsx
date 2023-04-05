import { Modal } from "@talisman/components/Modal"

import { CopyAddressWizard } from "./CopyAddressWizard"
import { useCopyAddressModal } from "./useCopyAddressModal"

export const CopyAddressModal = () => {
  const { isOpen, close, inputs } = useCopyAddressModal()

  return (
    <Modal open={isOpen} anchor="center" onClose={close}>
      <div className="border-grey-800 h-[60rem] w-[40rem] overflow-hidden rounded-lg border bg-black shadow">
        {inputs && <CopyAddressWizard inputs={inputs} />}
      </div>
    </Modal>
  )
}
