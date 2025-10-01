import { classNames } from "@talismn/util"
import { Suspense } from "react"
import { Modal } from "talisman-ui"

import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { IS_POPUP } from "@ui/util/constants"

import { useEarnModal } from "../../hooks/useEarnModal"
import { ProductSelectionModalBody } from "./ProductSelectionModalBody"
import { ProductSelectionModalHeader } from "./ProductSelectionModalHeader"

export const ProductSelectionModal = () => {
  const { isOpen, close, tokenId } = useEarnModal()

  // In popup mode, don't render the modal - the ProductionSelectionPage will handle the full page view
  if (IS_POPUP) {
    return null
  }

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={close}>
      <Suspense fallback={<SuspenseTracker name="ProductSelectionModal" />}>
        <div
          className={classNames(
            "relative flex h-[60rem] max-h-[100dvh] w-[40rem] max-w-[100dvw] flex-col overflow-hidden bg-black",
            !IS_POPUP && "border-grey-800 rounded border",
          )}
        >
          <ProductSelectionModalHeader onClose={close} />
          <div className="grow overflow-hidden px-10 pb-10">
            <ProductSelectionModalBody tokenId={tokenId || ""} />
          </div>
        </div>
      </Suspense>
    </Modal>
  )
}
