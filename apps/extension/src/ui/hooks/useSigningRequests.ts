import type { AnySigningRequest } from "@core/domains/signing/types"
import { api } from "@ui/api"
import { BehaviorSubject } from "rxjs"

import { useMessageSubscription } from "./useMessageSubscription"

const INITIAL_VALUE: Array<AnySigningRequest> = []

const subscribe = (subject: BehaviorSubject<AnySigningRequest[]>) =>
  api.subscribeSigningRequests((v) => subject.next(v))

export const useSigningRequests = () =>
  useMessageSubscription("subscribeSigningRequests", INITIAL_VALUE, subscribe)
