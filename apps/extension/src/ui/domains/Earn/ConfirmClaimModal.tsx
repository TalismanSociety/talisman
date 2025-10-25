import { classNames } from "@talismn/util"
import { BalanceDto } from "extension-core"
import { Suspense, useEffect, useState } from "react"
import { Modal } from "talisman-ui"

import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { ClaimDetails } from "@ui/domains/Earn/components/ClaimDetails"
import { ClaimSubmitButton } from "@ui/domains/Earn/components/ClaimSubmitButton"
import { useClaim } from "@ui/domains/Earn/components/useClaim"
import { ClaimWizardProvider, useClaimWizard } from "@ui/domains/Earn/context/ClaimWizardContext"
import { SendFundsProgress } from "@ui/domains/SendFunds/SendFundsProgress"
import { IS_POPUP } from "@ui/util/constants"

interface ConfirmClaimModalProps {
  isOpen: boolean
  onClose: () => void
  yieldId: string
  account: string
  balance: BalanceDto
  validatorAddress?: string
}

const ConfirmClaimModalContent = ({
  onClose,
  yieldId,
  account,
  balance: _balance,
  validatorAddress,
}: Omit<ConfirmClaimModalProps, "isOpen">) => {
  const [currentStep, setCurrentStep] = useState<"confirm" | "progress">("confirm")
  const { set, resetUserInput } = useClaimWizard()
  const { token: _token } = useClaim()
  const [progress, setProgress] = useState<{ networkId: string; txId: string } | null>(null)

  // Initialize the wizard with the provided parameters
  useEffect(() => {
    if (account && yieldId) {
      set("account", account)
      set("yieldId", yieldId)
      set("balance", _balance)
      if (validatorAddress) {
        set("validatorAddress", validatorAddress)
      }
    }
  }, [account, yieldId, validatorAddress, _balance, set])

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
      id="confirm-claim-modal-content"
      className={classNames(
        "relative flex h-[60rem] max-h-[100dvh] w-[40rem] max-w-[100dvw] flex-col overflow-hidden bg-black",
        !IS_POPUP && "border-grey-800 rounded border",
      )}
    >
      <div className="flex w-full items-center justify-center gap-8 overflow-hidden p-10">
        <div className="text-base font-bold text-white">Claim Rewards</div>
        <button
          type="button"
          onClick={handleClose}
          className="text-body-secondary hover:text-body absolute right-10 text-xl"
        >
          ×
        </button>
      </div>

      <div className="flex flex-col gap-16 px-10 pb-4">
        <div className="text-body text-center text-lg font-bold">You're claiming rewards</div>
        <div className="flex flex-col gap-32">
          <ClaimDetails />
        </div>
      </div>

      <div className="grow overflow-hidden pt-0">
        {currentStep === "confirm" && (
          <div className="flex h-full w-full flex-col px-12 pb-8">
            <div className="mt-auto">
              <ClaimSubmitButton
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

export const ConfirmClaimModal = ({
  isOpen,
  onClose,
  yieldId,
  account,
  balance,
  validatorAddress,
}: ConfirmClaimModalProps) => {
  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={onClose}>
      <Suspense fallback={<SuspenseTracker name="ConfirmClaimModal" />}>
        <ClaimWizardProvider>
          <ConfirmClaimModalContent
            onClose={onClose}
            yieldId={yieldId}
            account={account}
            balance={balance}
            validatorAddress={validatorAddress}
          />
        </ClaimWizardProvider>
      </Suspense>
    </Modal>
  )
}
