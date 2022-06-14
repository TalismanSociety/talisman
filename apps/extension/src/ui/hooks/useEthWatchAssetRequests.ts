import type { AddEthereumChainRequest, WatchAssetRequest } from "@core/types"
import { api } from "@ui/api"
import { useMessageSubscription } from "./useMessageSubscription"
import { BehaviorSubject } from "rxjs"

const INITIAL_VALUE: WatchAssetRequest[] = []

const subscribe = (subject: BehaviorSubject<WatchAssetRequest[]>) =>
  api.ethWatchAssetRequestsSubscribe((v) => subject.next(v))

export const useEthWatchAssetRequests = () =>
  useMessageSubscription("subscribeEthWatchAssetRequests", INITIAL_VALUE, subscribe)
