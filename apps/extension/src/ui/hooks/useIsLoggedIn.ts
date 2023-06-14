import type { LoggedinType } from "@core/domains/app/types"
import { api } from "@ui/api"
import { atom, useRecoilValue } from "recoil"

const isLoggedInState = atom<LoggedinType>({
  key: "isLoggedInState",
  default: "UNKNOWN",
  effects: [
    ({ setSelf }) => {
      const key = "isLoggedInState" + crypto.randomUUID()
      // TODO Cleanup
      // eslint-disable-next-line no-console
      console.time(key)
      const unsubscribe = api.authStatusSubscribe((v) => {
        // TODO Cleanup
        // eslint-disable-next-line no-console
        console.timeEnd(key)
        setSelf(v)
      })
      return () => unsubscribe()
    },
  ],
})

export const useIsLoggedIn = () => useRecoilValue(isLoggedInState)
