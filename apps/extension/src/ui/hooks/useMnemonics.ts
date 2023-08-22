import { SOURCES, seedPhraseStore } from "@core/domains/mnemonics/store"
import { atom, selectorFamily, useRecoilValue } from "recoil"

export type Mnemonic = {
  id: string
  name: string
  confirmed: boolean
  source: SOURCES
}

const mnemonicsState = atom<Mnemonic[]>({
  key: "mnemonicsState",
  default: [],
  effects: [
    ({ setSelf }) => {
      const sub = seedPhraseStore.observable.subscribe((data) => {
        const mnemonics = Object.values(data).map(({ id, name, confirmed, source }) => ({
          id,
          name,
          confirmed,
          source,
        }))
        setSelf(mnemonics)
      })
      return () => sub.unsubscribe()
    },
  ],
})

const mnemonicsQuery = selectorFamily({
  key: "mnemonicsQuery",
  get:
    (id: string | undefined) =>
    ({ get }) =>
      get(mnemonicsState).find((m) => m.id === id),
})

export const useMnemonics = () => {
  return useRecoilValue(mnemonicsState)
}

export const useMnemonic = (id: string | undefined) => {
  return useRecoilValue(mnemonicsQuery(id))
}
