import { ChaindataProvider } from "@talismn/chaindata-provider"
import { atom } from "jotai"

export const chaindataProviderAtom = atom<ChaindataProvider>(() => {
  return new ChaindataProvider({})
})
