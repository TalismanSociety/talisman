import { YIELD_API_BASE_URL } from "@common/constants"
import { log } from "@common/log"
import type { ActionArgumentsDto, ActionDto } from "@core/domains/earn/exports"
import { notify } from "@ui/components/Notifications"
import { useCallback, useMemo, useRef, useState } from "react"

import {
  fetchYieldxyzAction,
  getErrorMessage,
  sortTransactionsByStepIndex,
  submitYieldxyzTransactionHash,
} from "./yieldxyzActionApi"

type YieldxyzActionType = "enter" | "exit"

type UseYieldxyzActionProps = {
  type: YieldxyzActionType
  address: string | null | undefined
  yieldId: string | null | undefined
  args: ActionArgumentsDto | null | undefined
}

export const useYieldxyzAction = ({ type, address, yieldId, args }: UseYieldxyzActionProps) => {
  const [state, setState] = useState<{
    isLoading: boolean
    error: Error | null
    action: ActionDto | null
  }>({
    isLoading: false,
    error: null,
    action: null,
  })

  const actionIdRef = useRef<string | null>(null)
  actionIdRef.current = state.action?.id ?? null

  const canCreateAction = useMemo(() => {
    return !!(address && yieldId && args)
  }, [address, yieldId, args])

  // fetching the action needs to be a manual operation, it must be done using useQuery.
  // this is because every fetch creates a new action in yield.xyz backend.
  // additionally once created, we need to be able to refresh it on demand (eg. after user executes a tx)
  const createAction = useCallback(async () => {
    if (!address || !yieldId || !args) return
    try {
      setState({ isLoading: true, error: null, action: null })
      const fetchedAction = await fetchYieldxyzCreateAction(type, yieldId, address, args)
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
  }, [type, address, yieldId, args])

  const refreshAction = useCallback(async () => {
    setState((prev) => {
      if (!prev.action) return prev
      return { ...prev, isLoading: true, error: null }
    })

    try {
      const actionId = actionIdRef.current
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
  }, [])

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

const fetchYieldxyzCreateAction = async (
  type: YieldxyzActionType,
  yieldId: string,
  address: string,
  args: ActionArgumentsDto,
  signal?: AbortSignal
): Promise<ActionDto> => {
  const req = await fetch(`${YIELD_API_BASE_URL}/v1/actions/${type}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      yieldId,
      address,
      arguments: args,
    }),
    signal,
  })

  if (!req.ok) throw new Error(await getErrorMessage(req))

  return req.json()
}
