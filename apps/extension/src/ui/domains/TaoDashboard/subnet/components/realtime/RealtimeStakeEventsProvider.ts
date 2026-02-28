import { fromHex, toHex } from "@polkadot-api/utils"
import { provideContext } from "@talisman/util/provideContext"
import { blake2b256 } from "@talismn/crypto"
import type { ScaleApi } from "@talismn/sapi"
import { api } from "@ui/api"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { log } from "extension-shared"
import { useCallback, useEffect, useRef, useState } from "react"
import { BITTENSOR_NETWORK_ID } from "../../../subnets/constants"
import type { RealtimeStakeEvent } from "./types"

/** System.Events storage key — constant across all Substrate chains */
const SYSTEM_EVENTS_KEY = "0x26aa394eea5630e07c48ae0c9558cef780d41e5e16056765bc8461851072c9d7"

/** How often we poll for the best block header (ms) */
const POLL_INTERVAL_MS = 2_000

/** Max blocks to process concurrently during backfill */
const BACKFILL_CONCURRENCY = 5

// ---------------------------------------------------------------------------
// Event extraction from a single block
// ---------------------------------------------------------------------------

type DecodedEvent = {
  phase: { type?: string; value?: number } | undefined
  event: { type: string; value: { type: string; value: unknown } }
  topics: unknown[]
}

type ExtractionResult = {
  blockHash: string
  events: RealtimeStakeEvent[]
}

/**
 * Fetch and decode SubtensorModule stake events for a given block.
 * Accepts an optional pre-fetched `blockHash` to avoid a redundant RPC call
 * when the caller has already resolved the hash (e.g. for reorg detection).
 */
const extractStakeEventsFromBlock = async (
  sapi: ScaleApi,
  blockNumber: number,
  netuid: number,
  signal: AbortSignal,
  preBlockHash?: string
): Promise<ExtractionResult> => {
  const EMPTY: ExtractionResult = { blockHash: "", events: [] }

  // 1. Get block hash (use pre-fetched if available)
  const blockHash =
    preBlockHash ??
    (await api.subSend<`0x${string}`>(BITTENSOR_NETWORK_ID, "chain_getBlockHash", [blockNumber]))
  if (!blockHash || signal.aborted) return EMPTY

  // 2. Fetch System.Events at this block
  const eventsHex = await api.subSend<string>(BITTENSOR_NETWORK_ID, "state_getStorage", [
    SYSTEM_EVENTS_KEY,
    blockHash,
  ])
  if (!eventsHex || signal.aborted) return EMPTY

  // 3. Decode events
  const eventsCodec = sapi.chain.builder.buildStorage("System", "Events")
  const decoded = eventsCodec.value.dec(eventsHex) as DecodedEvent[]

  // 4. Filter for SubtensorModule StakeAdded / StakeRemoved matching our netuid
  // Collect matching events with their extrinsic indices
  const matches: { extrinsicIndex: number; event: RealtimeStakeEvent }[] = []
  const now = Date.now()

  for (const { phase, event } of decoded) {
    if (phase?.type !== "ApplyExtrinsic" || phase.value === undefined) continue
    if (event.type !== "SubtensorModule") continue

    const eventName = event.value?.type
    if (eventName !== "StakeAdded" && eventName !== "StakeRemoved") continue

    // Event tuple: [coldkey, hotkey, taoAmount, alphaAmount, netuid, fee]
    const value = event.value.value as [string, string, bigint, bigint, number, bigint]
    const [coldkey, hotkey, taoAmount, alphaAmount, eventNetuid] = value

    if (eventNetuid !== netuid) continue

    // Filter dust events (zero tao or alpha amount — would produce 0 or Infinity price)
    if (taoAmount === 0n || alphaAmount === 0n) continue

    matches.push({
      extrinsicIndex: phase.value,
      event: {
        method: eventName === "StakeAdded" ? "Adding" : "Removing",
        taoAmount,
        alphaAmount,
        coldkey,
        hotkey,
        hash: "", // will fill below
        blockHeight: blockNumber,
        extrinsicIndex: phase.value,
        timestamp: now,
      },
    })
  }

  if (matches.length === 0 || signal.aborted) return { blockHash, events: [] }

  // 5. Fetch the block to compute extrinsic hashes
  const block = await api.subSend<{ block: { extrinsics: string[] } }>(
    BITTENSOR_NETWORK_ID,
    "chain_getBlock",
    [blockHash]
  )
  if (!block?.block?.extrinsics || signal.aborted) return EMPTY

  for (const match of matches) {
    const extHex = block.block.extrinsics[match.extrinsicIndex]
    if (extHex) {
      const extBytes = fromHex(extHex as `0x${string}`)
      match.event.hash = toHex(blake2b256(extBytes))
    }
  }

  return {
    blockHash,
    events: matches.filter((m) => m.event.hash).map((m) => m.event),
  }
}

