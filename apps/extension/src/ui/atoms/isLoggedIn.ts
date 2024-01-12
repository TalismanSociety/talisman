import { api } from "@ui/api"
import { atom } from "recoil"

export const isLoggedInState = atom<boolean>({
  key: "isLoggedInState",
  effects: [
    ({ setSelf }) => {
      const unsub = api.authStatusSubscribe((v) => {
        setSelf(v === "TRUE")
      })

      return () => {
        unsub()
      }
    },
  ],
})
