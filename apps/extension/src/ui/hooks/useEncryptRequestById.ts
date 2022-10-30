import type { AnyEncryptRequest } from "@core/domains/encrypt/types"
import { api } from "@ui/api"
import { useCallback } from "react"
import { BehaviorSubject } from "rxjs"

import { useMessageSubscription } from "./useMessageSubscription"

const INITIAL_SUBJECT_VALUE: Record<string, AnyEncryptRequest> = {}

// public hook
export const useEncryptRequestById = (id: string): AnyEncryptRequest | undefined => {
  const subscribe = useCallback(
    (encryptRequests: BehaviorSubject<Record<string, AnyEncryptRequest>>) =>
      api.subscribeEncryptRequest(id, (v) => encryptRequests.next({ [id]: v })),
    [id]
  )

  const transform = useCallback(
    (encryptRequests: Record<string, AnyEncryptRequest>) => encryptRequests[id],
    [id]
  )

  return useMessageSubscription(
    `signingRequestsSubscribe(${id})`,
    INITIAL_SUBJECT_VALUE,
    subscribe,
    transform
  )
}

export default useEncryptRequestById
