import { YIELD_API_BASE_URL } from "@common/constants"
import { log } from "@common/log"
import type { ActionDto, PendingActionDto } from "@core/domains/earn/exports"
import { notify } from "@ui/components/Notifications"
import { useCallback, useMemo, useState } from "react"

import {
  fetchYieldxyzAction,
  getErrorMessage,
  sortTransactionsByStepIndex,
  submitYieldxyzTransactionHash,
} from "./yieldxyzActionApi"

type UseYieldxyzPendingActionProps = {
  address: string | null | undefined
  yieldId: string | null | undefined
  pendingAction: PendingActionDto | null | undefined
}

export const useYieldxyzPendingAction = ({
  address,
  yieldId,
  pendingAction,
}: UseYieldxyzPendingActionProps) => {
  const [state, setState] = useState<{
    isLoading: boolean
    error: Error | null
    action: ActionDto | null
  }>({
    isLoading: false,
    error: null,
    action: null,
  })

  const canCreateAction = useMemo(() => {
    return !!(address && yieldId && pendingAction)
  }, [address, yieldId, pendingAction])

  // fetching the action needs to be a manual operation, it must be done using useQuery.
  // this is because every fetch creates a new action in yield.xyz backend.
  // additionally once created, we need to be able to refresh it on demand (eg. after user executes a tx)
  const createAction = useCallback(async () => {
    if (!address || !yieldId || !pendingAction) return
    try {
      setState({ isLoading: true, error: null, action: null })
      const fetchedAction = await fetchYieldxyzCreatePendingAction(yieldId, address, pendingAction)
      // ⚠️ action.transactions order changes over time, make sure to sort it based on stepIndex
      fetchedAction.transactions.sort(sortTransactionsByStepIndex)

      setState({ isLoading: false, error: null, action: fetchedAction })
    } catch (err) {
      log.error("Failed to fetch Yieldxyz enter action", err)
      notify({
        type: "error",
        title: "Error",
        subtitle: (err as Error).message ?? err?.toString(),
      })
      setState({ isLoading: false, error: err as Error, action: null })
      throw err
    }
  }, [address, yieldId, pendingAction])

  const refreshAction = useCallback(async () => {
    setState((prev) => {
      if (!prev.action) return prev
      return { ...prev, isLoading: true, error: null }
    })

    try {
      const actionId = state.action?.id
      if (!actionId) return
      const refreshedAction = await fetchYieldxyzAction(actionId)
      // ⚠️ action.transactions order changes over time, make sure to sort it based on stepIndex
      refreshedAction.transactions.sort(sortTransactionsByStepIndex)

      setState({ isLoading: false, error: null, action: refreshedAction })
    } catch (err) {
      log.error("Failed to refresh Yieldxyz action", err)
      setState((prev) => ({ ...prev, isLoading: false, error: err as Error }))
      throw err
    }
  }, [state.action?.id])

  const submitActionTransaction = useCallback(async (transactionId: string, hash: string) => {
    setState((prev) => {
      if (!prev.action) return prev
      return { ...prev, isLoading: true, error: null }
    })

    try {
      const transaction = await submitYieldxyzTransactionHash(transactionId, hash)
      // ⚠️ action.transactions order changes over time, make sure to sort it based on stepIndex
      setState((prev) => {
        if (!prev.action) return prev
        const updatedAction = {
          ...prev.action,
          transactions: prev.action.transactions
            .map((tx) => (tx.id === transaction.id ? transaction : tx))
            .sort(sortTransactionsByStepIndex),
        }
        return { isLoading: false, error: null, action: updatedAction }
      })
    } catch (err) {
      log.error("Failed to submit Yieldxyz transaction", err)
      notify({
        type: "error",
        title: "Error",
        subtitle: (err as Error).message ?? err?.toString(),
      })
      setState((prev) => ({ ...prev, isLoading: false, error: err as Error }))
      throw err
    }
  }, [])

  return { ...state, canCreateAction, createAction, refreshAction, submitActionTransaction }
}

const fetchYieldxyzCreatePendingAction = async (
  yieldId: string,
  address: string,
  pendingAction: PendingActionDto,
  signal?: AbortSignal
): Promise<ActionDto> => {
  const req = await fetch(`${YIELD_API_BASE_URL}/v1/actions/manage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      yieldId,
      address,
      arguments: pendingAction.arguments,
      action: pendingAction.type,
      passthrough: pendingAction.passthrough,
    }),
    signal,
  })

  if (!req.ok) throw new Error(await getErrorMessage(req))

  return req.json()
}
