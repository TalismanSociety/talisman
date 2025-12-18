import { NetworkId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"
import { ActionDto } from "extension-core"
import { log } from "extension-shared"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { notify } from "@talisman/components/Notifications"

import { UseYieldxyzTransactionProps } from "./types"
import { useYieldxyzTransaction } from "./useYieldxyzTransaction"

type UseYieldxyzTransactionManagerProps = {
  action: ActionDto | null
  address: string | null
  networkId: NetworkId | null
  refreshAction: () => Promise<void>
  submitActionTransaction: (transactionId: string, hash: string) => Promise<void>
  onCompleted: () => void
}

/**
 * This hook is designed to be called only by a wizard context such as useEarnDepositWizardProvider
 * It manages the execution of transactions defined in the given action
 * @param props
 */
export const useYieldxyzTransactionManager = ({
  action,
  address,
  networkId,
  refreshAction,
  submitActionTransaction,
  onCompleted,
}: UseYieldxyzTransactionManagerProps) => {
  const { t } = useTranslation()
  const [stepIndex, setStepIndex] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pendingTxId, setPendingTxId] = useState<string | null>(null)

  const txInputs = useMemo<UseYieldxyzTransactionProps | null>(() => {
    if (!action || !address || !networkId || stepIndex === null) return null
    const transactionDef = action.transactions[stepIndex] ?? null
    if (!transactionDef) return null
    return { address, networkId: networkId, transactionDef }
  }, [action, address, networkId, stepIndex])

  const transaction = useYieldxyzTransaction(txInputs)

  const pendingTx = useMemo(
    () => action?.transactions.find((tx) => tx.id === pendingTxId) ?? null,
    [action, pendingTxId],
  )

  const reset = useCallback(() => {
    setStepIndex(null)
  }, [])

  const onSubmit = useCallback(
    async (txId: string) => {
      setIsSubmitting(true)
      try {
        if (stepIndex === null) return
        const transactionId = action?.transactions[stepIndex]?.id
        if (!transactionId) return
        await submitActionTransaction(transactionId, txId)
        setPendingTxId(transactionId)
      } finally {
        setIsSubmitting(false)
      }
    },
    [action, stepIndex, submitActionTransaction],
  )

  // simple polling to refresh action while a tx is pending
  useQuery({
    queryKey: ["yieldxyz", "follow-up", pendingTx],
    enabled: ["BROADCASTED", "PENDING"].includes(pendingTx?.status ?? ""),
    queryFn: async () => {
      if (!pendingTx) return null
      await refreshAction()
      return null
    },
    refetchInterval: 2000,
  })

  // maintain pendingTxId state
  useEffect(() => {
    if (!pendingTx?.status || ["BROADCASTED", "PENDING"].includes(pendingTx.status ?? "")) return

    switch (pendingTx.status) {
      case "CONFIRMED":
        notify({
          type: "success",
          title: t("Success"),
          subtitle: t("Transaction confirmed"),
        })
        setPendingTxId(null)
        setStepIndex((index) => (index ?? 0) + 1)
        break
      case "BLOCKED":
      case "NOT_FOUND":
      case "FAILED":
        notify({
          type: "error",
          title: t("Error"),
          subtitle: t("Transaction failed"),
        })
        setPendingTxId(null)
        break

      default:
        log.warn("Unhandled pendingTx status in EarnDepositWizard", { status: pendingTx.status })
        break
    }
  }, [pendingTx?.status, refreshAction, t])

  // signal parent wizard that all transactions are done
  useEffect(() => {
    if (action?.transactions.every((tx) => ["CONFIRMED", "SKIPPED"].includes(tx.status)))
      onCompleted()
  }, [action, onCompleted])

  // resets stepIndex when action is changed
  useEffect(() => {
    if (!action || typeof stepIndex === "number") return

    // initialize to first non-skipped transaction (ex: if approval is already done, it's a skip)
    const firstTx = action.transactions.find((tx) => tx.status !== "SKIPPED")
    setStepIndex(firstTx?.stepIndex ?? 0)
  }, [action, stepIndex])

  return {
    stepIndex,
    transaction,
    isProcessing: isSubmitting || !!pendingTx,
    setStepIndex,
    reset,
    onSubmit,
  }
}
