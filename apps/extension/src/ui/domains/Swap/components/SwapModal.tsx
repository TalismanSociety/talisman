import { Modal } from "@ui/components/Modal"
import { PopupSizeModalContainer } from "@ui/components/PopupSizeModalContainer"

import { useSwapModal } from "../hooks/useSwapModal"
import { SwapProvider } from "../SwapProvider"
import { SwapWizard } from "./SwapWizard"

// This control is injected directly in the layout of dashboard
export const SwapModal = () => {
  const { isOpen, close, args } = useSwapModal()

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={close}>
      <PopupSizeModalContainer id="swap-modal">
        <SwapProvider stateInit={args}>
          <SwapWizard />
        </SwapProvider>
      </PopupSizeModalContainer>
    </Modal>
  )
}
