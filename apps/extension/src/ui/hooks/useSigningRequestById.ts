import type { AnySigningRequest } from "@core/domains/signing/types"
import { api } from "@ui/api"
import { useCallback } from "react"
import { BehaviorSubject } from "rxjs"

import { useMessageSubscription } from "./useMessageSubscription"

const INITIAL_SUBJECT_VALUE: Record<string, AnySigningRequest> = {}

// public hook
export const useSigningRequestById = (id: string): AnySigningRequest | undefined => {
  const subscribe = useCallback(
    (signingRequest: BehaviorSubject<Record<string, AnySigningRequest>>) =>
      api.subscribeSigningRequest(id, (v) => signingRequest.next({ [id]: v })),
    [id]
  )

  const transform = useCallback(
    (signingRequests: Record<string, AnySigningRequest>) => signingRequests[id],
    [id]
  )

  return useMessageSubscription(
    `signingRequestsSubscribe(${id})`,
    INITIAL_SUBJECT_VALUE,
    subscribe,
    transform
  )
}

export default useSigningRequestById
