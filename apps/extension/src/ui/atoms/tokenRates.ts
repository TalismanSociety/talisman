import { TokenId } from "@talismn/chaindata-provider"
import { TokenRateCurrency } from "@talismn/token-rates"
import { liveQuery } from "dexie"
import { atom, SetStateAction } from "jotai"
import { atomFamily, atomWithObservable } from "jotai/utils"
import { from } from "rxjs"

import { db, settingsStore } from "@extension/core"
import { api } from "@ui/api"

import { settingsAtomFamily } from "./settings"
import { atomWithSubscription } from "./utils/atomWithSubscription"
import { logObservableUpdate } from "./utils/logObservableUpdate"

const NO_OP = () => {}

const tokenRatesSubscriptionAtom = atomWithSubscription<void>(() => api.tokenRates(NO_OP), {
  debugLabel: "tokenRatesAtom",
  refCount: true,
})

const tokenRatesObservableAtom = atomWithObservable(() =>
  from(liveQuery(() => db.tokenRates.toArray())).pipe(
    logObservableUpdate("tokenRatesObservableAtom")
  )
)

const tokenRatesAtom = atom((get) => {
  get(tokenRatesSubscriptionAtom)
  return get(tokenRatesObservableAtom)
})

export const tokenRatesMapAtom = atom(async (get) => {
  const tokenRates = await get(tokenRatesAtom)
  return Object.fromEntries(tokenRates.map(({ tokenId, rates }) => [tokenId, rates]))
})

export const tokenRatesByIdFamily = atomFamily((tokenId: TokenId | null | undefined) =>
  atom(async (get) => {
    if (!tokenId) return null
    const tokenRates = await get(tokenRatesMapAtom)
    return tokenRates[tokenId] || null
  })
)

export const selectableCurrenciesAtom = atom(
  async (get) => {
    const currencies = (await get(
      settingsAtomFamily("selectableCurrencies")
    )) as TokenRateCurrency[]
    return currencies.slice()
  },
  async (get, set, newValue: SetStateAction<TokenRateCurrency[]>) => {
    if (typeof newValue === "function") newValue = newValue(await get(selectableCurrenciesAtom))
    if (!newValue.length) return
    await settingsStore.set({ selectableCurrencies: newValue })
  }
)

export const selectedCurrencyAtom = atom(
  async (get) => {
    const selectableCurrencies = await get(selectableCurrenciesAtom)
    const selectedCurrency = (await get(
      settingsAtomFamily("selectedCurrency")
    )) as TokenRateCurrency
    return selectableCurrencies.includes(selectedCurrency)
      ? selectedCurrency
      : selectableCurrencies.at(0) ?? "usd"
  },
  async (get, set, newValue: SetStateAction<TokenRateCurrency>) => {
    if (typeof newValue === "function") newValue = newValue(await get(selectedCurrencyAtom))
    await settingsStore.set({ selectedCurrency: newValue })
  }
)
