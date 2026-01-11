import { ActionDto, PendingActionDto, TransactionDto } from "extension-core"
import { log, YIELD_API_BASE_URL } from "extension-shared"
import { useCallback, useMemo, useState } from "react"

import { notify } from "@talisman/components/Notifications"

type UseYieldxyzPendingActionProps = {
  address: string | null | undefined
  yieldId: string | null | undefined
  pendingAction: PendingActionDto | null | undefined
}

export const useYieldxyzPendingAction = (props: UseYieldxyzPendingActionProps) => {
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
    return !!(props.address && props.yieldId && props.pendingAction)
  }, [props.address, props.yieldId, props.pendingAction])

  // fetching the action needs to be a manual operation, it must be done using useQuery.
  // this is because every fetch creates a new action in yield.xyz backend.
  // additionally once created, we need to be able to refresh it on demand (eg. after user executes a tx)
  const createAction = useCallback(async () => {
    if (!props.address || !props.yieldId || !props.pendingAction) return
    try {
      setState({ isLoading: true, error: null, action: null })
      const fetchedAction = await fetchYieldxyzCreatePendingAction(
        props.yieldId,
        props.address,
        props.pendingAction,
      )
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
  }, [props])

  const refreshAction = useCallback(async () => {
    try {
      if (!state.action) return
      setState((state) => ({ ...state, isLoading: true, error: null }))
      const refreshedAction = await fetchYieldxyzAction(state.action.id)
      // ⚠️ action.transactions order changes over time, make sure to sort it based on stepIndex
      refreshedAction.transactions.sort(sortTransactionsByStepIndex)

      setState({ isLoading: false, error: null, action: refreshedAction })
    } catch (err) {
      log.error("Failed to refresh Yieldxyz action", err)
      setState((state) => ({ ...state, isLoading: false, error: err as Error }))
      throw err
    }
  }, [state.action])

  const submitActionTransaction = useCallback(
    async (transactionId: string, hash: string) => {
      try {
        if (!state.action) return
        setState((state) => ({ ...state, isLoading: true, error: null }))
        const transaction = await submitYieldxyzTransactionHash(transactionId, hash)
        // ⚠️ action.transactions order changes over time, make sure to sort it based on stepIndex
        const updatedAction = {
          ...state.action,
          transactions: state.action.transactions
            .map((tx) => (tx.id === transaction.id ? transaction : tx))
            .sort(sortTransactionsByStepIndex),
        }
        setState({ isLoading: false, error: null, action: updatedAction })
      } catch (err) {
        log.error("Failed to submit Yieldxyz transaction", err)
        notify({
          type: "error",
          title: "Error",
          subtitle: (err as Error).message ?? err?.toString(),
        })
        setState((state) => ({ ...state, isLoading: false, error: err as Error }))
        throw err
      }
    },
    [state.action],
  )

  return { ...state, canCreateAction, createAction, refreshAction, submitActionTransaction }
}

const fetchYieldxyzCreatePendingAction = async (
  yieldId: string,
  address: string,
  pendingAction: PendingActionDto,
  signal?: AbortSignal,
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

const fetchYieldxyzAction = async (actionId: string, signal?: AbortSignal): Promise<ActionDto> => {
  const req = await fetch(`${YIELD_API_BASE_URL}/v1/actions/${actionId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    signal,
  })

  if (!req.ok) throw new Error(await getErrorMessage(req))

  return req.json()
}

const submitYieldxyzTransactionHash = async (
  transactionId: string,
  hash: string,
  signal?: AbortSignal,
): Promise<ActionDto["transactions"][number]> => {
  const req = await fetch(`${YIELD_API_BASE_URL}/v1/transactions/${transactionId}/submit-hash`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hash }),
    signal,
  })

  if (!req.ok) throw new Error(await getErrorMessage(req))

  return req.json()
}

const getErrorMessage = async (response: Response): Promise<string> => {
  try {
    const errorBody = await response.json()
    return errorBody.message || `Yield.xyz API error: ${response.status} ${response.statusText}`
  } catch (err) {
    return `Yield.xyz API error: ${response.status} ${response.statusText}`
  }
}

const sortTransactionsByStepIndex = (a: TransactionDto, b: TransactionDto) => {
  if (a.stepIndex === undefined || b.stepIndex === undefined) {
    log.warn("sortTransactionsByStepIndex: transaction missing stepIndex", { a, b })
    return 0
  }

  return a.stepIndex - b.stepIndex
}
