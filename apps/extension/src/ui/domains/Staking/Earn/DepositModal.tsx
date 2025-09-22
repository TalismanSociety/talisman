import { Suspense, useEffect, useState } from "react"
import { Modal } from "talisman-ui"

import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { IS_POPUP } from "@ui/util/constants"

import { DepositAmountForm } from "./components/DepositAmountForm"
import { DepositConfirmForm } from "./components/DepositConfirmForm"
import { DepositWizardProvider, useDepositWizard } from "./context/DepositWizardContext"

interface DepositModalProps {
  isOpen: boolean
  onClose: () => void
  account: string
  tokenId: string
  productId: string
}

const DepositModalContent = ({
  onClose,
  account,
  tokenId,
  productId,
}: Omit<DepositModalProps, "isOpen">) => {
  const [currentStep, setCurrentStep] = useState<"amount" | "confirm">("amount")
  const { set } = useDepositWizard()

  // Initialize the wizard with the provided parameters
  useEffect(() => {
    if (account && tokenId && productId) {
      set("account", account)
      set("tokenId", tokenId)
      set("productId", productId)
    }
  }, [account, tokenId, productId, set])

  // In popup mode, don't render the modal - the pages will handle the full page view
  if (IS_POPUP) {
    return null
  }

  const handleNext = () => {
    setCurrentStep("confirm")
  }

  const handleBack = () => {
    setCurrentStep("amount")
  }

  const handleClose = () => {
    setCurrentStep("amount")
    onClose()
  }

  return (
    <div className="flex h-[600px] max-h-[80vh] min-w-[400px] flex-col gap-12 rounded-[20px] border border-[#5A5A5A] bg-black p-8">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">
          {currentStep === "amount" ? "Deposit" : "Confirm Deposit"}
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="text-body-secondary hover:text-body text-xl"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {currentStep === "amount" ? (
          <DepositAmountForm onNext={handleNext} />
        ) : (
          <DepositConfirmForm onBack={handleBack} onClose={handleClose} />
        )}
      </div>
    </div>
  )
}

export const DepositModal = ({
  isOpen,
  onClose,
  account,
  tokenId,
  productId,
}: DepositModalProps) => {
  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={onClose}>
      <Suspense fallback={<SuspenseTracker name="DepositModal" />}>
        <DepositWizardProvider>
          <DepositModalContent
            onClose={onClose}
            account={account}
            tokenId={tokenId}
            productId={productId}
          />
        </DepositWizardProvider>
      </Suspense>
    </Modal>
  )
}
