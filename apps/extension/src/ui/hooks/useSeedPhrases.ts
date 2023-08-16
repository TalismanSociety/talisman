import { SOURCES, seedPhraseStore } from "@core/domains/mnemonics/store"
import { atom, useRecoilValue } from "recoil"

type Id = string
type Seed = {
  name: string
  confirmed: boolean
  source: SOURCES
}
type SeedPhrases = Record<Id, Seed>

export const seedPhraseState = atom<SeedPhrases>({
  key: "seedPhraseState",
  default: {},
  effects: [
    ({ setSelf }) => {
      const sub = seedPhraseStore.observable.subscribe((data) => {
        const result = Object.fromEntries(
          Object.entries(data).map(([id, seed]) => {
            const { name, confirmed, source } = seed
            return [id, { name, confirmed, source }]
          })
        )
        setSelf(result)
      })
      return () => sub.unsubscribe()
    },
  ],
})

export const useSeedPhrases = () => {
  return useRecoilValue(seedPhraseState)
}
