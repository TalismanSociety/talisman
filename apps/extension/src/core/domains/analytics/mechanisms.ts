import { log } from "@common/log"
import { filter } from "rxjs"

import { requestStore } from "../../libs/requests/store"
import { passwordStore } from "../app/store.password"
import { liveWalletBalances$ } from "../balances/walletBalances"
import { txStatusFacts$ } from "../transactions/store.transactions"
import { dappRequestTracker } from "./dappRequests"
import { analyticsEngine } from "./engine"
import { onInstalledForAnalytics, onLockFact } from "./lifecycle"
import { analyticsLifecycleStore } from "./store.lifecycle"
import { track } from "./track"
import { gatherTvlInputs } from "./tvl/gather"
import { createTvlSchedule } from "./tvl/schedule"
import { trackTxSettled } from "./txSettled"

const tvlSchedule = createTvlSchedule({
  admits: () => analyticsEngine.admits("usage"),
  live$: liveWalletBalances$,
  locked$: passwordStore.lockFacts$.pipe(filter((fact) => fact.type === "locked")),
  store: analyticsLifecycleStore,
  gather: gatherTvlInputs,
  send: (snapshot) => track("tvl_snapshot", snapshot),
  version: process.env.VERSION ?? "unknown",
  now: Date.now,
})

const reportFailure = (what: string) => (cause: unknown) =>
  log.error(`[analytics] ${what} failed`, { cause })

/**
 * The background half of the central mechanisms: domain stores publish facts and never import
 * analytics, and this is their only subscriber. Call once, synchronously, at the top level of
 * the service worker: it registers an onInstalled listener.
 */
export const startAnalyticsMechanisms = () => {
  chrome.runtime.onInstalled.addListener((details) => {
    onInstalledForAnalytics(details).catch(reportFailure("onInstalled"))
  })

  passwordStore.lockFacts$.subscribe((fact) => {
    onLockFact(fact)
    if (fact.type === "unlocked") tvlSchedule.onUnlock().catch(reportFailure("tvl_snapshot"))
  })

  requestStore.facts$.subscribe((fact) => {
    try {
      dappRequestTracker.onFact(fact)
    } catch (cause) {
      reportFailure("dapp request")(cause)
    }
  })

  txStatusFacts$.subscribe((fact) => {
    trackTxSettled(fact).catch(reportFailure("tx_settled"))
  })
}
