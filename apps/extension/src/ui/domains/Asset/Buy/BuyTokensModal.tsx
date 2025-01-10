import { classNames } from "@talismn/util"
import { Modal } from "talisman-ui"

import { BuySell } from "@ui/domains/Ramp"

import { useBuyTokensModal } from "./useBuyTokensModal"

// This control is injected directly in the layout of dashboard
export const BuyTokensModal = () => {
  const { isOpen, close } = useBuyTokensModal()

  return (
    <Modal
      isOpen={isOpen}
      onDismiss={close}
      className={classNames(
        "border-grey-800 h-[60rem] w-[40rem] overflow-hidden bg-black shadow",
        window.location.pathname === "/popup.html" ? "max-h-full max-w-full" : "rounded-lg border",
      )}
      containerId={window.location.pathname === "/popup.html" ? "main" : undefined}
    >
      <div></div>
      <BuySell />
    </Modal>
  )
}
