import type { LoggedinType } from "@core/types"
import { api } from "@ui/api"
import { useMessageSubscription } from "./useMessageSubscription"
import { BehaviorSubject } from "rxjs"

const INITIAL_VALUE: LoggedinType = "UNKNOWN"

const subscribe = (subject: BehaviorSubject<LoggedinType>) =>
  api.authStatusSubscribe((v) => subject.next(v))

export const useIsLoggedIn = () =>
  useMessageSubscription<LoggedinType>("authStatusSubscribe", INITIAL_VALUE, subscribe)
