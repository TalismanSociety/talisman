import { bind } from "@react-rxjs/core"
import { BehaviorSubject } from "rxjs"

import type { PendingAction } from "../types"

const pendingActionSubject$ = new BehaviorSubject<PendingAction | null>(null)

export const [usePendingAction, pendingAction$] = bind(pendingActionSubject$, null)

export const setPendingAction = (action: PendingAction | null): void => {
  pendingActionSubject$.next(action)
}

export const getPendingAction = (): PendingAction | null => {
  return pendingActionSubject$.getValue()
}

export const confirmAction = async (id: string): Promise<boolean> => {
  const current = pendingActionSubject$.getValue()
  if (current?.id === id) {
    pendingActionSubject$.next({ ...current, status: "executing" })
    return true
  }
  return false
}

export const completeAction = (id: string, success: boolean, error?: string): void => {
  const current = pendingActionSubject$.getValue()
  if (current?.id === id) {
    pendingActionSubject$.next({
      ...current,
      status: success ? "completed" : "failed",
      error,
    })
    // Clear the pending action after a short delay
    setTimeout(() => {
      if (pendingActionSubject$.getValue()?.id === id) {
        pendingActionSubject$.next(null)
      }
    }, 100)
  }
}

export const cancelAction = (id: string): void => {
  const current = pendingActionSubject$.getValue()
  if (current?.id === id) {
    pendingActionSubject$.next({ ...current, status: "cancelled" })
    setTimeout(() => pendingActionSubject$.next(null), 100)
  }
}
