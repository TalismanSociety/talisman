import { classNames } from "@talismn/util"
import { Modal } from "@ui/components/Modal"

import { useSwapTokensModal } from "../hooks/useSwapTokensModal"
import { SwapProvider } from "../SwapProvider"
import {
  FullscreenPortalProvider,
  SwapTokensFullscreenPortalContainer,
} from "./SwapTokensFullscreenPortal"
import { SwapTokensWizard } from "./SwapTokensWizard"

// This control is injected directly in the layout of dashboard
export const SwapTokensModal = () => {
  const { isOpen, close, args } = useSwapTokensModal()

  return (
    <Modal
      isOpen={isOpen}
      onDismiss={close}
      className={classNames(
        "relative h-[60rem] w-[40rem] overflow-hidden border-grey-800 bg-black shadow",
        window.location.pathname === "/popup.html" ? "max-h-full max-w-full" : "rounded-lg border"
      )}
      containerId={window.location.pathname === "/popup.html" ? "main" : undefined}
    >
      <SwapProvider stateInit={args}>
        <FullscreenPortalProvider>
          <SwapTokensWizard />
          <SwapTokensFullscreenPortalContainer />
        </FullscreenPortalProvider>
      </SwapProvider>
    </Modal>
  )
}
