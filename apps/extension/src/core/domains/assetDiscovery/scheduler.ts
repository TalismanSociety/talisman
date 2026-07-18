import { sleep } from "@talismn/util"
import PQueue from "p-queue"

import { isUiOpen, isUiOpen$ } from "../../libs/uiOpenState"

/**
 * Shared concurrency budget for ALL asset discovery RPC work: EVM balance chunk
 * fetches, substrate network probes and solana token account lookups all go
 * through this queue. Discovery is a background task with no urgency — it must
 * never compete with the live balances pipeline or the UI for resources. While
 * an extension UI is open the budget shrinks to a single slot and tasks space
 * out further, so scans stay imperceptible; full speed resumes when closed.
 */
const CONCURRENCY_UI_CLOSED = 2
const CONCURRENCY_UI_OPEN = 1
const TASK_GAP_UI_CLOSED_MS = 50
const TASK_GAP_UI_OPEN_MS = 250

const discoveryQueue = new PQueue({ concurrency: CONCURRENCY_UI_CLOSED })

isUiOpen$.subscribe((isOpen) => {
  discoveryQueue.concurrency = isOpen ? CONCURRENCY_UI_OPEN : CONCURRENCY_UI_CLOSED
})

/** Runs a unit of discovery work through the shared queue, with an adaptive breathing gap */
export const runDiscoveryTask = <T>(fn: () => Promise<T>): Promise<T> =>
  discoveryQueue.add(
    async () => {
      // gap mode is read at execution time, not enqueue time, so an in-flight
      // scan adapts as soon as the user opens or closes a UI
      await sleep(isUiOpen() ? TASK_GAP_UI_OPEN_MS : TASK_GAP_UI_CLOSED_MS)
      return fn()
    },
    { throwOnTimeout: true }
  )
