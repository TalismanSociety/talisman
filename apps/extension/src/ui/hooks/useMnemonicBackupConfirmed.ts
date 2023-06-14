import { api } from "@ui/api"
import { atom, useRecoilValue } from "recoil"

const stateMnemonicBackupConfirmed = atom<"UNKNOWN" | "TRUE" | "FALSE">({
  key: "stateMnemonicBackupConfirmed",
  default: "UNKNOWN",
  effects: [
    ({ setSelf }) => {
      const unsubscribe = api.mnemonicSubscribe(({ confirmed }) => {
        if (confirmed === undefined) setSelf("UNKNOWN")
        else setSelf(confirmed ? "TRUE" : "FALSE")
      })
      return () => unsubscribe()
    },
  ],
})

export const useMnemonicBackupConfirmed = () => useRecoilValue(stateMnemonicBackupConfirmed)
