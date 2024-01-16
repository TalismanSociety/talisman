import { db } from "@core/db"
import { log } from "@core/log"
import { TokenId } from "@talismn/chaindata-provider"
import { DbTokenRates, TokenRateCurrency } from "@talismn/token-rates"
import { api } from "@ui/api"
import { liveQuery } from "dexie"
import { DefaultValue, atom, selector, selectorFamily } from "recoil"

import { settingQuery } from "./settings"

const NO_OP = () => {}

export const tokenRatesState = atom<DbTokenRates[]>({
  key: "tokenRatesState",
  effects: [
    ({ setSelf }) => {
      log.debug("tokenRatesState.init")

      const obsEvmNetworks = liveQuery(() => db.tokenRates.toArray())
      const sub = obsEvmNetworks.subscribe(setSelf)
      return () => sub.unsubscribe()
    },
    () => api.tokenRates(NO_OP),
  ],
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
  get: ({ get }) => {
    const selectableCurrencies = get(selectableCurrenciesState)
    return selectableCurrencies.includes(get(settingQuery("selectedCurrency")))
      ? get(settingQuery("selectedCurrency"))
      : selectableCurrencies.at(0) ?? "usd"
  },
  set: ({ set }, newValue) => set(settingQuery("selectedCurrency"), newValue),
})
