import type { SiteAuthRequest } from "@core/domains/sitesAuthorised/types"
import { api } from "@ui/api"
import { BehaviorSubject } from "rxjs"

import { useMessageSubscription } from "./useMessageSubscription"

const INITIAL_VALUE: SiteAuthRequest[] = []

const subscribe = (subject: BehaviorSubject<SiteAuthRequest[]>) =>
  api.authRequestsSubscribe((v) => subject.next(v))

export const useAuthRequests = () =>
  useMessageSubscription("authRequestsSubscribe", INITIAL_VALUE, subscribe)
