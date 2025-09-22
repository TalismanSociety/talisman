import { classNames } from "@talismn/util"
import { isAccountPlatformEthereum, serializeTransactionRequest } from "extension-core"
import { log } from "extension-shared"
import { FC, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { notify } from "@talisman/components/Notifications"
import { api } from "@ui/api"
import { useAccountByAddress } from "@ui/state"

import { yieldApi } from "../services/yieldApi"
import { useDepositFunds } from "./useDepositFunds"

interface YieldSubmitButtonProps {
  className?: string
  label?: string
  disabled?: boolean
  onSuccess?: (txHash: string) => void
  onError?: (error: Error) => void
}

export const YieldSubmitButton: FC<YieldSubmitButtonProps> = ({
  className,
  label,
  disabled,
  onSuccess,
  onError,
}) => {
  const { t } = useTranslation()
  const { account, token, product, deposit, transaction } = useDepositFunds()
  const accountData = useAccountByAddress(account?.address)

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

      // Step 3: Poll for status
      setCurrentStep("Waiting for confirmation...")
      const finalStatus = await yieldApi.pollStatus(yieldTx.id, (status) => {
        // Update UI with status updates
        if (status.status === "PENDING") {
          setCurrentStep("Transaction pending...")
        }
      })

      if (finalStatus.status === "CONFIRMED") {
        setCurrentStep("Transaction confirmed!")
        onSuccess?.(hash)
      } else {
        throw new Error(`Transaction failed: ${finalStatus.error || "Unknown error"}`)
      }
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
  }, [account, token, product, deposit, transaction, onSuccess, onError])

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
