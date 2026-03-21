import { classNames } from "@talismn/util"
import { Modal } from "@ui/components/Modal"
import type { FC } from "react"

import { ExplorerNetworkPicker } from "./ExplorerNetworkPicker"
import { useExplorerNetworkPickerModal } from "./useExplorerNetworkPickerModal"

export const ExplorerNetworkPickerModal: FC = () => {
  const { isOpen, close, inputs } = useExplorerNetworkPickerModal()

  return (
    <Modal
      isOpen={isOpen}
      onDismiss={close}
      className={classNames(
        "h-[37.5rem] w-[25rem] overflow-hidden border-grey-800 bg-black shadow-xs",
        window.location.pathname === "/popup.html"
          ? "max-h-full max-w-full"
          : "rounded-lg border border-grey-800"
      )}
      containerId={window.location.pathname === "/popup.html" ? "main" : undefined}
    >
      {!!inputs && <ExplorerNetworkPicker address={inputs.address} onClose={close} />}
    </Modal>
  )
}
