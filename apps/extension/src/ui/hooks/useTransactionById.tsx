import type { Transaction, TransactionId } from "@core/domains/transactions/types"
import { api } from "@ui/api"
import { useCallback } from "react"
import { BehaviorSubject } from "rxjs"

import { useMessageSubscription } from "./useMessageSubscription"

const INITIAL_SUBJECT_VALUE: Record<TransactionId, Transaction> = {}

// public hook
const useTransactionById = (id: TransactionId) => {
  const subscribe = useCallback(
    (transactions: BehaviorSubject<Record<string, Transaction>>) =>
      api.transactionSubscribe(id, (v) => {
        transactions.next({ ...transactions.value, [id]: v })
      }),
    [id]
  )

  const transform = useCallback(
    (transactions: Record<string, Transaction>) => transactions[id] ?? ({} as Transaction),
    [id]
  )

  return useMessageSubscription(
    `transactionSubscribe(${id})`,
    INITIAL_SUBJECT_VALUE,
    subscribe,
    transform
  )
}

export default useTransactionById
