import { db } from "@core/db"
import { TokenId } from "@talismn/chaindata-provider"
import { DbTokenRates } from "@talismn/token-rates"
import { api } from "@ui/api"
import { liveQuery } from "dexie"
import { atom, selector, selectorFamily } from "recoil"

const NO_OP = () => {}
export const tokenRatesState = atom<DbTokenRates[]>({
  key: "tokenRatesState",
  effects: [
    // sync from db
    ({ setSelf }) => {
      const key = "tokenRatesState" + crypto.randomUUID()
      // TODO Cleanup
      // eslint-disable-next-line no-console
      console.time(key)
      const obs = liveQuery(() => db.tokenRates.toArray())
      const sub = obs.subscribe((v) => {
        // TODO Cleanup
        // eslint-disable-next-line no-console
        console.timeEnd(key)
        setSelf(v)
      })
      return () => sub.unsubscribe()
    },
    // instruct backend to keep db syncrhonized while this atom is in use
    () => api.tokenRates(NO_OP),
  ],
})

export const tokenRatesMapState = selector({
  key: "tokenRatesMapState",
  get: ({ get }) => {
    const tokenRates = get(tokenRatesState)
    return Object.fromEntries(tokenRates.map(({ tokenId, rates }) => [tokenId, rates]))
  },
  cachePolicy_UNSTABLE: {
    eviction: "most-recent",
  },
})

export const tokenRatesQuery = selectorFamily({
  key: "tokenRatesQuery",
  get:
    (tokenId: TokenId | null | undefined) =>
    ({ get }) => {
      const tokenRates = get(tokenRatesMapState)
      return tokenId ? tokenRates[tokenId] : undefined
    },
  cachePolicy_UNSTABLE: {
    eviction: "most-recent",
  },
})
