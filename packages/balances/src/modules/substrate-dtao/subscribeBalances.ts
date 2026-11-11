import { reportJsActivity } from "@talismn/util"
import { distinctUntilChanged, Observable, of } from "rxjs"

import log from "../../log"
import { isEqualModuleResults } from "../../types/fingerprint"
import type { FetchBalanceResults, IBalanceModule } from "../../types/IBalanceModule"
import { fetchBestBlockHash, getBalanceDefs } from "../shared"
import { stabilizeModuleResults } from "../shared/stabilizeBalances"
import { MODULE_TYPE } from "./config"
import { fetchBalancesAt } from "./fetchBalances"
import { isEffectivelyEqualDTaoBalance } from "./isEffectivelyEqualDTaoBalance"

/**
 * Half of Bittensor's 12s block time, so a new block is read within 6s of being produced.
 * A poll that finds the same best block as the last good poll ends after that one request.
 */
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
    /** the block the last poll read without errors */
    let lastGoodBlockHash: `0x${string}` | null = null

    // on hydration balances are fetched using a runtimeApi, which can't be subscribed to.
    // => poll values for each block
    const poll = async () => {
      try {
        if (abortController.signal.aborted) return

        // chain state only changes from one block to the next
        const blockHash = await fetchBestBlockHash(connector, networkId)
        if (abortController.signal.aborted) return
        if (blockHash === lastGoodBlockHash) {
          setTimeout(poll, SUBSCRIPTION_INTERVAL)
          return
        }

        const balances = await fetchBalancesAt(
          {
            networkId,
            tokensWithAddresses: tokensWithAddresses,
            connector,
            miniMetadata,
            signal: abortController.signal,
          },
          blockHash
        )

        if (abortController.signal.aborted) return
        lastGoodBlockHash = balances.errors.length ? null : blockHash

        // poll-completion marker: fires even when the dedup gate below suppresses the
        // emission, so stall watchdogs can attribute the poll's fetch/decode compute
        reportJsActivity(`poll ${MODULE_TYPE} ${networkId} (${balances.success.length})`)

        subscriber.next(balances)
      } catch (error) {
        if (abortController.signal.aborted) return
        lastGoodBlockHash = null

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
