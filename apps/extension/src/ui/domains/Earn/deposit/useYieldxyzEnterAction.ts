import { ActionArgumentsDto, ActionDto, TransactionDto } from "extension-core"
import { log, YIELD_API_BASE_URL } from "extension-shared"
import { useCallback, useMemo, useState } from "react"

import { notify } from "@talisman/components/Notifications"
import { useYieldxyzProduct } from "@ui/state/yield"

type UseYieldxyzEnterTransactionProps = {
  address: string | null
  yieldId: string | null
  amount: string | null // amount of tokens (not plancks)
  validatorAddress?: string | null
}

// TODO refactor so common logic can be shared with enter/exit/claim actions
export const useYieldxyzEnterAction = (props: UseYieldxyzEnterTransactionProps) => {
  const product = useYieldxyzProduct(props.yieldId)

  const [state, setState] = useState<{
    isLoading: boolean
    error: Error | null
    action: ActionDto | null
  }>({
    isLoading: false,
    error: null,
    action: null,
  })

  const args = useMemo<ActionArgumentsDto | null>(() => {
    const expectedArgs = product.data?.mechanics.arguments?.enter
    if (!expectedArgs?.fields.length) return null // there should always be args (at least amount), not sure what to do if missing

    const args: ActionArgumentsDto = {}

    for (const field of expectedArgs.fields) {
      switch (field.name) {
        case "amount":
          if (!props.amount) return null
          args.amount = props.amount
          break
        case "validatorAddress":
          if (!props.validatorAddress) return null
          args.validatorAddress = props.validatorAddress
          break
        default:
          if (field.required) {
            log.warn("useYieldxyzEnterTransaction: unsupported required field", {
              product,
              fieldName: field.name,
            })
            return null
          }

          // just skip non-required fields for now
          break
      }
    }

    return args
  }, [product, props.amount, props.validatorAddress])

  const canCreateAction = useMemo(() => {
    return !!(props.address && props.yieldId && args)
  }, [props.address, props.yieldId, args])

  // fetching the action needs to be a manual operation, it must be done using useQuery.
  // this is because every fetch creates a new action in yield.xyz backend.
  // additionally once created, we need to be able to refresh it on demand (eg. after user executes a tx)
  const createAction = useCallback(async () => {
    if (!props.address || !props.yieldId || !args) return
    try {
      setState({ isLoading: true, error: null, action: null })
      const fetchedAction = await fetchYieldxyzEnterAction(props.yieldId, props.address, args)
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
    }
  }, [args, props.address, props.yieldId])

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
      }
    },
    [state.action],
  )

  return { ...state, canCreateAction, createAction, refreshAction, submitActionTransaction }
}

const fetchYieldxyzEnterAction = async (
  yieldId: string,
  address: string,
  args: ActionArgumentsDto,
  signal?: AbortSignal,
): Promise<ActionDto> => {
  const req = await fetch(`${YIELD_API_BASE_URL}/v1/actions/enter`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      yieldId,
      address,
      arguments: args,
    }),
    signal,
  })

  if (!req.ok) throw new Error(`Yield.xyz API error: ${req.status} ${req.statusText}`)

  return req.json()
}

const fetchYieldxyzAction = async (actionId: string, signal?: AbortSignal): Promise<ActionDto> => {
  const req = await fetch(`${YIELD_API_BASE_URL}/v1/actions/${actionId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    signal,
  })

  if (!req.ok) throw new Error(`Yield.xyz API error: ${req.status} ${req.statusText}`)

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

  if (!req.ok) throw new Error(`Yield.xyz API error: ${req.status} ${req.statusText}`)

  return req.json()
}

const sortTransactionsByStepIndex = (a: TransactionDto, b: TransactionDto) => {
  if (a.stepIndex === undefined || b.stepIndex === undefined) {
    log.warn("sortTransactionsByStepIndex: transaction missing stepIndex", { a, b })
    return 0
  }

  return a.stepIndex - b.stepIndex
}
