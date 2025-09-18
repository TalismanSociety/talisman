import { Suspense } from "react"
import { Modal } from "talisman-ui"

import { SuspenseTracker } from "@talisman/components/SuspenseTracker"

import { EarnModalBody } from "./EarnModalBody"
import { EarnModalHeader } from "./EarnModalHeader"
import { useEarnModal } from "./hooks/useEarnModal"

export const EarnModal = () => {
  const { isOpen, close, tokenId } = useEarnModal()

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={close}>
      <Suspense fallback={<SuspenseTracker name="EarnModal" />}>
        <div className="flex h-[600px] max-h-[80vh] min-w-[400px] flex-col gap-12 rounded-[20px] border border-[#5A5A5A] bg-black p-8">
          <EarnModalHeader onClose={close} />
          <EarnModalBody tokenId={tokenId || ""} />
        </div>
      </Suspense>
    </Modal>
  )
}
