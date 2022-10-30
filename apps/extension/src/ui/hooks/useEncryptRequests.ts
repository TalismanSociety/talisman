import type { AnyEncryptRequest } from "@core/domains/encrypt/types"
import { api } from "@ui/api"
import { BehaviorSubject } from "rxjs"

import { useMessageSubscription } from "./useMessageSubscription"

const INITIAL_VALUE: Array<AnyEncryptRequest> = []

const subscribe = (subject: BehaviorSubject<AnyEncryptRequest[]>) =>
  api.subscribeEncryptRequests((v) => subject.next(v))

export const useEncryptRequests = () =>
  useMessageSubscription("subscribeEncryptRequests", INITIAL_VALUE, subscribe)
