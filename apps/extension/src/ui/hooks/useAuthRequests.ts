import { api } from "@ui/api"
import { useMessageSubscription } from "./useMessageSubscription"
import type { AuthorizeRequest } from "@core/types"
import { BehaviorSubject } from "rxjs"

const INITIAL_VALUE: AuthorizeRequest[] = []

const subscribe = (subject: BehaviorSubject<AuthorizeRequest[]>) =>
  api.authRequestsSubscribe((v) => subject.next(v))

export const useAuthRequests = () =>
  useMessageSubscription("authRequestsSubscribe", INITIAL_VALUE, subscribe)
