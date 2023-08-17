import { db } from "@core/db"
import { Checker, jsonParser, string } from "@recoiljs/refine"
import { TokenId } from "@talismn/chaindata-provider"
import { DbTokenRates, TokenRateCurrency } from "@talismn/token-rates"
import { api } from "@ui/api"
import { storageEffect } from "@ui/util/atomEffect"
import { liveQuery } from "dexie"
import { DefaultValue, atom, selector, selectorFamily } from "recoil"
import Browser from "webextension-polyfill"

const NO_OP = () => {}
export const tokenRatesState = atom<DbTokenRates[]>({
  key: "tokenRatesState",
  default: [],
  effects: [
    // sync from db
    ({ setSelf }) => {
      const obs = liveQuery(() => db.tokenRates.toArray())
      const sub = obs.subscribe(setSelf)
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

const _selectableCurrenciesState = atom<ReadonlySet<TokenRateCurrency>>({
  key: "_selectableCurrency",
  default: new Set(["usd", "btc"]),
  effects: [
    storageEffect(Browser.storage.local, {
      key: "settings",
      subKey: "selectableCurrencies",
      isSet: true,
    }),
  ],
})

export const selectableCurrenciesState = selector<readonly TokenRateCurrency[]>({
  key: "selectableCurrency",
  get: ({ get }) => Array.from(get(_selectableCurrenciesState).values()).slice().sort(),
  set: ({ set }, newValue) =>
    set(
      _selectableCurrenciesState,
      newValue instanceof DefaultValue ? newValue : new Set(newValue)
    ),
})

const _selectedCurrencyState = atom<TokenRateCurrency>({
  key: "_selectedCurrency",
  default: "usd",
  effects: [
    storageEffect(Browser.storage.local, {
      key: "settings",
      subKey: "selectedCurrency",
      parser: jsonParser(string() as Checker<TokenRateCurrency>),
    }),
  ],
})

export const selectedCurrencyState = selector<TokenRateCurrency>({
  key: "selectedCurrency",
  get: ({ get }) =>
    get(selectableCurrenciesState).includes(get(_selectedCurrencyState))
      ? get(_selectedCurrencyState)
      : "usd",
  set: ({ set }, newValue) => set(_selectedCurrencyState, newValue),
})