// ---------------------------------------------------------------------------
// Hook: useRealtimeStakeEvents
// ---------------------------------------------------------------------------

export type UseRealtimeStakeEventsReturn = {
  /** Real-time events currently in the buffer (blockHeight > floorBlockHeight) */
  events: RealtimeStakeEvent[]
  /**
   * The latest best block number observed by the poller.
   * Consumers can use this as a "heartbeat" to trigger refetches
   * of on-chain state (e.g. runtime API calls) on every new block.
   */
  bestBlockNumber: number | null
  /**
   * Report the highest block height that a consumer's indexed data covers.
   * Each consumer must provide a stable `consumerId` string.
   *
   * The buffer is pruned only below the **minimum** of all reported floors,
   * ensuring no consumer loses data it still needs.
   */
  reportFloor: (consumerId: string, blockHeight: number) => void
}

/**
 * Watches best (non-finalized) blocks on Bittensor for SubtensorModule
 * StakeAdded/StakeRemoved events targeting a specific subnet.
 *
 * Events are accumulated in a sliding buffer keyed by block number.
 * Consumers call `reportFloor(consumerId, h)` when their indexed data source
 * reports a new `lastBlockHeight` — events at or below the minimum floor
 * across all consumers are discarded.
 *
 * On the first `reportFloor` call, a one-time backfill runs to capture any
 * events between the indexer head and the first polled block.
 */
