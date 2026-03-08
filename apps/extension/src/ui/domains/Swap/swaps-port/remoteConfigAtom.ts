import { remoteConfig$ } from "@ui/state/remoteConfig"
import { atomWithObservable } from "jotai/utils"

export const remoteConfigAtom = atomWithObservable(() => remoteConfig$)
