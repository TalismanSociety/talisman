import { Suspense } from "react"
import { Modal } from "talisman-ui"

import { SuspenseTracker } from "@talisman/components/SuspenseTracker"

import { ModalContent } from "../../shared/ModalContent"
import { useBittensorBondModal } from "../hooks/useBittensorBondModal"
import { BittensorBondModalBody } from "./BittensorBondModalBody"
import { BittensorModalHeader } from "./BittensorModalHeader"

export const BittensorBondModal = () => {
  const { isOpen, close } = useBittensorBondModal()

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={close}>
      <Suspense fallback={<SuspenseTracker name="BittensorBondModal" />}>
        <ModalContent ModalHeader={BittensorModalHeader} ModalBody={BittensorBondModalBody} />
      </Suspense>
    </Modal>
  )
}
