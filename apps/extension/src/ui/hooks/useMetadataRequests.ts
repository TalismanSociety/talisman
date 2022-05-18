import type { MetadataRequest } from "@core/types"
import { api } from "@ui/api"
import { useMessageSubscription } from "./useMessageSubscription"
import { BehaviorSubject } from "rxjs"

const INITIAL_VALUE: MetadataRequest[] = []

const subscribe = (subject: BehaviorSubject<MetadataRequest[]>) =>
  api.subscribeMetadataRequests((v) => subject.next(v))

export const useMetadataRequests = () =>
  useMessageSubscription("subscribeMetadataRequests", INITIAL_VALUE, subscribe)
