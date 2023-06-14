import { verifierCertificateMnemonicStore } from "@core/domains/accounts/store.verifierCertificateMnemonic"
import { atom, useRecoilValue } from "recoil"

export const hasVerifierCertificateMnemonicState = atom<boolean>({
  key: "hasVerifierCertificateMnemonicState",
  effects: [
    ({ setSelf }) => {
      const sub = verifierCertificateMnemonicStore.observable.subscribe(({ cipher }) =>
        setSelf(!!cipher)
      )
      return () => sub.unsubscribe()
    },
  ],
})

export const useHasVerifierCertificateMnemonic = () => {
  return useRecoilValue(hasVerifierCertificateMnemonicState)
}
