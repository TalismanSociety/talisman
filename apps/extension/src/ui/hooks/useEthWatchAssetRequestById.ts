import type { WatchAssetRequest } from "@core/types"
import { api } from "@ui/api"
import { useMessageSubscription } from "./useMessageSubscription"
import { BehaviorSubject } from "rxjs"
import { useCallback } from "react"

const INITIAL_SUBJECT_VALUE: Record<string, WatchAssetRequest> = {}

// public hook
export const useEthWatchAssetRequestById = (id: string): WatchAssetRequest | undefined => {
  const subscribe = useCallback(
    (ethWatchAssetRequest: BehaviorSubject<Record<string, WatchAssetRequest>>) =>
      api.ethWatchAssetRequestSubscribe(id, (v) => ethWatchAssetRequest.next({ [id]: v })),
    [id]
  )

  const transform = useCallback(
    (ethWatchAssetRequests: Record<string, WatchAssetRequest>) => ethWatchAssetRequests[id],
    [id]
  )

  return useMessageSubscription(
    `ethWatchAssetRequestsSubscribe(${id})`,
    INITIAL_SUBJECT_VALUE,
    subscribe,
    transform
  )
}
