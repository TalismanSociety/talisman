import { BalancesProvider } from "@talismn/balances"
import { first, Observable, shareReplay, skip, switchMap } from "rxjs"

import { chainConnectors } from "../../rpcs/balance-modules"
import { chaindataProvider } from "../../rpcs/chaindata"
import { balancesStore$, updateBalancesStore } from "./store.balances"

export const balancesProvider$ = balancesStore$.pipe(
  first(),
  switchMap(
    (storage) =>
      new Observable<BalancesProvider>((subscriber) => {
        const provider = new BalancesProvider(chaindataProvider, chainConnectors, storage)

        subscriber.next(provider)

        return provider.storage$.pipe(skip(1)).subscribe((data) => {
          updateBalancesStore(data)
        })
      }),
  ),
  shareReplay(1),
)
