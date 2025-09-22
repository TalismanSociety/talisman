import { Suspense, useEffect, useState } from "react"
import { Modal } from "talisman-ui"

import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { SendFundsProgress } from "@ui/domains/SendFunds/SendFundsProgress"
import { IS_POPUP } from "@ui/util/constants"

import { DepositAmountForm } from "./components/DepositAmountForm"
import { DepositConfirmForm } from "./components/DepositConfirmForm"
import { SequentialTransactionExecutor } from "./components/SequentialTransactionExecutor"
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
  const [currentStep, setCurrentStep] = useState<"amount" | "confirm" | "execute" | "progress">(
    "amount",
  )
  const { set, resetUserInput } = useDepositWizard()
  const [progress, setProgress] = useState<{ networkId: string; txId: string } | null>(null)

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

  const _handleExecute = () => {
    setCurrentStep("execute")
  }

  const handleExecutionComplete = (networkId: string, txId: string) => {
    setCurrentStep("progress")
    setProgress({ networkId, txId })
  }

  const handleExecutionError = (_error: Error) => {
    // Could show error state or go back to confirm
    setCurrentStep("confirm")
  }

  const handleClose = () => {
    setCurrentStep("amount")
    resetUserInput()
    onClose()
  }

  return (
    <div
      id="deposit-modal-content"
      className="flex h-[600px] max-h-[80vh] min-w-[400px] flex-col gap-12 rounded-[20px] border border-[#5A5A5A] bg-black p-8"
    >
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">
          {currentStep === "amount"
            ? "Deposit"
            : currentStep === "confirm"
              ? "Confirm Deposit"
              : currentStep === "execute"
                ? "Executing Transactions"
                : "Transfer in progress"}
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
        {currentStep === "amount" && <DepositAmountForm onNext={handleNext} />}
        {currentStep === "confirm" && (
          <DepositConfirmForm
            onBack={handleBack}
            onClose={handleClose}
            onTxSubmitted={({
              networkId: _networkId,
              txId: _txId,
            }: {
              networkId: string
              txId: string
            }) => {
              // switch to sequential execution
              setCurrentStep("execute")
            }}
          />
        )}
        {currentStep === "execute" && (
          <SequentialTransactionExecutor
            onComplete={handleExecutionComplete}
            onError={handleExecutionError}
            onTransactionComplete={(networkId, txId) => {
              setProgress({ networkId, txId })
            }}
          />
        )}
        {currentStep === "progress" && progress && (
          <div className="h-full w-full">
            <SendFundsProgress networkId={progress.networkId} txId={progress.txId} />
          </div>
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
