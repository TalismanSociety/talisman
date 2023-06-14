import seedStore from "@core/domains/accounts/store"
import { atom, useRecoilValue } from "recoil"

export const hasMnemonicState = atom<boolean>({
  key: "hasMnemonicState",
  effects: [
    ({ setSelf }) => {
      const key = "hasMnemonicState" + crypto.randomUUID()
      // TODO Cleanup
      // eslint-disable-next-line no-console
      console.time(key)
      const sub = seedStore.observable.subscribe(({ cipher }) => {
        // TODO Cleanup
        // eslint-disable-next-line no-console
        console.timeEnd(key)
        setSelf(!!cipher)
      })
      return () => sub.unsubscribe()
    },
  ],
})

export const useHasMnemonic = () => {
  return useRecoilValue(hasMnemonicState)
}
