import { classNames } from "@talismn/util"
import { FC } from "react"
import { Modal } from "talisman-ui"

import { ExplorerNetworkPicker } from "./ExplorerNetworkPicker"
import { useExplorerNetworkPickerModal } from "./useExplorerNetworkPickerModal"

export const ExplorerNetworkPickerModal: FC = () => {
  const { isOpen, close, inputs } = useExplorerNetworkPickerModal()

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
      {!!inputs && <ExplorerNetworkPicker address={inputs.address} onClose={close} />}
    </Modal>
  )
}
