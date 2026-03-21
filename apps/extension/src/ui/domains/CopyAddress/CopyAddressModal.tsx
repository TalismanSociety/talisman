import { classNames } from "@talismn/util"
import { Modal } from "@ui/components/Modal"

import { CopyAddressWizard } from "./CopyAddressWizard"
import { useCopyAddressModal } from "./useCopyAddressModal"

export const CopyAddressModal = () => {
  const { isOpen, close, inputs = {} } = useCopyAddressModal()

  return (
    <Modal
      isOpen={isOpen}
      onDismiss={close}
      className={classNames(
        "h-150 w-100 overflow-hidden border-grey-800 bg-black shadow-xs",
        window.location.pathname === "/popup.html"
          ? "max-h-full max-w-full"
          : "rounded-lg border border-grey-800"
      )}
      containerId={window.location.pathname === "/popup.html" ? "main" : undefined}
    >
      <CopyAddressWizard inputs={inputs} />
    </Modal>
  )
}
