import type { PGPRequest } from "@core/domains/pgp/types"
import { api } from "@ui/api"
import { BehaviorSubject } from "rxjs"

import { useMessageSubscription } from "./useMessageSubscription"

const INITIAL_VALUE: Array<PGPRequest> = []

const subscribe = (subject: BehaviorSubject<PGPRequest[]>) =>
  api.subscribePGPRequests((v) => subject.next(v))

export const usePGPRequests = () =>
  useMessageSubscription("subscribePGPRequests", INITIAL_VALUE, subscribe)
