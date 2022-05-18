import type { OnboardedType } from "@core/types"
import { api } from "@ui/api"
import { useMessageSubscription } from "./useMessageSubscription"
import { BehaviorSubject } from "rxjs"

const INITIAL_VALUE: OnboardedType = "UNKNOWN"

const subscribe = (subject: BehaviorSubject<OnboardedType>) =>
  api.onboardStatusSubscribe((v) => subject.next(v))

export const useIsOnboarded = () =>
  useMessageSubscription<OnboardedType>("onboardStatusSubscribe", INITIAL_VALUE, subscribe)
