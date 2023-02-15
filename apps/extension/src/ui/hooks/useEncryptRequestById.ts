import type {
  AnyEncryptRequest,
  DecryptRequestId,
  EncryptRequestId,
} from "@core/domains/encrypt/types"
import { api } from "@ui/api"
import { useCallback } from "react"
import { BehaviorSubject } from "rxjs"

import { useMessageSubscription } from "./useMessageSubscription"

const INITIAL_SUBJECT_VALUE: Record<string, AnyEncryptRequest> = {}

// public hook
export const useEncryptRequestById = (
  id: EncryptRequestId | DecryptRequestId
): AnyEncryptRequest | undefined => {
  const subscribe = useCallback(
    (reqs: BehaviorSubject<Record<string, AnyEncryptRequest>>) =>
      api.subscribeEncryptRequest(id, (v) => reqs.next({ [id]: v })),
    [id]
  )

  const transform = useCallback((reqs: Record<string, AnyEncryptRequest>) => reqs[id], [id])

  return useMessageSubscription(
    `encryptRequestsSubscribe(${id})`,
    INITIAL_SUBJECT_VALUE,
    subscribe,
    transform
  )
}

export default useEncryptRequestById
