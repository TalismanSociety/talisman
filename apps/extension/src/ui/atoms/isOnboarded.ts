import { selector } from "recoil"

import { appStateQuery } from "./app"

// fetch both at once as they are always used together
export const isOnboardedState = selector<boolean>({
  key: "isOnboardedState",
  get: ({ get }) => {
    const onboarded = get(appStateQuery("onboarded"))
    return onboarded === "TRUE"
  },
})
