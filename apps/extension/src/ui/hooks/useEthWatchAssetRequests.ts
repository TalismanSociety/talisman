import type { WatchAssetRequest } from "@core/domains/ethereum/types"
import { api } from "@ui/api"
import { BehaviorSubject } from "rxjs"

import { useMessageSubscription } from "./useMessageSubscription"

const INITIAL_VALUE: WatchAssetRequest[] = []

const subscribe = (subject: BehaviorSubject<WatchAssetRequest[]>) =>
  api.ethWatchAssetRequestsSubscribe((v) => subject.next(v))

export const useEthWatchAssetRequests = () =>
  useMessageSubscription("subscribeEthWatchAssetRequests", INITIAL_VALUE, subscribe)
