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

import { deserializeTransactionFromHex, serializeTransaction } from "../../../../inject/solana/util"
import { useDepositWizard } from "../context/DepositWizardContext"
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
  const { account, token, product, deposit, allTransactions } = useDepositFunds()
  const accountData = useAccountByAddress(account?.address)
  const { gotoProgress } = useDepositWizard()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentTransactionIndex, setCurrentTransactionIndex] = useState(0)

  const handleSubmit = useCallback(async () => {
    if (!account || !token || !product || !deposit) {
      onError?.(new Error("Missing required data for transaction"))
      return
    }

    // Check if we have Yield.xyz transactions
    if (allTransactions.length === 0) {
      onError?.(new Error("No transactions available from Yield.xyz"))
      return
    }

    setIsSubmitting(true)

    try {
      // Execute all transactions sequentially
      for (let i = 0; i < allTransactions.length; i++) {
        const tx = allTransactions[i]
        const currentTransaction = tx as {
          id: string
          status?: string
          unsignedTransaction?: string | Record<string, unknown>
        }
        setCurrentTransactionIndex(i)

        log.debug("Processing transaction", {
          index: i,
          total: allTransactions.length,
          transactionId: currentTransaction.id,
          status: currentTransaction.status,
          platform: accountData?.type,
        })

        // Skip if transaction is marked as skipped
        if (currentTransaction.status === "SKIPPED") {
          log.debug("Skipping transaction", { transactionId: currentTransaction.id })
          continue
        }

        let txHash: string

        if (isAccountPlatformEthereum(accountData)) {
          // Parse and sign Ethereum transaction
          const unsignedTx =
            typeof currentTransaction.unsignedTransaction === "string"
              ? JSON.parse(currentTransaction.unsignedTransaction)
              : currentTransaction.unsignedTransaction

          // For sequential transactions, we need to get the current nonce
          // Yield.xyz provides static nonces, but we need dynamic ones
          let currentNonce = unsignedTx.nonce
          if (i > 0) {
            // For subsequent transactions, we need to fetch the current nonce
            // from the blockchain to avoid "nonce too low" errors
            try {
              const nonceCount = await api.ethGetTransactionsCount(
                account?.address as `0x${string}`,
                token.networkId,
              )
              currentNonce = nonceCount
            } catch (error) {
              // Fallback: increment the original nonce
              currentNonce = unsignedTx.nonce + i
              log.warn("Failed to fetch current nonce, using fallback", {
                error,
                nonce: currentNonce,
              })
            }
          }

          // Convert to proper transaction format
          const baseTx = {
            to: unsignedTx.to,
            value: BigInt(unsignedTx.value || "0"),
            data: unsignedTx.data,
            from: unsignedTx.from,
            gas: unsignedTx.gas ? BigInt(unsignedTx.gas) : undefined,
            nonce: currentNonce,
          }

          // Handle EIP-1559 vs legacy gas pricing
          let processedTx
          if (unsignedTx.maxFeePerGas && unsignedTx.maxPriorityFeePerGas) {
            // EIP-1559 transaction
            processedTx = {
              ...baseTx,
              type: "eip1559" as const,
              maxFeePerGas: BigInt(unsignedTx.maxFeePerGas),
              maxPriorityFeePerGas: BigInt(unsignedTx.maxPriorityFeePerGas),
            }
          } else if (unsignedTx.gasPrice) {
            // Legacy transaction
            processedTx = {
              ...baseTx,
              type: "legacy" as const,
              gasPrice: BigInt(unsignedTx.gasPrice),
            }
          } else {
            // Default to legacy
            processedTx = {
              ...baseTx,
              type: "legacy" as const,
            }
          }

          const serializedTx = serializeTransactionRequest(processedTx)

          txHash = await api.ethSignAndSend(token.networkId, serializedTx)

          // Call onTxSubmitted only for the last transaction, after it's submitted
          const isLastTransaction = i === allTransactions.length - 1
          if (isLastTransaction && onTxSubmitted && token) {
            // Trigger progress screen after submitting the last transaction
            onTxSubmitted({ networkId: token.networkId, txId: txHash })
          }
        } else if (isAccountPlatformPolkadot(accountData)) {
          // Handle Polkadot transaction
          const unsignedTx =
            typeof currentTransaction.unsignedTransaction === "string"
              ? JSON.parse(currentTransaction.unsignedTransaction)
              : currentTransaction.unsignedTransaction

          const result = await api.subSubmit(unsignedTx as unknown as SignerPayloadJSON)
          txHash = result.hash

          // Call onTxSubmitted only for the last transaction, after it's submitted
          const isLastTransaction = i === allTransactions.length - 1
          if (isLastTransaction && onTxSubmitted && token) {
            // Trigger progress screen after submitting the last transaction
            onTxSubmitted({ networkId: token.networkId, txId: txHash })
          }
        } else if (isAccountPlatformSolana(accountData)) {
          // Handle Solana transaction
          const unsignedTx =
            typeof currentTransaction.unsignedTransaction === "string"
              ? currentTransaction.unsignedTransaction
              : JSON.stringify(currentTransaction.unsignedTransaction)

          log.debug("Solana transaction data", {
            unsignedTx: unsignedTx.substring(0, 100) + "...",
            networkId: token.networkId,
            transactionId: currentTransaction.id,
          })

          try {
            // Deserialize the hex transaction to get the Solana transaction object
            const deserializedTx = deserializeTransactionFromHex(unsignedTx)
            if (!deserializedTx) {
              throw new Error("Failed to deserialize Solana transaction from hex")
            }

            // Serialize the transaction properly for api.solSubmit
            const serializedTx = serializeTransaction(deserializedTx)

            const result = await api.solSubmit(token.networkId, serializedTx)
            txHash = result.signature

            // Call onTxSubmitted only for the last transaction, after it's submitted
            const isLastTransaction = i === allTransactions.length - 1
            if (isLastTransaction && onTxSubmitted && token) {
              // Trigger progress screen after submitting the last transaction
              onTxSubmitted({ networkId: token.networkId, txId: txHash })
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            throw new Error(`Failed to process Solana transaction: ${errorMessage}`)
          }
        } else {
          throw new Error("Unsupported account platform")
        }

        // Submit hash to Yield.xyz
        await yieldApi.submitHash(currentTransaction.id, { hash: txHash })

        // Wait for transaction confirmation before proceeding
        try {
          await yieldApi.pollStatus(
            currentTransaction.id,
            undefined,
            2000, // Poll every 2 seconds
            300000, // 5 minutes timeout
          )
        } catch (pollError) {
          // Don't throw here - the transaction might still be successful
          log.warn("Transaction polling failed", { error: pollError, txId: currentTransaction.id })
        }
      }

      // All transactions completed successfully
      const lastTransaction = allTransactions[allTransactions.length - 1] as { id: string }
      const lastTxHash = lastTransaction?.id || "completed"
      onSuccess?.(lastTxHash)

      if (IS_POPUP && token) {
        gotoProgress({ networkId: token.networkId, txId: lastTxHash })
      }
    } catch (cause) {
      log.error("Failed to submit yield transactions", { cause, product: product.id })
      const error = cause as Error
      onError?.(error)
      notify({
        title: "Transaction Failed",
        type: "error",
        subtitle: error.message,
      })
    } finally {
      setIsSubmitting(false)
      setCurrentTransactionIndex(0)
    }
  }, [
    account,
    token,
    product,
    deposit,
    allTransactions,
    accountData,
    onError,
    onSuccess,
    onTxSubmitted,
    gotoProgress,
  ])

  // Debug logging for account platform detection
  log.debug("Account platform detection", {
    accountType: accountData?.type,
    isEthereum: isAccountPlatformEthereum(accountData),
    isPolkadot: isAccountPlatformPolkadot(accountData),
    isSolana: isAccountPlatformSolana(accountData),
    allTransactions: allTransactions.length,
  })

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

  const buttonLabel = isSubmitting
    ? allTransactions.length > 1
      ? t("Processing transaction {{current}} of {{total}}", {
          current: currentTransactionIndex + 1,
          total: allTransactions.length,
        })
      : t("Processing...")
    : label || t("Deposit")

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
