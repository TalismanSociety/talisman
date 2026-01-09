import { isEqual } from "lodash-es"
import { catchError, distinctUntilChanged, EMPTY, from, of, switchMap, timer } from "rxjs"

import log from "../../log"
import { IBalanceModule } from "../../types/IBalanceModule"
import { MODULE_TYPE } from "./config"
import { fetchBalances } from "./fetchBalances"

const SUBSCRIPTION_INTERVAL = 6_000

export const subscribeBalances: IBalanceModule<typeof MODULE_TYPE>["subscribeBalances"] = ({
  networkId,
  tokensWithAddresses,
  connector,
  miniMetadata,
}) => {
  if (!tokensWithAddresses.length) return of({ success: [], errors: [] })

  // on hydration balances are fetched using a runtimeApi, which can't be subscribed to.
  // => poll values periodically using RxJS timer instead of blocking setTimeout
  return timer(0, SUBSCRIPTION_INTERVAL).pipe(
    switchMap(() =>
      from(
        fetchBalances({
          networkId,
          tokensWithAddresses,
          connector,
          miniMetadata,
        }),
      ).pipe(
        catchError((error) => {
          log.error("Error", {
            module: MODULE_TYPE,
            networkId,
            miniMetadata,
            addressesByToken: tokensWithAddresses,
            error,
          })
          // Return EMPTY to continue the stream instead of breaking it
          // This allows the timer to continue and retry on the next interval
          return EMPTY
        }),
      ),
    ),
    distinctUntilChanged(isEqual),
  )
}
