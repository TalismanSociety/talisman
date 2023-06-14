import type { LoggedinType } from "@core/domains/app/types"
import { api } from "@ui/api"
import { atom, useRecoilValue } from "recoil"

const isLoggedInState = atom<LoggedinType>({
  key: "isLoggedInState",
  default: "UNKNOWN",
  effects: [
    ({ setSelf }) => {
      const unsubscribe = api.authStatusSubscribe(setSelf)
      return () => unsubscribe()
    },
  ],
})

export const useIsLoggedIn = () => useRecoilValue(isLoggedInState)
