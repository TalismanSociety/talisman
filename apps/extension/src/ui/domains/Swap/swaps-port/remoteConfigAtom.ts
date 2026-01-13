import { remoteConfig$ } from "@ui/state"
import { atomWithObservable } from "jotai/utils"

export const remoteConfigAtom = atomWithObservable(() => remoteConfig$)
