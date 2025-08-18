import { BalancesProvider } from "@talismn/balances"
import { debounceTime, first, firstValueFrom, Observable, shareReplay, skip, switchMap } from "rxjs"

import { chainConnectors } from "../../rpcs/balance-modules"
import { chaindataProvider } from "../../rpcs/chaindata"
import { balancesStore$, updateBalancesStore } from "./store.balances"

const balancesProvider$ = balancesStore$.pipe(
  first(),
  switchMap(
    (storage) =>
      new Observable<BalancesProvider>((subscriber) => {
        const provider = new BalancesProvider(chaindataProvider, chainConnectors, storage)

        subscriber.next(provider)

        // store state in extension's db so it can be reused on next startup
        return provider.storage$
          .pipe(skip(1), debounceTime(200))
          .subscribe((data) => updateBalancesStore(data))
      }),
  ),
  shareReplay(1),
)

export const balancesProvider = {
  getBalances$: (...args: Parameters<BalancesProvider["getBalances$"]>) => {
    return balancesProvider$.pipe(switchMap((provider) => provider.getBalances$(...args)))
  },

  fetchBalances: async (...args: Parameters<BalancesProvider["fetchBalances"]>) => {
    const provider = await firstValueFrom(balancesProvider$)
    return provider.fetchBalances(...args)
  },

  getDetectedTokensId$: (address: string) => {
    return balancesProvider$.pipe(switchMap((provider) => provider.getDetectedTokensId$(address)))
  },
}
