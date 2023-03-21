import type { ValidRequests } from "@core/libs/requests/types"
import { api } from "@ui/api"
import { BehaviorSubject } from "rxjs"

import { useMessageSubscription } from "./useMessageSubscription"

const INITIAL_VALUE: Array<ValidRequests> = []

const subscribe = (subject: BehaviorSubject<ValidRequests[]>) =>
  api.subscribeRequests((v) => subject.next(v))

export const useRequests = () =>
  useMessageSubscription("subscribeRequests", INITIAL_VALUE, subscribe)
