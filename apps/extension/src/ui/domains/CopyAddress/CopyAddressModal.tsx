import { classNames } from "@talismn/util"
import { Modal, useOpenCloseWithData } from "talisman-ui"

import { CopyAddressWizard } from "./CopyAddressWizard"
import { useCopyAddressModal } from "./useCopyAddressModal"

export const CopyAddressModal = () => {
  const { isOpen, close, inputs } = useCopyAddressModal()

  return (
    <Modal
      blur
      isOpen={isOpen}
      onDismiss={close}
      className={classNames(
        "border-grey-800 h-[60rem] w-[40rem] overflow-hidden bg-black shadow",
        window.location.pathname === "/popup.html" ? "max-h-full max-w-full" : "rounded-lg border"
      )}
    >
      {inputs && <CopyAddressWizard inputs={inputs} />}
    </Modal>
  )
}
