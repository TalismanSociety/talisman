import { isEqual } from "lodash-es"
import { distinctUntilChanged, Observable, of } from "rxjs"

import log from "../../log"
import type { IBalanceModule } from "../../types/IBalanceModule"
import { MODULE_TYPE } from "./config"
import { type BtcFetchState, fetchBtcBalancesWithState } from "./fetchBalances"

// Bitcoin blocks land ~every 10 minutes, and confirmed balances can only change on a new
// block. Esplora endpoints are also aggressively rate-limited (Blockstream: 700 req/hour
// per IP), so we poll on a slow tick and, after the initial full gap scan, only do a cheap
// incremental refresh (active addresses + first-unused frontier) rather than re-sweeping
// the whole gap range every time.
const TICK_INTERVAL = 120_000

export const subscribeBalances: IBalanceModule<typeof MODULE_TYPE>["subscribeBalances"] = ({
  networkId,
  tokensWithAddresses,
  connector,
  meta,
}) => {
  if (!tokensWithAddresses.length) return of({ success: [], errors: [] })

  return new Observable((subscriber) => {
    const abortController = new AbortController()

    // null until the first (cold) scan completes; afterwards each poll refreshes it
    let state: BtcFetchState | null = null

    const poll = async () => {
      try {
        if (abortController.signal.aborted) return

        const { results, state: newState } = await fetchBtcBalancesWithState({
          networkId,
          tokensWithAddresses,
          api: await connector.getApi(networkId),
          meta,
          priorState: state ?? undefined,
        })
        state = newState

        if (!abortController.signal.aborted) subscriber.next(results)
      } catch (error) {
        // esplora endpoints can be flaky/rate-limited: log and keep polling
        log.warn("Error polling bitcoin balances", { module: MODULE_TYPE, networkId, error })
      } finally {
        if (!abortController.signal.aborted) setTimeout(poll, TICK_INTERVAL)
      }
    }

    poll()

    return () => {
      abortController.abort()
    }
  }).pipe(distinctUntilChanged(isEqual))
}