export const useRealtimeStakeEventsProvider = ({
  netuid,
}: {
  netuid: number | null | undefined
}): UseRealtimeStakeEventsReturn => {
  const { data: sapi } = useScaleApi(BITTENSOR_NETWORK_ID)

  // --- Buffer state ---
  // Map<blockNumber, events[]> — the sliding buffer source of truth
  const bufferRef = useRef(new Map<number, RealtimeStakeEvent[]>())
  // Map<blockNumber, blockHash> — tracks which hash we processed per height
  // so we can detect when the best block changes (reorg at the tip)
  const processedRef = useRef(new Map<number, string>())
  // The first block we ever polled (used as upper bound for backfill)
  const watchStartBlockRef = useRef<number | null>(null)
  // Per-consumer floor heights — prune only below the minimum
  const consumerFloorsRef = useRef(new Map<string, number>())
  // Effective floor = min of all consumer floors (0 if no consumers yet)
  const floorRef = useRef<number>(0)
  // Whether backfill has been performed
  const backfillDoneRef = useRef(false)
  // AbortController for the backfill task — aborted on netuid change / unmount
  const backfillAbortRef = useRef<AbortController | null>(null)
  // The last block number we advanced to (for sequential processing)
  const lastProcessedBlockRef = useRef<number>(0)

  // Flattened event list exposed to consumers — triggers re-render
  const [events, setEvents] = useState<RealtimeStakeEvent[]>([])
  // Best block number — exposed as a heartbeat for consumers
  const [bestBlockNumber, setBestBlockNumber] = useState<number | null>(null)

  // Derive the flat sorted event list from the buffer
  const deriveEvents = useCallback(() => {
    const floor = floorRef.current
    const all: RealtimeStakeEvent[] = []
    for (const [blockNum, evts] of bufferRef.current) {
      if (blockNum > floor) all.push(...evts)
    }
    // Sort by block height ascending, then by extrinsic index (preserves on-chain order)
    all.sort((a, b) => a.blockHeight - b.blockHeight || a.extrinsicIndex - b.extrinsicIndex)
    // Avoid unnecessary re-renders when event list hasn't changed
    setEvents((prev) => {
      if (
        prev.length === all.length &&
        prev.every((e, i) => e.hash === all[i].hash && e.blockHeight === all[i].blockHeight)
      )
        return prev
      return all
    })
  }, [])

  // Reset all state when netuid changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: netuid is intentionally a dependency so all refs + state reset when the user switches subnet
  useEffect(() => {
    bufferRef.current = new Map()
    processedRef.current = new Map()
    watchStartBlockRef.current = null
    consumerFloorsRef.current = new Map()
    floorRef.current = 0
    backfillDoneRef.current = false
    backfillAbortRef.current?.abort()
    backfillAbortRef.current = null
    lastProcessedBlockRef.current = 0
    setEvents([])
    setBestBlockNumber(null)
  }, [netuid])

  // --- Polling loop: watch best blocks ---
  useEffect(() => {
    if (!sapi || !netuid) return

    const controller = new AbortController()
    const { signal } = controller
    let polling = false

    const poll = async () => {
      if (polling) return
      polling = true
      try {
        // Get best block header
        const header = await api.subSend<{ number: string }>(
          BITTENSOR_NETWORK_ID,
          "chain_getHeader",
          []
        )
        if (!header?.number || signal.aborted) return

        const bestBlock = Number.parseInt(header.number, 16)
        if (!bestBlock || !Number.isFinite(bestBlock)) return

        // Record the first polled block for backfill boundary
        if (watchStartBlockRef.current === null) {
          watchStartBlockRef.current = bestBlock
          lastProcessedBlockRef.current = bestBlock - 1 // will process bestBlock
        }

        // Handle reorgs: if best block went backwards, invalidate orphaned blocks
        if (bestBlock < lastProcessedBlockRef.current) {
          for (const blockNum of [...processedRef.current.keys()]) {
            if (blockNum > bestBlock) {
              processedRef.current.delete(blockNum)
              bufferRef.current.delete(blockNum)
            }
          }
        }

        // Always re-check at least the current tip — its hash may have
        // changed since last poll (consensus hasn't finalised it yet).
        const from = Math.min(lastProcessedBlockRef.current + 1, bestBlock)
        const to = bestBlock
        let lastSuccessBlock = lastProcessedBlockRef.current

        for (let blockNum = from; blockNum <= to; blockNum++) {
          if (signal.aborted) return
          // Skip blocks below the floor (indexer already covers them)
          if (blockNum <= floorRef.current) {
            processedRef.current.set(blockNum, "floor")
            lastSuccessBlock = blockNum
            continue
          }

          // Cheaply fetch the block hash to detect tip changes
          const blockHash = await api.subSend<string>(BITTENSOR_NETWORK_ID, "chain_getBlockHash", [
            blockNum,
          ])
          if (!blockHash || signal.aborted) continue

          // Skip if we already processed this exact block hash
          if (processedRef.current.get(blockNum) === blockHash) {
            lastSuccessBlock = blockNum
            continue
          }

          try {
            const { events: newEvents } = await extractStakeEventsFromBlock(
              sapi,
              blockNum,
              netuid,
              signal,
              blockHash
            )
            if (signal.aborted) return

            processedRef.current.set(blockNum, blockHash)
            if (newEvents.length > 0) {
              bufferRef.current.set(blockNum, newEvents)
            } else {
              // Reorged block may no longer contain matching events
              bufferRef.current.delete(blockNum)
            }
            lastSuccessBlock = blockNum
          } catch (err) {
            // Non-fatal — we'll try this block again on next poll cycle
            log.warn("[RealtimeStakeEvents] Failed to process block", blockNum, err)
            break // Don't skip block numbers — try again next cycle
          }
        }

        lastProcessedBlockRef.current = lastSuccessBlock
        setBestBlockNumber(to)
        deriveEvents()
      } catch (err) {
        if (!signal.aborted) {
          log.warn("[RealtimeStakeEvents] Poll error", err)
        }
      } finally {
        polling = false
      }
    }

    // Initial poll immediately
    poll()
    const interval = setInterval(poll, POLL_INTERVAL_MS)

    return () => {
      controller.abort()
      backfillAbortRef.current?.abort()
      clearInterval(interval)
    }
  }, [sapi, netuid, deriveEvents])

  // --- reportFloor: per-consumer floor tracking ---
  const reportFloor = useCallback(
    (consumerId: string, blockHeight: number) => {
      if (!blockHeight || !Number.isFinite(blockHeight)) return

      const floors = consumerFloorsRef.current
      const prev = floors.get(consumerId) ?? 0
      if (blockHeight <= prev) return // consumer already reported at or above this

      floors.set(consumerId, blockHeight)

      // Effective floor = minimum across all consumers
      const newFloor = Math.min(...floors.values())
      if (newFloor <= floorRef.current) return // effective floor hasn't advanced

      floorRef.current = newFloor

      // Delete buffer entries at or below the new effective floor
      for (const key of bufferRef.current.keys()) {
        if (key <= newFloor) {
          bufferRef.current.delete(key)
          processedRef.current.delete(key)
        }
      }

      deriveEvents()

      // Trigger backfill on first reportFloor call (we now know the indexer head)
      if (!backfillDoneRef.current && watchStartBlockRef.current !== null && sapi && netuid) {
        backfillDoneRef.current = true
        const backfillController = new AbortController()
        backfillAbortRef.current = backfillController
        runBackfill(
          sapi,
          netuid,
          newFloor,
          watchStartBlockRef.current,
          bufferRef,
          processedRef,
          floorRef,
          deriveEvents,
          backfillController.signal
        )
      }
    },
    [sapi, netuid, deriveEvents]
  )

  return { events, bestBlockNumber, reportFloor }
}

