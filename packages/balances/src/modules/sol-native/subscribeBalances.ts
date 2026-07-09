import { distinctUntilChanged, Observable, of } from "rxjs"

import { reportJsActivity } from "@talismn/util"

import log from "../../log"
import { isEqualModuleResults } from "../../types/fingerprint"
import type { FetchBalanceResults, IBalanceModule } from "../../types/IBalanceModule"
import { MODULE_TYPE } from "./config"
import { fetchBalances } from "./fetchBalances"

const SUBSCRIPTION_INTERVAL = 6_000

export const subscribeBalances: IBalanceModule<typeof MODULE_TYPE>["subscribeBalances"] = ({
  networkId,
  tokensWithAddresses,
  connector,
}) => {
  if (!tokensWithAddresses.length) return of({ success: [], errors: [] })

  return new Observable<FetchBalanceResults>((subscriber) => {
    const abortController = new AbortController()

    const poll = async () => {
      try {
        if (abortController.signal.aborted) return

        const balances = await fetchBalances({
          networkId,
          tokensWithAddresses,
          connector,
        })

        if (abortController.signal.aborted) return

        // poll-completion marker: fires even when the dedup gate below suppresses the
        // emission, so stall watchdogs can attribute the poll's fetch/decode compute
        reportJsActivity(`poll ${MODULE_TYPE} ${networkId} (${balances.success.length})`)

        subscriber.next(balances)

        setTimeout(poll, SUBSCRIPTION_INTERVAL)
      } catch (error) {
        log.error("Error", {
          module: MODULE_TYPE,
          networkId,
          tokensWithAddresses,
          error,
        })
        subscriber.error(error)
      }
    }

    poll()

    return () => {
      abortController.abort()
    }
  }).pipe(distinctUntilChanged(isEqualModuleResults))
}
