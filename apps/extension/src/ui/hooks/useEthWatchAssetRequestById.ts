import type { WatchAssetRequest, WatchAssetRequestId } from "@core/domains/ethereum/types"
import { WATCH_ASSET_PREFIX } from "@core/domains/ethereum/types"
import { api } from "@ui/api"
import { useCallback } from "react"
import { BehaviorSubject } from "rxjs"

import { useMessageSubscription } from "./useMessageSubscription"

const INITIAL_SUBJECT_VALUE: Record<WatchAssetRequestId, WatchAssetRequest> = {}

// public hook
export const useEthWatchAssetRequestById = (
  id: WatchAssetRequestId
): WatchAssetRequest | undefined => {
  if (!id.startsWith(WATCH_ASSET_PREFIX)) throw new Error("Invalid ID for WatchAssetRequest")

  const subscribe = useCallback(
    (ethWatchAssetRequest: BehaviorSubject<Record<WatchAssetRequestId, WatchAssetRequest>>) =>
      api.ethWatchAssetRequestSubscribe(id, (v) => ethWatchAssetRequest.next({ [id]: v })),
    [id]
  )

  const transform = useCallback(
    (ethWatchAssetRequests: Record<WatchAssetRequestId, WatchAssetRequest>) =>
      ethWatchAssetRequests[id],
    [id]
  )

  return useMessageSubscription(
    `ethWatchAssetRequestsSubscribe(${id})`,
    INITIAL_SUBJECT_VALUE,
    subscribe,
    transform
  )
}
