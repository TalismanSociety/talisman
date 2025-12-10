import { FC, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useSearchParams } from "react-router-dom"

import { ClaimAmountForm } from "@ui/domains/Earn/components/ClaimAmountForm"
import { ClaimWizardProvider, useClaimWizard } from "@ui/domains/Earn/context/ClaimWizardContext"
import { useYieldxyzPosition } from "@ui/domains/Earn/hooks/useYieldxyzPosition"

const ClaimAmountPageContent: FC = () => {
  const { t } = useTranslation()
  const { set, resetUserInput } = useClaimWizard()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const yieldId = searchParams.get("yieldId")
  const account = searchParams.get("account")
  const validatorAddress = searchParams.get("validatorAddress")

  // Get the position data to find the balance with claim action
  const position = useYieldxyzPosition(yieldId || undefined)
  const balanceWithClaim = position?.balances.find((b) =>
    b.pendingActions?.some((a) => a.type === "CLAIM_REWARDS"),
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

  const handleNext = () => {
    // Navigate to confirm page
    navigate(`/select-product/claim/confirm?${searchParams.toString()}`)
  }

  const handleClose = () => {
    resetUserInput()
    // Navigate back to the position or portfolio
    navigate("/portfolio", { replace: true })
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
      <div className="w-full grow overflow-hidden">
        <ClaimAmountForm onNext={handleNext} />
      </div>
    </div>
  )
}

export const ClaimAmountPage: FC = () => {
  return (
    <ClaimWizardProvider>
      <ClaimAmountPageContent />
    </ClaimWizardProvider>
  )
}
