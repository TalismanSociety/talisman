import { Suspense } from "react"
import { Modal } from "talisman-ui"

import { SuspenseTracker } from "@talisman/components/SuspenseTracker"

import { BittensorBondModalBody } from "./BittensorBondModalBody"
import { useBittensorBondModal } from "./hooks/useBittensorBondModal"

export const BittensorBondModal = () => {
  const { isOpen, close } = useBittensorBondModal()

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={close}>
      <Suspense fallback={<SuspenseTracker name="BittensorBondModal" />}>
        <BittensorBondModalBody />
      </Suspense>
    </Modal>
  )
}
