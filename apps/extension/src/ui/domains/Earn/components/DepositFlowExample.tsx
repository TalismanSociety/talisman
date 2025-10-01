import { useState } from "react"

import { ConfirmDepositModal } from "../ConfirmDepositModal"
import { DepositModal } from "../DepositModal"

interface DepositFlowExampleProps {
  isOpen: boolean
  onClose: () => void
  account: string
  tokenId: string
  productId: string
}

export const DepositFlowExample = ({
  isOpen,
  onClose,
  account,
  tokenId,
  productId,
}: DepositFlowExampleProps) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const handleDepositNext = () => {
    setShowConfirmModal(true)
  }

  const handleConfirmClose = () => {
    setShowConfirmModal(false)
    onClose()
  }

  return (
    <>
      <DepositModal
        isOpen={isOpen && !showConfirmModal}
        onClose={onClose}
        onNext={handleDepositNext}
        account={account}
        tokenId={tokenId}
        productId={productId}
      />
      <ConfirmDepositModal
        isOpen={showConfirmModal}
        onClose={handleConfirmClose}
        account={account}
        tokenId={tokenId}
        productId={productId}
      />
    </>
  )
}
