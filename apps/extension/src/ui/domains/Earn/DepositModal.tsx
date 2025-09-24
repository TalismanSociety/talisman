import { classNames } from "@talismn/util"
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
      className={classNames(
        "relative flex h-[60rem] max-h-[100dvh] w-[40rem] max-w-[100dvw] flex-col overflow-hidden bg-black",
        !IS_POPUP && "border-grey-800 rounded border",
      )}
    >
      <div className="flex w-full items-center justify-between gap-8 overflow-hidden p-10">
        <div className="text-base font-bold">
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

      <div className="grow overflow-hidden p-12 pt-0">
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
