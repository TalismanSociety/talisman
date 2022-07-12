import type { LoggedinType } from "@core/domains/app/types"
import { api } from "@ui/api"
import { BehaviorSubject } from "rxjs"

import { useMessageSubscription } from "./useMessageSubscription"

const INITIAL_VALUE: LoggedinType = "UNKNOWN"

const subscribe = (subject: BehaviorSubject<LoggedinType>) =>
  api.authStatusSubscribe((v) => subject.next(v))

export const useIsLoggedIn = () =>
  useMessageSubscription<LoggedinType>("authStatusSubscribe", INITIAL_VALUE, subscribe)
