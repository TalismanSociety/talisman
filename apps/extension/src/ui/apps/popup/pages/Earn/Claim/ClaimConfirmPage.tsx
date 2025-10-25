import { BalanceDto, PendingActionDto } from "extension-core"
import { FC, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useSearchParams } from "react-router-dom"

import { ClaimDetails } from "@ui/domains/Earn/components/ClaimDetails"
import { ClaimSubmitButton } from "@ui/domains/Earn/components/ClaimSubmitButton"
import { useClaim } from "@ui/domains/Earn/components/useClaim"
import { ClaimWizardProvider, useClaimWizard } from "@ui/domains/Earn/context/ClaimWizardContext"
import { useYieldPosition } from "@ui/domains/Earn/hooks/useYieldPosition"
import { SendFundsProgress } from "@ui/domains/SendFunds/SendFundsProgress"

const ClaimConfirmPageContent: FC = () => {
  const { t } = useTranslation()
  const { set, resetUserInput } = useClaimWizard()
  const { token } = useClaim()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState<"confirm" | "progress">("confirm")
  const [progress, setProgress] = useState<{ networkId: string; txId: string } | null>(null)

  const yieldId = searchParams.get("yieldId")
  const account = searchParams.get("account")
  const validatorAddress = searchParams.get("validatorAddress")

  // Get the position data to find the balance with claim action
  const position = useYieldPosition(yieldId || undefined)
  const balanceWithClaim = position?.balances.find((b: BalanceDto) =>
    b.pendingActions?.some((a: PendingActionDto) => a.type === "CLAIM_REWARDS"),
  )

  // Initialize the wizard with the provided parameters
  useEffect(() => {
    if (account && yieldId && balanceWithClaim) {
      set("account", account)
      set("yieldId", yieldId)
      set("balance", balanceWithClaim)
      if (validatorAddress) {
        set("validatorAddress", validatorAddress)
      }
    }
  }, [account, yieldId, validatorAddress, balanceWithClaim, set])

  const handleTransactionError = (_error: Error) => {
    // eslint-disable-line @typescript-eslint/no-unused-vars
    // Could show error state or go back to confirm
    setCurrentStep("confirm")
  }

  const handleClose = () => {
    setCurrentStep("confirm")
    resetUserInput()
    // Navigate back to claim amount page with preserved parameters
    const params = new URLSearchParams()
    if (account) params.set("account", account)
    if (yieldId) params.set("yieldId", yieldId)
    if (validatorAddress) params.set("validatorAddress", validatorAddress)
    navigate(`/select-product/claim/amount?${params.toString()}`, { replace: true })
  }

  const handleTransactionSuccess = (txHash: string) => {
    setProgress({ networkId: token?.networkId || "", txId: txHash })
    setCurrentStep("progress")
  }

  const handleTransactionSubmitted = (_params: { networkId: string; txId: string }) => {
    // Handle transaction submission
    // Transaction submitted successfully
  }

  return (
    <div className="flex size-full flex-grow flex-col bg-black">
      <div className="flex w-full items-center justify-center gap-8 overflow-hidden p-10">
        <div className="text-base font-bold text-white">{t("Claim Rewards")}</div>
        <button
          type="button"
          onClick={handleClose}
          className="text-body-secondary hover:text-body absolute right-10 text-xl"
        >
          ×
        </button>
      </div>

      <div className="flex flex-col gap-16 px-10 pb-4">
        <div className="text-body text-center text-lg font-bold">
          {t("You're claiming rewards")}
        </div>
        <div className="flex flex-col gap-32">
          <ClaimDetails />
        </div>
      </div>

      <div className="grow overflow-hidden pt-0">
        <div className="flex h-full w-full flex-col px-12 pb-8">
          <div className="mt-auto">
            {currentStep === "confirm" && (
              <ClaimSubmitButton
                onSuccess={handleTransactionSuccess}
                onError={handleTransactionError}
                onTxSubmitted={handleTransactionSubmitted}
              />
            )}

            {currentStep === "progress" && progress && (
              <div className="flex h-full w-full flex-col">
                <SendFundsProgress
                  networkId={progress.networkId}
                  txId={progress.txId}
                  onClose={handleClose}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export const ClaimConfirmPage: FC = () => {
  return (
    <ClaimWizardProvider>
      <ClaimConfirmPageContent />
    </ClaimWizardProvider>
  )
}