// ---------------------------------------------------------------------------
// Backfill: fill the gap between indexer head and first polled block
// ---------------------------------------------------------------------------

/**
 * Fetches events for blocks between `fromBlock + 1` and `toBlock - 1` (inclusive).
 * Runs concurrently in batches to avoid overwhelming the RPC.
 */
async function runBackfill(
  sapi: ScaleApi,
  netuid: number,
  fromBlock: number,
  toBlock: number,
  bufferRef: React.MutableRefObject<Map<number, RealtimeStakeEvent[]>>,
  processedRef: React.MutableRefObject<Map<number, string>>,
  floorRef: React.MutableRefObject<number>,
  deriveEvents: () => void,
  signal: AbortSignal
) {
  const start = fromBlock + 1
  const end = toBlock - 1

  if (start > end) return

  log.debug(`[RealtimeStakeEvents] Backfilling blocks ${start}–${end}`)

  // Process in batches
  const blockNumbers: number[] = []
  for (let b = start; b <= end; b++) {
    if (!processedRef.current.has(b) && b > floorRef.current) {
      blockNumbers.push(b)
    }
  }

  for (let i = 0; i < blockNumbers.length; i += BACKFILL_CONCURRENCY) {
    if (signal.aborted) return

    const batch = blockNumbers.slice(i, i + BACKFILL_CONCURRENCY)
    const results = await Promise.allSettled(
      batch.map((blockNum) => extractStakeEventsFromBlock(sapi, blockNum, netuid, signal))
    )

    for (let j = 0; j < batch.length; j++) {
      const blockNum = batch[j]
      const result = results[j]

      if (result.status === "fulfilled") {
        processedRef.current.set(blockNum, result.value.blockHash)
        // Only add if block is still above the floor (might have been pruned during backfill)
        if (result.value.events.length > 0 && blockNum > floorRef.current) {
          bufferRef.current.set(blockNum, result.value.events)
        }
      }
    }

    deriveEvents()
  }

  log.debug("[RealtimeStakeEvents] Backfill complete")
}

export const [RealtimeStakeEventsProvider, useRealtimeStakeEventsContext] = provideContext(
  useRealtimeStakeEventsProvider
)
