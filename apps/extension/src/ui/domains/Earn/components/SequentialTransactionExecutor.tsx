import { useEffect } from "react"
import { useTranslation } from "react-i18next"

import { useDepositWizard } from "../context/DepositWizardContext"
import { useSequentialTransactions } from "../hooks/useSequentialTransactions"
import { useWalletIntegration } from "../hooks/useWalletIntegration"
import { useYieldTransaction } from "../hooks/useYieldTransaction"

interface SequentialTransactionExecutorProps {
  onComplete?: (networkId: string, txId: string) => void
  onError?: (error: Error) => void
  onTransactionComplete?: (networkId: string, txId: string) => void
}

export const SequentialTransactionExecutor = ({
  onComplete,
  onError,
  onTransactionComplete,
}: SequentialTransactionExecutorProps) => {
  const { t } = useTranslation()
  const { account } = useDepositWizard()
  const { nonSkippedTransactions, isLoading: isYieldLoading } = useYieldTransaction()

  // Get the network ID from the first transaction
  const networkId = nonSkippedTransactions[0]?.network
  const { signTransaction, broadcastTransaction, canSign } = useWalletIntegration(
    account,
    networkId,
  )
  const { state, initializeSteps, executeSequentialTransactions, reset } =
    useSequentialTransactions()

  // Initialize steps when transactions are available
  useEffect(() => {
    if (nonSkippedTransactions.length > 0 && state.steps.length === 0) {
      initializeSteps(nonSkippedTransactions)
    }
  }, [nonSkippedTransactions, initializeSteps, state.steps.length])

  // Execute transactions when ready
  useEffect(() => {
    if (
      state.steps.length > 0 &&
      !state.isExecuting &&
      !state.isComplete &&
      !state.hasError &&
      !isYieldLoading
    ) {
      executeSequentialTransactions(
        nonSkippedTransactions,
        signTransaction,
        broadcastTransaction,
        (networkId, txId) => {
          onComplete?.(networkId, txId)
        },
      ).catch((error) => {
        onError?.(error)
      })
    }
  }, [
    state.steps.length,
    state.isExecuting,
    state.isComplete,
    state.hasError,
    isYieldLoading,
    nonSkippedTransactions,
    executeSequentialTransactions,
    signTransaction,
    broadcastTransaction,
    onComplete,
    onError,
    onTransactionComplete,
  ])

  if (!canSign) {
    return (
      <div className="text-center text-red-500">
        {t("Cannot sign transactions with a watched account")}
      </div>
    )
  }

  if (state.steps.length === 0) {
    return <div className="text-center text-gray-400">{t("Preparing transactions...")}</div>
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold">
          {t("Executing Transactions")} ({state.currentStepIndex + 1}/{state.steps.length})
        </h3>
        <div className="mt-2 text-sm text-gray-400">
          {state.isComplete ? t("All transactions completed") : t("Processing...")}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 w-full rounded-full bg-gray-200">
        <div
          className="h-2 rounded-full bg-blue-600 transition-all duration-300"
          style={{ width: `${(state.currentStepIndex / state.steps.length) * 100}%` }}
        />
      </div>

      {/* Transaction Steps */}
      <div className="space-y-2">
        {state.steps.map((step, index) => (
          <div
            key={step.transaction.id}
            className={`rounded-lg border p-3 ${
              index === state.currentStepIndex
                ? "border-blue-500 bg-blue-50"
                : step.status === "confirmed"
                  ? "border-green-500 bg-green-50"
                  : step.status === "failed"
                    ? "border-red-500 bg-red-50"
                    : "border-gray-300 bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    step.status === "confirmed"
                      ? "bg-green-500 text-white"
                      : step.status === "failed"
                        ? "bg-red-500 text-white"
                        : index === state.currentStepIndex
                          ? "bg-blue-500 text-white"
                          : "bg-gray-300 text-gray-600"
                  }`}
                >
                  {index + 1}
                </div>
                <div>
                  <div className="font-medium">{step.transaction.title}</div>
                  <div className="text-sm text-gray-500">{step.transaction.description}</div>
                </div>
              </div>
              <div className="text-sm">
                {step.status === "pending" && t("Pending")}
                {step.status === "signing" && t("Signing & Broadcasting...")}
                {step.status === "submitting" && t("Submitting...")}
                {step.status === "polling" && t("Confirming...")}
                {step.status === "confirmed" && t("Confirmed")}
                {step.status === "failed" && t("Failed")}
              </div>
            </div>
            {step.error && <div className="mt-2 text-sm text-red-600">{step.error}</div>}
            {step.hash && (
              <div className="mt-2 text-sm text-gray-600">
                {t("Hash")}: {step.hash.slice(0, 10)}...
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Error State */}
      {state.hasError && (
        <div className="text-center">
          <button
            onClick={reset}
            className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
          >
            {t("Retry")}
          </button>
        </div>
      )}
    </div>
  )
}
