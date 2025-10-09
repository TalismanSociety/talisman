import { classNames } from "@talismn/util"
import {
  isAccountPlatformEthereum,
  isAccountPlatformPolkadot,
  isAccountPlatformSolana,
  serializeTransactionRequest,
  SignerPayloadJSON,
} from "extension-core"
import { log } from "extension-shared"
import { FC, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { notify } from "@talisman/components/Notifications"
import { api } from "@ui/api"
import { useAccountByAddress } from "@ui/state"
import { IS_POPUP } from "@ui/util/constants"

import { useDepositWizard } from "../context/DepositWizardContext"
import { useDepositFunds } from "./useDepositFunds"

interface YieldSubmitButtonProps {
  className?: string
  label?: string
  onSuccess?: (txHash: string) => void
  onError?: (error: Error) => void
  onTxSubmitted?: (params: { networkId: string; txId: string }) => void
}

export const YieldSubmitButton: FC<YieldSubmitButtonProps> = ({
  className,
  label,
  onSuccess,
  onError,
  onTxSubmitted,
}) => {
  const { t } = useTranslation()
  const { account, token, product, deposit, transaction } = useDepositFunds()
  const accountData = useAccountByAddress(account?.address)
  const { gotoProgress } = useDepositWizard()

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Consolidated function to handle transaction completion logic
  const handleTransactionCompletion = useCallback(
    async (currentTransaction: { id: string }, isLastTransaction: boolean, txHash: string) => {
      // For standard transactions, we don't need Yield.xyz API calls
      // Just handle the success callback
      if (isLastTransaction) {
        onSuccess?.(txHash)

        if (onTxSubmitted && token) {
          onTxSubmitted({ networkId: token.networkId, txId: txHash })
        } else if (IS_POPUP && token) {
          gotoProgress({ networkId: token.networkId, txId: txHash })
        }
      }
    },
    [onSuccess, onTxSubmitted, token, gotoProgress],
  )

  const handleSubmit = useCallback(async () => {
    if (!account || !token || !product || !deposit || !transaction?.tx) {
      onError?.(new Error("Missing required data for transaction"))
      return
    }

    setIsSubmitting(true)

    try {
      // Use standard transaction data
      const currentTransaction = { id: "standard-tx" }
      const isLastTransaction = true

      if (isAccountPlatformEthereum(accountData)) {
        // For Ethereum, use standard transaction data
        const serializedTx = serializeTransactionRequest(transaction.tx)
        const txHash = await api.ethSignAndSend(token.networkId, serializedTx)
        await handleTransactionCompletion(currentTransaction, isLastTransaction, txHash)
      } else if (isAccountPlatformPolkadot(accountData)) {
        // For Polkadot, use standard transaction data
        const result = await api.subSubmit(transaction.tx as SignerPayloadJSON)
        await handleTransactionCompletion(currentTransaction, isLastTransaction, result.hash)
      } else if (isAccountPlatformSolana(accountData)) {
        // For Solana, use standard transaction data
        const result = await api.solSubmit(token.networkId, transaction.tx)
        await handleTransactionCompletion(currentTransaction, isLastTransaction, result.signature)
      } else {
        throw new Error("Unsupported account platform")
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
    }
  }, [
    account,
    token,
    product,
    deposit,
    transaction,
    accountData,
    onError,
    handleTransactionCompletion,
  ])

  if (
    !isAccountPlatformEthereum(accountData) &&
    !isAccountPlatformPolkadot(accountData) &&
    !isAccountPlatformSolana(accountData)
  ) {
    return (
      <Button className={classNames("w-full", className)} disabled>
        {t("Unsupported account type")}
      </Button>
    )
  }

  const buttonLabel = label || t("Deposit")

  return (
    <Button
      className={classNames("w-full", className)}
      primary
      onClick={handleSubmit}
      processing={isSubmitting}
    >
      {buttonLabel}
    </Button>
  )
}
