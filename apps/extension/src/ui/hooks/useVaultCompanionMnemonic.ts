import { vaultCompanionStore } from "@core/domains/accounts/store.vaultCompanion"
import { atom, useRecoilValue } from "recoil"

export const hasVaultCompanionState = atom<boolean>({
  key: "hasVaultCompanionState",
  default: false,
  effects: [
    ({ setSelf }) => {
      const sub = vaultCompanionStore.observable.subscribe(({ cipher }) => setSelf(!!cipher))
      return () => sub.unsubscribe()
    },
  ],
})

export const useHasVaultCompanion = () => {
  return useRecoilValue(hasVaultCompanionState)
}
