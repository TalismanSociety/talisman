import type { MetadataRequest } from "@core/domains/metadata/types"
import { api } from "@ui/api"
import { BehaviorSubject } from "rxjs"

import { useMessageSubscription } from "./useMessageSubscription"

const INITIAL_VALUE: MetadataRequest[] = []

const subscribe = (subject: BehaviorSubject<MetadataRequest[]>) =>
  api.subscribeMetadataRequests((v) => subject.next(v))

export const useMetadataRequests = () =>
  useMessageSubscription("subscribeMetadataRequests", INITIAL_VALUE, subscribe)
