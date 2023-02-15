import type {
  AnySigningRequest,
  AnySigningRequestID,
  SigningRequestID,
  SigningRequests,
} from "@core/domains/signing/types"
import { api } from "@ui/api"
import { useCallback } from "react"
import { BehaviorSubject } from "rxjs"

import { useMessageSubscription } from "./useMessageSubscription"

const INITIAL_SUBJECT_VALUE: Record<AnySigningRequestID, AnySigningRequest> = {}

// public hook
export const useSigningRequestById = <T extends keyof SigningRequests>(
  id: SigningRequestID<T>
): SigningRequests[T][0] | undefined => {
  const subscribe = useCallback(
    (signingRequest: BehaviorSubject<Record<AnySigningRequestID, AnySigningRequest>>) =>
      api.subscribeSigningRequest(id, (v) => signingRequest.next({ [id]: v })),
    [id]
  )

  const transform = useCallback(
    (signingRequests: Record<AnySigningRequestID, AnySigningRequest>) => signingRequests[id],
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
