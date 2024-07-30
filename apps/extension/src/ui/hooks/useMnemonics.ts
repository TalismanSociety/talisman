import { atom, useAtomValue } from "jotai"
import { atomFamily } from "jotai/utils"

import { MnemonicSource, mnemonicsStore } from "@extension/core"
import { atomWithSubscription } from "@ui/atoms/utils/atomWithSubscription"

export type Mnemonic = {
  id: string
  name: string
  confirmed: boolean
  source: MnemonicSource
}

const mnemonicsAtom = atomWithSubscription<Mnemonic[]>(
  (callback) => {
    const sub = mnemonicsStore.observable.subscribe((data) => {
      const mnemonics = Object.values(data).map(({ id, name, confirmed, source }) => ({
        id,
        name,
        confirmed,
        source,
      }))
      callback(mnemonics)
    })
    return () => sub.unsubscribe()
  },
  { debugLabel: "mnemonicsAtom" }
)

const mnemonicsByIdAtomFamily = atomFamily((id: string | null | undefined) =>
  atom(async (get) => {
    if (!id) return null
    const mnemonics = await get(mnemonicsAtom)
    return mnemonics.find((m) => m.id === id) ?? null
  })
)

export const useMnemonics = () => {
  return useAtomValue(mnemonicsAtom)
}

export const useMnemonic = (id: string | null | undefined) => {
  return useAtomValue(mnemonicsByIdAtomFamily(id))
}
