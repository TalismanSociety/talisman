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
import { useYieldTransaction } from "../hooks/useYieldTransaction"
import { yieldApi } from "../services/yieldApi"
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
  const { account, token, product, deposit } = useDepositFunds()
  const accountData = useAccountByAddress(account?.address)
  const { gotoProgress } = useDepositWizard()
  const { allTransactions } = useYieldTransaction()

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Consolidated function to handle transaction completion logic
  const handleTransactionCompletion = useCallback(
    async (currentTransaction: { id: string }, isLastTransaction: boolean, txHash: string) => {
      // Submit hash to Yield.xyz
      await yieldApi.submitHash(currentTransaction.id, { hash: txHash })

      // Poll for transaction confirmation before proceeding to next transaction
      if (!isLastTransaction) {
        try {
          await yieldApi.pollStatus(
            currentTransaction.id,
            undefined,
            2000, // Poll every 2 seconds
            300000, // 5 minutes timeout
          )
        } catch (pollError) {
          // Don't throw here - the transaction might still be successful
          // We'll continue to the next transaction
          log.warn("Transaction polling failed, but continuing", { pollError })
        }
      }

      // Only trigger progress bar change and callbacks for the last transaction
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
    if (!account || !token || !product || !deposit || !allTransactions.length) {
      onError?.(new Error("Missing required data for yield transaction"))
      return
    }

    setIsSubmitting(true)

    try {
      // Process all transactions sequentially
      for (let i = 0; i < allTransactions.length; i++) {
        const currentTransaction = allTransactions[i]
        const isLastTransaction = i === allTransactions.length - 1
        if (currentTransaction.status === "SKIPPED") {
          continue
        }

        if (isAccountPlatformEthereum(accountData)) {
          // Get the current nonce for Ethereum accounts
          const address = account.address as `0x${string}`
          const currentNonce = await api.ethGetTransactionsCount(address, token.networkId)
          // For Ethereum, parse the unsigned transaction and create a proper TransactionRequest
          if (!currentTransaction?.unsignedTransaction) {
            throw new Error(`No unsigned transaction data available for transaction ${i + 1}`)
          }

          const unsignedTx =
            typeof currentTransaction?.unsignedTransaction === "string"
              ? JSON.parse(currentTransaction?.unsignedTransaction)
              : currentTransaction?.unsignedTransaction
          const txRequest = {
            to: unsignedTx.to as `0x${string}`,
            value: BigInt(unsignedTx.value || "0"),
            data: unsignedTx.data as `0x${string}`,
            from: account?.address as `0x${string}`,
            gas: unsignedTx.gas
              ? BigInt(unsignedTx.gas) + (BigInt(unsignedTx.gas) * 10n) / 100n
              : undefined,
            nonce: currentNonce + i, // Use calculated nonce for Ethereum
            ...(unsignedTx.maxFeePerGas && unsignedTx.maxPriorityFeePerGas
              ? {
                  maxFeePerGas: BigInt(unsignedTx.maxFeePerGas),
                  maxPriorityFeePerGas: BigInt(unsignedTx.maxPriorityFeePerGas),
                  type: "eip1559" as const,
                }
              : unsignedTx.gasPrice
                ? {
                    gasPrice: BigInt(unsignedTx.gasPrice),
                    type: "legacy" as const,
                  }
                : {}),
          }

          const serializedTx = serializeTransactionRequest(txRequest)

          const txHash = await api.ethSignAndSend(token.networkId, serializedTx)

          // Handle transaction completion (polling, callbacks, etc.)
          await handleTransactionCompletion(currentTransaction, isLastTransaction, txHash)
        } else if (isAccountPlatformPolkadot(accountData)) {
          // For Polkadot, parse the unsigned transaction to get the SignerPayloadJSON
          if (!currentTransaction?.unsignedTransaction) {
            throw new Error(`No unsigned transaction data available for transaction ${i + 1}`)
          }

          const signerPayload =
            typeof currentTransaction?.unsignedTransaction === "string"
              ? JSON.parse(currentTransaction?.unsignedTransaction)
              : currentTransaction?.unsignedTransaction

          const result = await api.subSubmit(signerPayload?.tx as SignerPayloadJSON)

          // Handle transaction completion (polling, callbacks, etc.)
          await handleTransactionCompletion(currentTransaction, isLastTransaction, result.hash)
        } else if (isAccountPlatformSolana(accountData)) {
          // For Solana, parse the unsigned transaction to get the transaction data
          if (!currentTransaction?.unsignedTransaction) {
            throw new Error(`No unsigned transaction data available for transaction ${i + 1}`)
          }

          const transactionData =
            typeof currentTransaction?.unsignedTransaction === "string"
              ? JSON.parse(currentTransaction?.unsignedTransaction)
              : currentTransaction?.unsignedTransaction

          const result = await api.solSubmit(token.networkId, transactionData)

          // Handle transaction completion (polling, callbacks, etc.)
          await handleTransactionCompletion(currentTransaction, isLastTransaction, result.signature)
        }
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
    allTransactions,
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
