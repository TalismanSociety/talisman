import { Modal } from "@ui/components/Modal"
import { cn } from "@ui/util/cn"

import { RampsFormRouter } from "./RampsFormRouter"
import { useRampsModal } from "./useRampsModal"

// This control is injected directly in the layout of dashboard
export const RampsModal = () => {
  const { isOpen, close } = useRampsModal()

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
      <div id="ramp-container" className="relative size-full overflow-hidden">
        <RampsFormRouter />
      </div>
    </Modal>
  )
}
