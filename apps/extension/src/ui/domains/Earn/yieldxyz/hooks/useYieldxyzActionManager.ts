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
  address: string | null | undefined
  networkId: NetworkId | null | undefined
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pendingTxId, setPendingTxId] = useState<string | null>(null)

  const nextTransaction = useMemo(() => {
    return action?.transactions.find((tx) => !["CONFIRMED", "SKIPPED"].includes(tx.status)) ?? null
  }, [action])

  const stepIndex = useMemo(() => nextTransaction?.stepIndex ?? null, [nextTransaction])

  const txInputs = useMemo<UseYieldxyzTransactionProps | null>(() => {
    if (!address || !networkId || !nextTransaction) return null
    return { address, networkId, transaction: nextTransaction }
  }, [address, networkId, nextTransaction])

  const transaction = useYieldxyzTransaction(txInputs)

  const pendingTx = useMemo(
    () => action?.transactions.find((tx) => tx.id === pendingTxId) ?? null,
    [action, pendingTxId],
  )

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
        // setStepIndex((index) => (index ?? 0) + 1)
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
    if (action && !nextTransaction) onCompleted()
  }, [action, nextTransaction, onCompleted])

  return {
    stepIndex,
    transaction,
    isProcessing: isSubmitting || !!pendingTx,
    onSubmit,
  }
}
