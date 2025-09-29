import { classNames } from "@talismn/util"
import {
  isAccountPlatformEthereum,
  isAccountPlatformPolkadot,
  serializeTransactionRequest,
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

  const handleSubmit = useCallback(async () => {
    if (!account || !token || !product || !deposit || !allTransactions.length) {
      onError?.(new Error("Missing required data for yield transaction"))
      return
    }

    setIsSubmitting(true)

    try {
      // Get the current nonce for the account before processing transactions
      const address = account.address as `0x${string}`
      const currentNonce = await api.ethGetTransactionsCount(address, token.networkId)

      // Process all transactions sequentially
      for (let i = 0; i < allTransactions.length; i++) {
        const currentTransaction = allTransactions[i]
        const isLastTransaction = i === allTransactions.length - 1
        if (currentTransaction.status === "SKIPPED") {
          continue
        }

        if (isAccountPlatformEthereum(accountData)) {
          // For Ethereum, parse the unsigned transaction and create a proper TransactionRequest
          if (!currentTransaction?.unsignedTransaction) {
            throw new Error(`No unsigned transaction data available for transaction ${i + 1}`)
          }

          const unsignedTx = JSON.parse(currentTransaction.unsignedTransaction)
          const txRequest = {
            to: unsignedTx.to as `0x${string}`,
            value: BigInt(unsignedTx.value || "0"),
            data: unsignedTx.data as `0x${string}`,
            from: account?.address as `0x${string}`,
            gas: unsignedTx.gas
              ? BigInt(unsignedTx.gas) + (BigInt(unsignedTx.gas) * 10n) / 100n
              : undefined,
            nonce: currentNonce + i, // Use calculated nonce instead of unsignedTx.nonce
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

            if (onTxSubmitted) {
              onTxSubmitted({ networkId: token.networkId, txId: txHash })
            } else if (IS_POPUP) {
              gotoProgress({ networkId: token.networkId, txId: txHash })
            }
          }
        } else if (isAccountPlatformPolkadot(accountData)) {
          // For Polkadot, parse the unsigned transaction to get the SignerPayloadJSON
          if (!currentTransaction?.unsignedTransaction) {
            throw new Error(`No unsigned transaction data available for transaction ${i + 1}`)
          }

          const signerPayload = JSON.parse(currentTransaction.unsignedTransaction)

          const result = await api.subSubmit(signerPayload)

          // Submit hash to Yield.xyz
          await yieldApi.submitHash(currentTransaction.id, { hash: result.hash })

          // Poll for transaction confirmation before proceeding to next transaction
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

          // Only trigger progress bar change and callbacks for the last transaction
          if (isLastTransaction) {
            onSuccess?.(result.hash)

            if (onTxSubmitted) {
              onTxSubmitted({ networkId: token.networkId, txId: result.hash })
            } else if (IS_POPUP) {
              gotoProgress({ networkId: token.networkId, txId: result.hash })
            }
          }
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
    onSuccess,
    onError,
    gotoProgress,
    onTxSubmitted,
  ])

  if (!isAccountPlatformEthereum(accountData) && !isAccountPlatformPolkadot(accountData)) {
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
