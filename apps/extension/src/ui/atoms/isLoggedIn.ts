import { log } from "@core/log"
import { api } from "@ui/api"
import { atom as ratom } from "recoil"

import { atomWithSubscription } from "./utils/atomWithSubscription"

export const isLoggedInAtom = atomWithSubscription<boolean>(
  (callback) => api.authStatusSubscribe((v) => callback(v === "TRUE")),
  "isLoggedInAtom"
)

export const isLoggedInState = ratom<boolean>({
  key: "isLoggedInState",
  effects: [
    ({ setSelf }) => {
      log.debug("isLoggedInState.init")
      const unsub = api.authStatusSubscribe((v) => {
        setSelf(v === "TRUE")
      })

      return () => {
        unsub()
      }
    },
  ],
})
