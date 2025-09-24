import { classNames } from "@talismn/util"
import { isAccountPlatformEthereum, serializeTransactionRequest } from "extension-core"
import { log } from "extension-shared"
import { FC, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { notify } from "@talisman/components/Notifications"
import { api } from "@ui/api"
import { useAccountByAddress } from "@ui/state"
import { IS_POPUP } from "@ui/util/constants"

import { useDepositWizard } from "../context/DepositWizardContext"
import { yieldApi } from "../services/yieldApi"
import { useDepositFunds } from "./useDepositFunds"

interface YieldSubmitButtonProps {
  className?: string
  label?: string
  disabled?: boolean
  onSuccess?: (txHash: string) => void
  onError?: (error: Error) => void
  onTxSubmitted?: (params: { networkId: string; txId: string }) => void
}

export const YieldSubmitButton: FC<YieldSubmitButtonProps> = ({
  className,
  label,
  disabled,
  onSuccess,
  onError,
  onTxSubmitted,
}) => {
  const { t } = useTranslation()
  const { account, token, product, deposit, transaction } = useDepositFunds()
  const accountData = useAccountByAddress(account?.address)
  const { gotoProgress } = useDepositWizard()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentStep, setCurrentStep] = useState<string | null>(null)

  const handleSubmit = useCallback(async () => {
    if (!account || !token || !product || !deposit || !transaction?.yieldTransaction) {
      onError?.(new Error("Missing required data for yield transaction"))
      return
    }

    setIsSubmitting(true)
    setCurrentStep("Preparing transaction...")

    try {
      const yieldTx = transaction.yieldTransaction

      // Step 1: Sign the transaction
      setCurrentStep("Signing transaction...")
      if (!transaction.tx) throw new Error("No transaction data available")

      const serialized = serializeTransactionRequest(transaction.tx)
      if (!serialized) throw new Error("Failed to serialize transaction request")
      const hash = await api.ethSignAndSend(token.networkId, serialized, {
        type: "transfer", // Use transfer type for yield deposits
        tokenId: token.id,
        value: deposit.planck.toString(),
        to: transaction.tx?.to || "",
      })

      // Step 2: Submit hash to Yield.xyz
      setCurrentStep("Submitting to Yield.xyz...")
      await yieldApi.submitHash(yieldTx.id, { hash })

      // Step 3: Hand off to progress screen
      if (onTxSubmitted) {
        // Modal context - call onTxSubmitted
        onTxSubmitted({ networkId: token.networkId, txId: hash })
      } else if (IS_POPUP) {
        // Popup context - use gotoProgress
        gotoProgress({ networkId: token.networkId, txId: hash })
      }
      onSuccess?.(hash)
      return
    } catch (cause) {
      log.error("Failed to submit yield transaction", { cause, product: product.id })
      const error = cause as Error
      onError?.(error)
      notify({
        title: "Transaction Failed",
        type: "error",
        subtitle: error.message,
      })
    } finally {
      setIsSubmitting(false)
      setCurrentStep(null)
    }
  }, [
    account,
    token,
    product,
    deposit,
    transaction,
    onSuccess,
    onError,
    gotoProgress,
    onTxSubmitted,
  ])

  if (!isAccountPlatformEthereum(accountData)) {
    return (
      <Button className={classNames("w-full", className)} disabled>
        {t("Unsupported account type")}
      </Button>
    )
  }

  const buttonLabel = isSubmitting ? currentStep || t("Processing...") : label || t("Deposit")

  return (
    <Button
      className={classNames("w-full", className)}
      primary
      disabled={disabled || isSubmitting}
      onClick={handleSubmit}
      processing={isSubmitting}
    >
      {buttonLabel}
    </Button>
  )
}
