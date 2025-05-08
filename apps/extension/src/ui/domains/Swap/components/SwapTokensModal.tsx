import { classNames } from "@talismn/util"
import { Modal } from "talisman-ui"

import { useSwapTokensModal } from "../hooks/useSwapTokensModal"
import { SwapTokensFullscreenPortalContainer } from "./SwapTokensFullscreenPortal"
import { SwapTokensWizard } from "./SwapTokensWizard"

// This control is injected directly in the layout of dashboard
export const SwapTokensModal = () => {
  const { isOpen, close } = useSwapTokensModal()

  return (
    <Modal
      isOpen={isOpen}
      onDismiss={close}
      className={classNames(
        "border-grey-800 relative h-[60rem] w-[40rem] overflow-hidden bg-black shadow",
        window.location.pathname === "/popup.html" ? "max-h-full max-w-full" : "rounded-lg border",
      )}
      containerId={window.location.pathname === "/popup.html" ? "main" : undefined}
    >
      <SwapTokensWizard />
      <SwapTokensFullscreenPortalContainer />
    </Modal>
  )
}
