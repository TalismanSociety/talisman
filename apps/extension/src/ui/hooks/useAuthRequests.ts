import type { AuthorizeRequest } from "@core/domains/sitesAuthorised/types"
import { api } from "@ui/api"
import { BehaviorSubject } from "rxjs"

import { useMessageSubscription } from "./useMessageSubscription"

const INITIAL_VALUE: AuthorizeRequest[] = []

const subscribe = (subject: BehaviorSubject<AuthorizeRequest[]>) =>
  api.authRequestsSubscribe((v) => subject.next(v))

export const useAuthRequests = () =>
  useMessageSubscription("authRequestsSubscribe", INITIAL_VALUE, subscribe)
