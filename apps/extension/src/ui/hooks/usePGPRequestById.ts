import type { PGPRequest } from "@core/domains/pgp/types"
import { api } from "@ui/api"
import { useCallback } from "react"
import { BehaviorSubject } from "rxjs"

import { useMessageSubscription } from "./useMessageSubscription"

const INITIAL_SUBJECT_VALUE: Record<string, PGPRequest> = {}

// public hook
export const usePGPRequestById = (id: string): PGPRequest | undefined => {
  const subscribe = useCallback(
    (pgpRequests: BehaviorSubject<Record<string, PGPRequest>>) =>
      api.subscribePGPRequest(id, (v) => pgpRequests.next({ [id]: v })),
    [id]
  )

  const transform = useCallback(
    (pgpRequests: Record<string, PGPRequest>) => pgpRequests[id],
    [id]
  )

  return useMessageSubscription(
    `signingRequestsSubscribe(${id})`,
    INITIAL_SUBJECT_VALUE,
    subscribe,
    transform
  )
}

export default usePGPRequestById
