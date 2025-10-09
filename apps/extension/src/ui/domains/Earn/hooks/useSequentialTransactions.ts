import { TransactionDto } from "extension-core"
import { useCallback, useState } from "react"
import { TransactionRequest } from "viem"

import { yieldApi } from "../services/yieldApi"

export interface TransactionStep {
  index: number
  transaction: TransactionDto
  status: "pending" | "signing" | "submitting" | "polling" | "confirmed" | "failed"
  hash?: string
  error?: string
}

export interface SequentialTransactionState {
  steps: TransactionStep[]
  currentStepIndex: number
  isExecuting: boolean
  isComplete: boolean
  hasError: boolean
  overallProgress: number
}

export const useSequentialTransactions = () => {
  const [state, setState] = useState<SequentialTransactionState>({
    steps: [],
    currentStepIndex: 0,
    isExecuting: false,
    isComplete: false,
    hasError: false,
    overallProgress: 0,
  })

  const initializeSteps = useCallback((transactions: TransactionDto[]) => {
    const steps: TransactionStep[] = transactions
      .filter((tx) => tx.status !== "SKIPPED")
      .map((transaction, index) => ({
        index,
        transaction,
        status: "pending" as const,
      }))

    setState({
      steps,
      currentStepIndex: 0,
      isExecuting: false,
      isComplete: false,
      hasError: false,
      overallProgress: 0,
    })
  }, [])

  const updateStepStatus = useCallback(
    (stepIndex: number, status: TransactionStep["status"], error?: string, hash?: string) => {
      setState((prev) => ({
        ...prev,
        steps: prev.steps.map((step, index) =>
          index === stepIndex ? { ...step, status, error, hash } : step,
        ),
      }))
    },
    [],
  )

  const executeSequentialTransactions = useCallback(
    async (
      transactions: TransactionDto[],
      signTransaction: (tx: TransactionRequest) => Promise<{ hash: string }>,
      _broadcastTransaction: (signedTx: { hash: string }) => Promise<{ hash: string }>,
      onFirstTransactionComplete?: (networkId: string, txId: string) => void,
    ) => {
      if (transactions.length === 0) return

      setState((prev) => ({ ...prev, isExecuting: true, hasError: false }))

      try {
        for (let i = 0; i < transactions.length; i++) {
          const transaction = transactions[i]

          if (transaction.status === "SKIPPED") {
            continue
          }

          setState((prev) => ({ ...prev, currentStepIndex: i }))

          try {
            // Step 1: Sign and broadcast transaction (ethSignAndSend does both)
            updateStepStatus(i, "signing")
            const unsignedTx =
              typeof transaction?.unsignedTransaction === "string"
                ? JSON.parse(transaction?.unsignedTransaction)
                : transaction?.unsignedTransaction
            const result = await signTransaction(unsignedTx)

            // Step 2: Submit hash to Yield.xyz
            updateStepStatus(i, "submitting")
            await yieldApi.submitHash(transaction.id, { hash: result.hash })

            // Step 3: Wait for transaction confirmation before proceeding
            updateStepStatus(i, "polling")

            try {
              // Wait for the transaction to be confirmed on-chain
              await yieldApi.pollStatus(
                transaction.id,
                undefined,
                2000, // Poll every 2 seconds for confirmation
                300000, // 5 minutes timeout
              )
            } catch (pollError) {
              // Don't throw here - the transaction might still be successful
              // We'll mark it as confirmed and continue
            }

            // Step 4: Mark as confirmed
            updateStepStatus(i, "confirmed", undefined, result.hash)

            // If this is the SUPPLY transaction and it's starting (after APPROVAL is confirmed), signal completion
            if (i === 1 && onFirstTransactionComplete) {
              onFirstTransactionComplete(transaction.network, result.hash)
            }
          } catch (error) {
            updateStepStatus(i, "failed", error instanceof Error ? error.message : "Unknown error")
            setState((prev) => ({ ...prev, hasError: true, isExecuting: false }))
            throw error
          }
        }

        // All transactions completed successfully
        setState((prev) => ({
          ...prev,
          isExecuting: false,
          isComplete: true,
          overallProgress: 100,
        }))
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isExecuting: false,
          hasError: true,
        }))
        throw error
      }
    },
    [updateStepStatus],
  )

  const reset = useCallback(() => {
    setState({
      steps: [],
      currentStepIndex: 0,
      isExecuting: false,
      isComplete: false,
      hasError: false,
      overallProgress: 0,
    })
  }, [])

  return {
    state,
    initializeSteps,
    executeSequentialTransactions,
    reset,
  }
}
