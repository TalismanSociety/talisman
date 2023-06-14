import { api } from "@ui/api"
import { atom, useRecoilValue } from "recoil"

const stateMnemonicBackupConfirmed = atom<"UNKNOWN" | "TRUE" | "FALSE">({
  key: "stateMnemonicBackupConfirmed",
  default: "UNKNOWN",
  effects: [
    ({ setSelf }) => {
      const key = "stateMnemonicBackupConfirmed" + crypto.randomUUID()
      // TODO Cleanup
      // eslint-disable-next-line no-console
      console.time(key)
      const unsubscribe = api.mnemonicSubscribe(({ confirmed }) => {
        // TODO Cleanup
        // eslint-disable-next-line no-console
        console.timeEnd(key)
        if (confirmed === undefined) setSelf("UNKNOWN")
        else setSelf(confirmed ? "TRUE" : "FALSE")
      })
      return () => unsubscribe()
    },
  ],
})

export const useMnemonicBackupConfirmed = () => useRecoilValue(stateMnemonicBackupConfirmed)
