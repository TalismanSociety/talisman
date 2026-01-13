import { classNames } from "@talismn/util"
import { Modal } from "talisman-ui"

import { CopyAddressWizard } from "./CopyAddressWizard"
import { useCopyAddressModal } from "./useCopyAddressModal"

export const CopyAddressModal = () => {
  const { isOpen, close, inputs = {} } = useCopyAddressModal()

  return (
    <Modal
      isOpen={isOpen}
      onDismiss={close}
      className={classNames(
        "border-grey-800 h-[60rem] w-[40rem] overflow-hidden bg-black shadow",
        window.location.pathname === "/popup.html" ? "max-h-full max-w-full" : "rounded-lg border"
      )}
      containerId={window.location.pathname === "/popup.html" ? "main" : undefined}
    >
      <CopyAddressWizard inputs={inputs} />
    </Modal>
  )
}
