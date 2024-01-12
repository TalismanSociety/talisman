import { api } from "@ui/api"
import { atom, selector } from "recoil"

import { appStateQuery } from "./settingsAndApp"

const isLoggedInState = atom<boolean>({
  key: "isLoggedInState",
  effects: [
    ({ setSelf }) => {
      const unsub = api.authStatusSubscribe((v) => setSelf(v === "TRUE"))

      return () => {
        unsub()
      }
    },
  ],
})

// fetch both at once as they are always used together
export const loginState = selector<{ isOnboarded: boolean; isLoggedIn: boolean }>({
  key: "loginState",
  get: ({ get }) => {
    const isLoggedIn = get(isLoggedInState)
    const onboarded = get(appStateQuery("onboarded"))
    return { isLoggedIn, isOnboarded: onboarded === "TRUE" }
  },
})
