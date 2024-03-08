import { OnboardedType } from "@extension/core"
import { atom } from "jotai"

import { appStateAtomFamily } from "./app"

export const isOnboardedAtom = atom(async (get) => {
  const onboarded = (await get(appStateAtomFamily("onboarded"))) as OnboardedType
  return onboarded === "TRUE"
})
