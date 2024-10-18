import { atomWithObservable } from "jotai/utils"

import { accountsCatalog$ } from "@ui/state"

export const accountsCatalogAtom = atomWithObservable(() => accountsCatalog$)
