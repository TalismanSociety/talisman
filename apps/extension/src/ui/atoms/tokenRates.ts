import { db } from "@core/db"
import { TokenId } from "@talismn/chaindata-provider"
import { DbTokenRates, TokenRateCurrency } from "@talismn/token-rates"
import { api } from "@ui/api"
import { settingQuery } from "@ui/hooks/useSettings"
import { liveQuery } from "dexie"
import { DefaultValue, atom, selector, selectorFamily } from "recoil"

import { walletDataState } from "./main"

const NO_OP = () => {}
// export const tokenRatesState = atom<DbTokenRates[]>({
//   key: "tokenRatesState",
//   effects: [
//     // sync from db
//     ({ setSelf }) => {
//       const obs = liveQuery(() => db.tokenRates.toArray())
//       const sub = obs.subscribe(setSelf)
//       return () => sub.unsubscribe()
//     },
//     // instruct backend to keep db synchronized while this atom is in use
//     () => api.tokenRates(NO_OP),
//   ],
// })

export const tokenRatesState = selector<DbTokenRates[]>({
  key: "tokenRatesState",
  get: ({ get }) => {
    const { tokenRates } = get(walletDataState)
    return tokenRates
  },
})

export const tokenRatesMapState = selector({
  key: "tokenRatesMapState",
  get: ({ get }) => {
    const tokenRates = get(tokenRatesState)
    return Object.fromEntries(tokenRates.map(({ tokenId, rates }) => [tokenId, rates]))
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
})

export const selectableCurrenciesState = selector<readonly TokenRateCurrency[]>({
  key: "selectableCurrencies",
  get: ({ get }) => get(settingQuery("selectableCurrencies")).slice(),
  set: ({ set }, newValue) => {
    if (!(newValue instanceof DefaultValue) && newValue.length < 1) {
      return
    }
    set(
      settingQuery("selectableCurrencies"),
      newValue instanceof DefaultValue ? newValue : [...new Set(newValue)]
    )
  },
})

export const selectedCurrencyState = selector<TokenRateCurrency>({
  key: "selectedCurrency",
  get: ({ get }) =>
    get(selectableCurrenciesState).includes(get(settingQuery("selectedCurrency")))
      ? get(settingQuery("selectedCurrency"))
      : get(selectableCurrenciesState).at(0) ?? "usd",
  set: ({ set }, newValue) => set(settingQuery("selectedCurrency"), newValue),
})
