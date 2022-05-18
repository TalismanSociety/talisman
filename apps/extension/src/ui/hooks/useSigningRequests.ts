import type { AnySigningRequest } from "@core/types"
import { api } from "@ui/api"
import { useMessageSubscription } from "./useMessageSubscription"
import { BehaviorSubject } from "rxjs"

const INITIAL_VALUE: Array<AnySigningRequest> = []

const subscribe = (subject: BehaviorSubject<AnySigningRequest[]>) =>
  api.subscribeSigningRequests((v) => subject.next(v))

export const useSigningRequests = () =>
  useMessageSubscription("subscribeSigningRequests", INITIAL_VALUE, subscribe)
