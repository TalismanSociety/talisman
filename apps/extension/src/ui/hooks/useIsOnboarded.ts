import type { OnboardedType } from "@core/domains/app/types"
import { api } from "@ui/api"
import { BehaviorSubject } from "rxjs"

import { useMessageSubscription } from "./useMessageSubscription"

const INITIAL_VALUE: OnboardedType = "UNKNOWN"

const subscribe = (subject: BehaviorSubject<OnboardedType>) =>
  api.onboardStatusSubscribe((v) => subject.next(v))

export const useIsOnboarded = () =>
  useMessageSubscription<OnboardedType>("onboardStatusSubscribe", INITIAL_VALUE, subscribe)
