import { TokenId } from "@talismn/chaindata-provider"
import { atom } from "jotai"
import { atomFamily, atomWithObservable } from "jotai/utils"

import { selectedCurrency$, tokenRates$ } from "@ui/state"

// const NO_OP = () => {}

// const tokenRatesSubscriptionAtom = atomWithSubscription<void>(() => api.tokenRates(NO_OP), {
//   debugLabel: "tokenRatesAtom",
//   refCount: true,
// })

// const tokenRatesObservableAtom = atomWithObservable(() => tokenRates$)

// const tokenRatesAtom = atom((get) => {
//   get(tokenRatesSubscriptionAtom)
//   return get(tokenRatesObservableAtom)
// })

const tokenRatesAtom = atomWithObservable(() => tokenRates$)

export const tokenRatesMapAtom = atom(async (get) => {
  const tokenRates = await get(tokenRatesAtom)
  return Object.fromEntries(tokenRates.map(({ tokenId, rates }) => [tokenId, rates]))
})

/** @deprecated this suspenses for every new key, try to use another approach */
export const tokenRatesByIdFamily = atomFamily((tokenId: TokenId | null | undefined) =>
  atom(async (get) => {
    if (!tokenId) return null
    const tokenRates = await get(tokenRatesMapAtom)
    return tokenRates[tokenId] || null
  })
)

export const selectedCurrencyAtom = atomWithObservable(() => selectedCurrency$)

// export const selectableCurrenciesAtom = atom(
//   async (get) => {
//     const currencies = (await get(
//       settingsAtomFamily("selectableCurrencies")
//     )) as TokenRateCurrency[]
//     return currencies.slice()
//   },
//   async (get, set, newValue: SetStateAction<TokenRateCurrency[]>) => {
//     if (typeof newValue === "function") newValue = newValue(await get(selectableCurrenciesAtom))
//     if (!newValue.length) return
//     await settingsStore.set({ selectableCurrencies: newValue })
//   }
// )

// export const selectedCurrencyAtom = atom(
//   async (get) => {
//     const selectableCurrencies = await get(selectableCurrenciesAtom)
//     const selectedCurrency = (await get(
//       settingsAtomFamily("selectedCurrency")
//     )) as TokenRateCurrency
//     return selectableCurrencies.includes(selectedCurrency)
//       ? selectedCurrency
//       : selectableCurrencies.at(0) ?? "usd"
//   },
//   async (get, set, newValue: SetStateAction<TokenRateCurrency>) => {
//     if (typeof newValue === "function") newValue = newValue(await get(selectedCurrencyAtom))
//     await settingsStore.set({ selectedCurrency: newValue })
//   }
// )
