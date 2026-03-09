import { Modal } from "@ui/components/Modal"
import { PopupSizeModalContainer } from "@ui/components/PopupSizeModalContainer"

import { useSwapTokensModal } from "../hooks/useSwapTokensModal"
import { SwapProvider } from "../SwapProvider"
import { SwapTokensWizard } from "./SwapTokensWizard"

// This control is injected directly in the layout of dashboard
export const SwapTokensModal = () => {
  const { isOpen, close, args } = useSwapTokensModal()

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={close}>
      <PopupSizeModalContainer id="swap-modal">
        <SwapProvider stateInit={args}>
          <SwapTokensWizard />
        </SwapProvider>
      </PopupSizeModalContainer>
    </Modal>
  )
}
