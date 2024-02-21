import { db } from "@core/db"
import { log } from "@core/log"
import { TokenId } from "@talismn/chaindata-provider"
import { DbTokenRates, TokenRateCurrency } from "@talismn/token-rates"
import { api } from "@ui/api"
import { liveQuery } from "dexie"
import { atom } from "jotai"
import { atomFamily, atomWithObservable, selectAtom } from "jotai/utils"
import { DefaultValue, atom as ratom, selector, selectorFamily } from "recoil"

import { settingQuery } from "./settings"
import { atomWithSubscription } from "./utils/atomWithSubscription"

const NO_OP = () => {}

const tokenRatesSubscriptionAtom = atomWithSubscription<void>(
  () => api.tokenRates(NO_OP),
  "tokenRatesAtom"
)

const tokenRatesObservable = atomWithObservable(() => liveQuery(() => db.tokenRates.toArray()))

const tokenRatesAtom = atom(async (get) => {
  get(tokenRatesSubscriptionAtom)
  return await get(tokenRatesObservable)
})

export const tokenRatesMapAtom = selectAtom(tokenRatesAtom, (tokenRates) =>
  Object.fromEntries(tokenRates.map(({ tokenId, rates }) => [tokenId, rates]))
)

export const tokenRatesByIdFamily = atomFamily((tokenId: TokenId | null | undefined) =>
  atom(async (get) => {
    const tokenRates = await get(tokenRatesMapAtom)
    return (tokenId && tokenRates[tokenId]) || null
  })
)

const tokenRatesState = ratom<DbTokenRates[]>({
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
