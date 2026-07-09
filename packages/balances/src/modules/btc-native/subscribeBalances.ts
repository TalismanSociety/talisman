import { hasBitcoinAccountActivity } from "@talismn/bitcoin"
import { isEqual } from "lodash-es"
import { distinctUntilChanged, Observable, of } from "rxjs"

import log from "../../log"
import type { IBalanceModule } from "../../types/IBalanceModule"
import { MODULE_TYPE } from "./config"
import {
  type BtcFetchState,
  fetchBtcBalancesWithState,
  getBtcNetworkHrp,
  getWarmStartCursors,
} from "./fetchBalances"

// bitcoin ticks every ~10 minutes: poll the (cheap) tip height and hot-set activity
// on a short interval, and run a full warm-started gap rescan only when something moved
const TICK_INTERVAL = 30_000
const FULL_RESCAN_INTERVAL = 600_000

export const subscribeBalances: IBalanceModule<typeof MODULE_TYPE>["subscribeBalances"] = ({
  networkId,
  tokensWithAddresses,
  connector,
  meta,
}) => {
  if (!tokensWithAddresses.length) return of({ success: [], errors: [] })

  const hrp = getBtcNetworkHrp(networkId)

  return new Observable((subscriber) => {
    const abortController = new AbortController()

    let lastTip: number | null = null
    let lastFullScanAt = 0
    let state: BtcFetchState | null = null

    const fullRefresh = async () => {
      const { results, state: newState } = await fetchBtcBalancesWithState({
        networkId,
        tokensWithAddresses,
        api: await connector.getApi(networkId),
        meta,
        warmStart: state ? getWarmStartCursors(state) : undefined,
      })
      state = newState
      lastFullScanAt = Date.now()
      if (!abortController.signal.aborted) subscriber.next(results)
    }

    const hasActivity = async (): Promise<boolean> => {
      if (!state) return true
      const api = await connector.getApi(networkId)

      for (const scan of Object.values(state.scans))
        if (await hasBitcoinAccountActivity(api, scan, hrp)) return true

      for (const [address, snapshot] of Object.entries(state.plain)) {
        const stats = await api.getAddressStats(address)
        const confirmedSats =
          BigInt(stats.chain_stats.funded_txo_sum) - BigInt(stats.chain_stats.spent_txo_sum)
        const mempoolDeltaSats =
          BigInt(stats.mempool_stats.funded_txo_sum) - BigInt(stats.mempool_stats.spent_txo_sum)
        if (
          confirmedSats !== snapshot.confirmedSats ||
          mempoolDeltaSats !== snapshot.mempoolDeltaSats
        )
          return true
      }

      return false
    }

    const poll = async () => {
      try {
        if (abortController.signal.aborted) return

        const api = await connector.getApi(networkId)
        const tip = await api.getTipHeight()

        const needFullScan =
          lastTip === null ||
          tip !== lastTip ||
          Date.now() - lastFullScanAt > FULL_RESCAN_INTERVAL ||
          (await hasActivity())

        lastTip = tip

        if (abortController.signal.aborted) return
        if (needFullScan) await fullRefresh()
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
