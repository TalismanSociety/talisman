import { atomWithObservable } from "jotai/utils"

import { remoteConfig$ } from "@ui/state"

export const remoteConfigAtom = atomWithObservable(() => remoteConfig$)
