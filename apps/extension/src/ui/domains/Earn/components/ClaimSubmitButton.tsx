import { classNames } from "@talismn/util"
import {
  isAccountPlatformEthereum,
  isAccountPlatformPolkadot,
  isAccountPlatformSolana,
  serializeTransactionRequest,
  SignerPayloadJSON,
} from "extension-core"
import { log } from "extension-shared"
import { FC, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { notify } from "@talisman/components/Notifications"
import { api } from "@ui/api"
import { useAccountByAddress } from "@ui/state"

// import { IS_POPUP } from "@ui/util/constants"

import { deserializeTransactionFromHex, serializeTransaction } from "../../../../inject/solana/util"
import { useClaimWizard } from "../context/ClaimWizardContext"
import { yieldApi } from "../services/yieldApi"
import { useClaim } from "./useClaim"

interface ClaimSubmitButtonProps {
  className?: string
  label?: string
  onSuccess?: (txHash: string) => void
  onError?: (error: Error) => void
  onTxSubmitted?: (params: { networkId: string; txId: string }) => void
}

export const ClaimSubmitButton: FC<ClaimSubmitButtonProps> = ({
  className,
  label,
  onSuccess,
  onError,
  onTxSubmitted,
}) => {
  const { t } = useTranslation()
  const { account, token, product, claimAmount, transaction } = useClaim()
  const accountData = useAccountByAddress(account as string)
  const allTransactions = useMemo(
    () => transaction?.allTransactions || [],
    [transaction?.allTransactions],
  )
  const { gotoProgress: _gotoProgress } = useClaimWizard()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentTransactionIndex, setCurrentTransactionIndex] = useState(0)

  const handleSubmit = useCallback(async () => {
    if (!account || !token || !product || !claimAmount) {
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

        log.debug("Processing claim transaction", {
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
                account as `0x${string}`,
                token.networkId,
              )
              currentNonce = nonceCount
            } catch (error) {
              // Fallback: increment the original nonce (same as deposit workflow)
              currentNonce = unsignedTx.nonce + i
              log.warn("Failed to fetch current nonce, using fallback", {
                error,
                nonce: currentNonce,
              })
            }
          }

          // Convert to proper transaction format (same as deposit workflow)
          const baseTx = {
            to: unsignedTx.to,
            value: BigInt(unsignedTx.value || "0"),
            data: unsignedTx.data,
            from: unsignedTx.from,
            gas: unsignedTx.gas ? BigInt(unsignedTx.gas) : undefined,
            nonce: currentNonce,
          }

          // Handle EIP-1559 vs legacy gas pricing (same as deposit workflow)
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
          const signedTx = await api.ethSignAndSend(token.networkId, serializedTx)
          txHash = signedTx
        } else if (isAccountPlatformPolkadot(accountData)) {
          // Handle Polkadot transaction
          const unsignedTx =
            typeof currentTransaction.unsignedTransaction === "string"
              ? JSON.parse(currentTransaction.unsignedTransaction)
              : currentTransaction.unsignedTransaction

          // Extract the actual transaction payload from the 'tx' property
          const payload = unsignedTx.tx || unsignedTx

          const result = await api.subSubmit(payload as unknown as SignerPayloadJSON)
          txHash = result.hash
        } else if (isAccountPlatformSolana(accountData)) {
          // Handle Solana transaction (same as deposit workflow)
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
          } catch (error) {
            log.error("Solana transaction processing failed", { error })
            throw new Error("Failed to process Solana transaction")
          }
        } else {
          throw new Error(`Unsupported account type: ${accountData?.type}`)
        }

        log.debug("Transaction signed and broadcasted", {
          transactionId: currentTransaction.id,
          txHash,
          index: i,
        })

        // Submit transaction hash to Yield.xyz API
        try {
          await yieldApi.submitHash(currentTransaction.id, { hash: txHash })
          log.debug("Transaction hash submitted to Yield.xyz", {
            transactionId: currentTransaction.id,
            txHash,
          })
        } catch (error) {
          log.error("Failed to submit hash to Yield.xyz", {
            error,
            transactionId: currentTransaction.id,
          })
          // Continue execution even if hash submission fails
        }

        // Notify about transaction submission
        onTxSubmitted?.({ networkId: token.networkId, txId: txHash })

        // Wait a bit before processing the next transaction
        if (i < allTransactions.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }

      // All transactions completed successfully
      const finalTxHash = allTransactions[allTransactions.length - 1]?.id || "unknown"
      onSuccess?.(finalTxHash)
      notify({ title: t("Claim successful"), type: "success" })
    } catch (error) {
      log.error("Claim transaction failed", { error })
      onError?.(error as Error)
      notify({ title: t("Claim failed"), type: "error" })
    } finally {
      setIsSubmitting(false)
    }
  }, [
    account,
    token,
    product,
    claimAmount,
    allTransactions,
    accountData,
    onError,
    onSuccess,
    onTxSubmitted,
    t,
  ])

  const isDisabled =
    isSubmitting || !account || !token || !product || !claimAmount || allTransactions.length === 0

  return (
    <Button
      primary
      className={classNames("w-full", className)}
      disabled={isDisabled}
      onClick={handleSubmit}
    >
      {isSubmitting ? (
        <span className="flex items-center gap-2">
          <span>{t("Processing...")}</span>
          <span className="text-xs opacity-75">
            ({currentTransactionIndex + 1}/{allTransactions.length})
          </span>
        </span>
      ) : (
        label || t("Confirm Claim")
      )}
    </Button>
  )
}
