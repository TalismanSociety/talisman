import { reportJsActivity } from "@talismn/util"
import { distinctUntilChanged, Observable, of } from "rxjs"

import log from "../../log"
import { isEqualModuleResults } from "../../types/fingerprint"
import type { FetchBalanceResults, IBalanceModule } from "../../types/IBalanceModule"
import { getBalanceDefs } from "../shared"
import { stabilizeModuleResults } from "../shared/stabilizeBalances"
import { MODULE_TYPE } from "./config"
import { fetchBalances } from "./fetchBalances"
import { isEffectivelyEqualDTaoBalance } from "./isEffectivelyEqualDTaoBalance"

const SUBSCRIPTION_INTERVAL = 6_000

export const subscribeBalances: IBalanceModule<typeof MODULE_TYPE>["subscribeBalances"] = ({
  networkId,
  tokensWithAddresses,
  connector,
  miniMetadata,
}) => {
  if (!tokensWithAddresses.length) return of({ success: [], errors: [] })

  const balanceDefs = getBalanceDefs<typeof MODULE_TYPE>(tokensWithAddresses)

  return new Observable<FetchBalanceResults>((subscriber) => {
    const abortController = new AbortController()

    // on hydration balances are fetched using a runtimeApi, which can't be subscribed to.
    // => poll values for each block
    const poll = async () => {
      try {
        if (abortController.signal.aborted) return

        const balances = await fetchBalances({
          networkId,
          tokensWithAddresses: tokensWithAddresses,
          connector,
          miniMetadata,
          signal: abortController.signal,
        })

        if (abortController.signal.aborted) return

        // poll-completion marker: fires even when the dedup gate below suppresses the
        // emission, so stall watchdogs can attribute the poll's fetch/decode compute
        reportJsActivity(`poll ${MODULE_TYPE} ${networkId} (${balances.success.length})`)

        subscriber.next(balances)
      } catch (error) {
        if (abortController.signal.aborted) return

        // don't kill the subscription (balances would be stuck as stale until next resubscribe),
        // emit balance errors so the provider can mark cached balances stale, then retry on next poll
        log.error("Error", {
          module: MODULE_TYPE,
          networkId,
          miniMetadata,
          addressesByToken: tokensWithAddresses,
          error,
        })
        const fetchError = error instanceof Error ? error : new Error(String(error))
        subscriber.next({
          success: [],
          errors: balanceDefs.map((def) => ({
            tokenId: def.token.id,
            address: def.address,
            error: fetchError,
          })),
        })
      }

      if (!abortController.signal.aborted) setTimeout(poll, SUBSCRIPTION_INTERVAL)
    }

    poll()

    return () => {
      abortController.abort()
    }
  }).pipe(
    // reuse previous objects for balances whose only change is sub-tolerance drift of the
    // AMM price / root-claim accrual — without this, those values move every block and
    // the distinctUntilChanged below never suppresses a poll
    stabilizeModuleResults(isEffectivelyEqualDTaoBalance),
    distinctUntilChanged(isEqualModuleResults)
  )
}
