import { classNames } from "@talismn/util"
import { Suspense, useEffect, useState } from "react"
import { Modal } from "talisman-ui"

import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { DepositDetails } from "@ui/domains/Earn/components/DepositDetails"
import { DepositProgressBar } from "@ui/domains/Earn/components/DepositProgressBar"
import { useDepositFunds } from "@ui/domains/Earn/components/useDepositFunds"
import { YieldSubmitButton } from "@ui/domains/Earn/components/YieldSubmitButton"
import {
  DepositWizardProvider,
  useDepositWizard,
} from "@ui/domains/Earn/context/DepositWizardContext"
import { SendFundsProgress } from "@ui/domains/SendFunds/SendFundsProgress"
import { IS_POPUP } from "@ui/util/constants"

interface ConfirmDepositModalProps {
  isOpen: boolean
  onClose: () => void
  account: string
  tokenId: string
  productId: string
  validatorAddress?: string
}

const ConfirmDepositModalContent = ({
  onClose,
  account,
  tokenId,
  productId,
  validatorAddress,
}: Omit<ConfirmDepositModalProps, "isOpen">) => {
  const [currentStep, setCurrentStep] = useState<"confirm" | "progress">("confirm")
  const [transactionStep, _setTransactionStep] = useState<1 | 2>(1)
  const { set, resetUserInput } = useDepositWizard()
  const { token } = useDepositFunds()
  const [progress, setProgress] = useState<{ networkId: string; txId: string } | null>(null)

  // Initialize the wizard with the provided parameters
  useEffect(() => {
    if (account && tokenId && productId) {
      set("account", account)
      set("tokenId", tokenId)
      set("productId", productId)
      if (validatorAddress) {
        set("validatorAddress", validatorAddress)
      }
    }
  }, [account, tokenId, productId, validatorAddress, set])

  // In popup mode, don't render the modal - the pages will handle the full page view
  if (IS_POPUP) {
    return null
  }

  const handleTransactionError = (_error: Error) => {
    // Could show error state or go back to confirm
    setCurrentStep("confirm")
  }

  const handleClose = () => {
    setCurrentStep("confirm")
    resetUserInput()
    onClose()
  }

  return (
    <div
      id="confirm-deposit-modal-content"
      className={classNames(
        "relative flex h-[60rem] max-h-[100dvh] w-[40rem] max-w-[100dvw] flex-col overflow-hidden bg-black",
        !IS_POPUP && "border-grey-800 rounded border",
      )}
    >
      <div className="flex w-full items-center justify-center gap-8 overflow-hidden p-10">
        <div className="text-base font-bold text-white">Staking</div>
        <button
          type="button"
          onClick={handleClose}
          className="text-body-secondary hover:text-body absolute right-10 text-xl"
        >
          ×
        </button>
      </div>

      <div className="flex flex-col gap-16 px-10 pb-4">
        <div className="text-body text-center text-lg font-bold">You're approving staking</div>
        <div className="flex flex-col gap-32">
          <DepositProgressBar
            currentStep={transactionStep}
            tokenSymbol={token?.symbol || "Token"}
          />
          <DepositDetails />
        </div>
      </div>

      <div className="grow overflow-hidden pt-0">
        {currentStep === "confirm" && (
          <div className="flex h-full w-full flex-col px-12 pb-8">
            <div className="mt-auto">
              <YieldSubmitButton
                onError={handleTransactionError}
                onTxSubmitted={({ networkId, txId }) => {
                  setCurrentStep("progress")
                  setProgress({ networkId, txId })
                }}
              />
            </div>
          </div>
        )}
        {currentStep === "progress" && progress && (
          <Modal containerId="main" isOpen={true} onDismiss={onClose}>
            <div className="relative h-full w-[40rem] bg-black px-12 py-8">
              <SendFundsProgress
                networkId={progress.networkId}
                txId={progress.txId}
                onClose={onClose}
              />
            </div>
          </Modal>
        )}
      </div>
    </div>
  )
}

export const ConfirmDepositModal = ({
  isOpen,
  onClose,
  account,
  tokenId,
  productId,
  validatorAddress,
}: ConfirmDepositModalProps) => {
  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={onClose}>
      <Suspense fallback={<SuspenseTracker name="ConfirmDepositModal" />}>
        <DepositWizardProvider>
          <ConfirmDepositModalContent
            onClose={onClose}
            account={account}
            tokenId={tokenId}
            productId={productId}
            validatorAddress={validatorAddress}
          />
        </DepositWizardProvider>
      </Suspense>
    </Modal>
  )
}
