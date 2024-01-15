import { log } from "@core/log"
import { api } from "@ui/api"
import { atom } from "recoil"

export const isLoggedInState = atom<boolean>({
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
