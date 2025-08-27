import { ChaindataProvider } from "@talismn/chaindata-provider"
import { atom, useAtom } from "jotai"
import { atomEffect } from "jotai-effect"

export const chaindataProviderAtom = atom<ChaindataProvider>(() => {
  return new ChaindataProvider({
    // TODO pass persistedStorage
  })
})

export const useSyncSwapsChaindata = () => useAtom(syncSwapsChaindataAtomEffect)

const syncSwapsChaindataAtomEffect = atomEffect((get) => {
  const chaindataProvider = get(chaindataProviderAtom)

  // keep subscription open when swaps modal is open
  const subscription = chaindataProvider.networks$.subscribe()

  // close susbcription when swaps modal closes
  return () => subscription.unsubscribe()
})
