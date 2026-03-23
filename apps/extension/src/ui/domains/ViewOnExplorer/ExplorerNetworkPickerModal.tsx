import { Modal } from "@ui/components/Modal"
import { cn } from "@ui/util/cn"
import type { FC } from "react"

import { ExplorerNetworkPicker } from "./ExplorerNetworkPicker"
import { useExplorerNetworkPickerModal } from "./useExplorerNetworkPickerModal"

export const ExplorerNetworkPickerModal: FC = () => {
  const { isOpen, close, inputs } = useExplorerNetworkPickerModal()

  return (
    <Modal
      isOpen={isOpen}
      onDismiss={close}
      className={cn(
        "h-150 w-100 overflow-hidden border-grey-800 bg-black shadow-xs",
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
