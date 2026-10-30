import { Modal } from "@ui/components/Modal"
import { PopupSizeModalContainer } from "@ui/components/PopupSizeModalContainer"

import { useSwapModal } from "../hooks/useSwapModal"
import { SwapProvider } from "../SwapProvider"
import { SwapWizard } from "./SwapWizard"

// This control is injected directly in the layout of dashboard
export const SwapModal = () => {
  const { isOpen, close, args, openKey } = useSwapModal()

  return (
    <Modal analyticsId="swap" containerId="main" isOpen={isOpen} onDismiss={close}>
      <PopupSizeModalContainer id="swap-modal">
        {/* a swap plan's recovery opens the modal again from inside it, with a new swap to prefill */}
        <SwapProvider key={openKey} stateInit={args} isOpen={isOpen}>
          <SwapWizard />
        </SwapProvider>
      </PopupSizeModalContainer>
    </Modal>
  )
}
