import seedStore from "@core/domains/accounts/store"
import { atom, useRecoilValue } from "recoil"

export const hasMnemonicState = atom<boolean>({
  key: "hasMnemonicState",
  effects: [
    ({ setSelf }) => {
      const sub = seedStore.observable.subscribe(({ cipher }) => setSelf(!!cipher))
      return () => sub.unsubscribe()
    },
  ],
})

export const useHasMnemonic = () => {
  return useRecoilValue(hasMnemonicState)
}
