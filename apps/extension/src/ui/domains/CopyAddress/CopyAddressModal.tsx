import { Modal } from "@talisman/components/Modal"
import { classNames } from "@talismn/util"

import { CopyAddressWizard } from "./CopyAddressWizard"
import { useCopyAddressModal } from "./useCopyAddressModal"

export const CopyAddressModal = () => {
  const { isOpen, close, inputs } = useCopyAddressModal()

  return (
    <Modal open={isOpen} anchor="center" onClose={close}>
      <div
        className={classNames(
          "border-grey-800 h-[60rem] w-[40rem]  overflow-hidden bg-black shadow",
          // TODO adjust
          window.location.pathname === "/popup.html" ? "max-h-full max-w-full" : "rounded-lg border"
        )}
      >
        {inputs && <CopyAddressWizard inputs={inputs} />}
      </div>
    </Modal>
  )
}
