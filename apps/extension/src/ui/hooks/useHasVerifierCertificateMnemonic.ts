import { verifierCertificateMnemonicStore } from "@core/domains/accounts/store.verifierCertificateMnemonic"
import { atom, useRecoilValue } from "recoil"

export const hasVerifierCertificateMnemonicState = atom<boolean>({
  key: "hasVerifierCertificateMnemonicState",
  effects: [
    ({ setSelf }) => {
      const key = "hasVerifierCertificateMnemonicState" + crypto.randomUUID()
      // TODO Cleanup
      // eslint-disable-next-line no-console
      console.time(key)
      const sub = verifierCertificateMnemonicStore.observable.subscribe(({ cipher }) => {
        // TODO Cleanup
        // eslint-disable-next-line no-console
        console.timeEnd(key)
        setSelf(!!cipher)
      })
      return () => sub.unsubscribe()
    },
  ],
})

export const useHasVerifierCertificateMnemonic = () => {
  return useRecoilValue(hasVerifierCertificateMnemonicState)
}
