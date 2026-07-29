import { type InfiniteData, useInfiniteQuery, useQueryClient } from "@tanstack/react-query"
import { sn45Api } from "@ui/domains/TaoDashboard/hooks/useSn45Api"
import { useCallback, useEffect, useMemo, useRef } from "react"
import { useTaoDashboardNetwork } from "../../../shared/TaoDashboardNetworkProvider"

import type { RealtimeStakeEvent } from "../realtime/types"
import type { OhlcvBar, OhlcvResolution } from "./types"

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface UseOhlcvDataOptions {
  netuid: number
  /**
   * Candle resolution (TradingView UDF convention).
   * Only "60" (hourly) is supported by the MVP API.
   * @default "60"
   */
  resolution?: OhlcvResolution
  /**
   * How many candles to fetch per page.
   * @default 500
   */
  pageSize?: number
  /**
   * Real-time stake events from the block watcher.
   * These are consolidated on top of indexed candles to fill
   * the gap between the indexer head and the chain tip.
   */
  realtimeEvents?: RealtimeStakeEvent[]
  /**
   * Called whenever the indexer's `lastBlockHeight` changes (from the latest
   * non-cursor API response). The consumer should report this to the
   * real-time event buffer so it can prune covered blocks.
   */
  onIndexerBlockHeight?: (consumerId: string, blockHeight: number) => void
}

export interface OhlcvMeta {
  /** e.g. "TAO-SUBNET-18" */
  symbol: string
  /** Earliest available bar timestamp (seconds), null when no data */
  firstAvailableTime: number | null
  /** Resolution that was used to produce the bars */
  resolution: OhlcvResolution
}

export interface UseOhlcvDataReturn {
  /** OHLCV bars sorted ascending by `time` (UTCTimestamp in seconds). */
  bars: OhlcvBar[]
  /** `true` while the initial page is loading */
  isLoading: boolean
  /** `true` while an older page is being fetched */
  isLoadingMore: boolean
  /** `true` when older candles are available from the API */
  hasMore: boolean
  /** Fetch the next (older) page of candles */
  loadMore: () => void
  /** Dataset metadata */
  meta: OhlcvMeta
  /** The error returned by the initial fetch, if any */
  error: Error | null
  /** `true` when the initial fetch has errored */
  isError: boolean
}

/**
 * Determines whether a failed SN45 API request should be retried.
 * Skips retry for 4xx client errors (except 429 Too Many Requests).
 */
const shouldRetrySn45Error = (failureCount: number, error: unknown): boolean => {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? (error as { status?: unknown }).status
      : undefined

  // Don't retry 4xx client errors (bad request, not found, etc.), except 429
  if (typeof status === "number" && status >= 400 && status < 500 && status !== 429) {
    return false
  }

  return failureCount < 2
}

// ---------------------------------------------------------------------------
// Hook implementation
// ---------------------------------------------------------------------------

/**
 * Fetches OHLCV candle data from the SN45 API with cursor-based backward
 * pagination.  The chart calls `loadMore()` when the user scrolls left.
 *
 * Bars are returned sorted ascending by time so they can be passed directly
 * to `lightweight-charts` `CandlestickSeries.setData()`.
 */
type OhlcvPage = Awaited<ReturnType<typeof sn45Api.v1.getSubnetOhlcv>>["data"]

export function useOhlcvData({
  netuid,
  resolution = "60",
  pageSize = 100,
  realtimeEvents,
  onIndexerBlockHeight,
}: UseOhlcvDataOptions): UseOhlcvDataReturn {
  const queryClient = useQueryClient()
  const { isMainnet } = useTaoDashboardNetwork()
  const queryKey = useMemo(
    () => ["sn45", "subnetOhlcv", isMainnet, netuid, resolution, pageSize] as const,
    [isMainnet, netuid, resolution, pageSize]
  )

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error, isError } =
    useInfiniteQuery({
      queryKey,
      queryFn: async ({
        pageParam,
        signal,
      }: {
        pageParam: string | undefined
        signal: AbortSignal
      }) => {
        const response = await sn45Api.v1.getSubnetOhlcv(
          String(netuid),
          {
            resolution,
            limit: String(pageSize),
            cursor: pageParam,
          },
          { signal }
        )
        return response.data
      },
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      enabled: isMainnet && !!netuid,
      staleTime: 30_000,
      retry: shouldRetrySn45Error,
      refetchOnReconnect: true,
    })

  // Poll only the first page (latest candles, no cursor) every 15s.
  // Historical cursor-based pages are immutable and never re-fetched.
  const abortRef = useRef<AbortController | null>(null)
  useEffect(() => {
    if (!isMainnet || !netuid) return

    const interval = setInterval(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      try {
        const response = await sn45Api.v1.getSubnetOhlcv(
          String(netuid),
          { resolution, limit: String(pageSize) },
          { signal: controller.signal }
        )
        queryClient.setQueryData<InfiniteData<OhlcvPage>>(queryKey, (old) => {
          if (!old?.pages?.length) return old
          return {
            ...old,
            pages: [response.data, ...old.pages.slice(1)],
            pageParams: [undefined, ...old.pageParams.slice(1)],
          }
        })
      } catch {
        // silent — non-critical background refresh
      }
    }, 15_000)

    return () => {
      clearInterval(interval)
      abortRef.current?.abort()
    }
  }, [isMainnet, netuid, resolution, pageSize, queryClient, queryKey])

  // Flatten all pages into a single sorted array of OhlcvBar
  const indexedBars = useMemo<OhlcvBar[]>(() => {
    if (!data?.pages) return []

    const allBars: OhlcvBar[] = []

    // Pages are ordered newest-first (page 0 = most recent, page N = oldest).
    // Each page's `candles` array is also most-recent-first per the API spec.
    for (const page of data.pages) {
      for (const candle of page.candles) {
        // candle = [time, open, high, low, close, volume]
        allBars.push({
          time: candle[0] as number,
          open: candle[1] as number,
          high: candle[2] as number,
          low: candle[3] as number,
          close: candle[4] as number,
          volume: candle[5] as number,
        })
      }
    }

    // Deduplicate by time (in case of overlapping pages) and sort ascending
    const seen = new Set<number>()
    const unique = allBars.filter((b) => {
      if (seen.has(b.time)) return false
      seen.add(b.time)
      return true
    })

    unique.sort((a, b) => a.time - b.time)
    return unique
  }, [data])

  // Extract lastBlockHeight from the first (latest) page and notify consumer
  const lastBlockHeight = data?.pages?.[0]?.lastBlockHeight ?? null
  const onIndexerBlockHeightRef = useRef(onIndexerBlockHeight)
  onIndexerBlockHeightRef.current = onIndexerBlockHeight

  useEffect(() => {
    if (lastBlockHeight && onIndexerBlockHeightRef.current) {
      onIndexerBlockHeightRef.current("ohlcv", lastBlockHeight)
    }
  }, [lastBlockHeight])

  // Consolidate real-time events on top of indexed candles
  const bars = useMemo<OhlcvBar[]>(() => {
    if (!realtimeEvents?.length) return indexedBars

    return consolidateRealtimeBars(indexedBars, realtimeEvents, resolution)
  }, [indexedBars, realtimeEvents, resolution])

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const meta = useMemo<OhlcvMeta>(
    () => ({
      symbol: `TAO-SUBNET-${netuid}`,
      firstAvailableTime: bars.length > 0 ? bars[0].time : null,
      resolution,
    }),
    [netuid, bars, resolution]
  )

  return {
    bars,
    isLoading,
    isLoadingMore: isFetchingNextPage,
    hasMore: hasNextPage ?? false,
    loadMore,
    meta,
    error: error as Error | null,
    isError,
  }
}

// ---------------------------------------------------------------------------
// Candle consolidation: merge real-time events on top of indexed candles
// ---------------------------------------------------------------------------

const RAO = 1e9

/** Resolution string → bucket size in seconds */
const resolutionSeconds = (res: OhlcvResolution): number => Number(res) * 60

/**
 * Compute the bucket start time (UTC seconds) for a given timestamp and resolution.
 * Matches the sn45-data-api bucketing: `floor(ts / bucketSize) * bucketSize`
 */
const bucketTime = (timestampMs: number, bucketSec: number): number =>
  Math.floor(timestampMs / 1000 / bucketSec) * bucketSec

/**
 * Consolidate real-time events on top of indexed candles.
 *
 * - For the last indexed candle's time bucket: extend it (update close, adjust high/low, add volume)
 * - For subsequent buckets: create new candles with open carried forward from previous close
 * - Gap-fill empty buckets between the last indexed candle and the first real-time bucket
 *
 * This is a pure function suitable for unit testing.
 */
function consolidateRealtimeBars(
  indexedBars: OhlcvBar[],
  realtimeEvents: RealtimeStakeEvent[],
  resolution: OhlcvResolution
): OhlcvBar[] {
  if (!realtimeEvents.length) return indexedBars

  const bucketSec = resolutionSeconds(resolution)

  // Compute price and volume per event, group by bucket
  const bucketMap = new Map<number, { prices: number[]; volumes: number[] }>()

  for (const evt of realtimeEvents) {
    const price = Number(evt.taoAmount) / RAO / (Number(evt.alphaAmount) / RAO)
    if (!Number.isFinite(price) || price === 0) continue

    const volume = Number(evt.taoAmount) / RAO
    const bucket = bucketTime(evt.timestamp, bucketSec)

    let entry = bucketMap.get(bucket)
    if (!entry) {
      entry = { prices: [], volumes: [] }
      bucketMap.set(bucket, entry)
    }
    entry.prices.push(price)
    entry.volumes.push(volume)
  }

  if (bucketMap.size === 0) return indexedBars

  // Start from a copy of indexed bars
  const result = indexedBars.map((b) => ({ ...b }))

  // Determine the carry-forward close price
  const lastIndexed = result.length > 0 ? result[result.length - 1] : null
  let prevClose = lastIndexed?.close ?? 0

  // Get sorted bucket times
  const sortedBuckets = [...bucketMap.keys()].sort((a, b) => a - b)

  // Determine the boundary: only include real-time data for buckets at or after the last indexed candle's bucket
  const lastIndexedBucket = lastIndexed ? lastIndexed.time : 0

  for (const bucket of sortedBuckets) {
    if (bucket < lastIndexedBucket) continue // skip: already covered by indexed data

    const { prices, volumes } = bucketMap.get(bucket)!
    const open = prices[0]
    const close = prices[prices.length - 1]
    const high = Math.max(...prices)
    const low = Math.min(...prices)
    const volume = volumes.reduce((a, b) => a + b, 0)

    if (bucket === lastIndexedBucket && lastIndexed) {
      // Consolidate into the existing last candle: extend it with real-time data
      lastIndexed.close = close
      lastIndexed.high = Math.max(lastIndexed.high, high)
      lastIndexed.low = Math.min(lastIndexed.low, low)
      lastIndexed.volume += volume
      prevClose = lastIndexed.close
    } else {
      // Gap-fill: create empty carry-forward candles for any skipped buckets
      // When there are no indexed or prior result bars, start from this bucket (no gap-fill needed)
      const lastResultTime = result.length > 0 ? result[result.length - 1].time : bucket
      const expectedNextBucket = lastResultTime + bucketSec
      for (let gap = expectedNextBucket; gap < bucket; gap += bucketSec) {
        result.push({
          time: gap,
          open: prevClose,
          high: prevClose,
          low: prevClose,
          close: prevClose,
          volume: 0,
        })
      }

      // Adjust open to carry forward from previous close (chart continuity)
      const adjustedOpen = prevClose || open
      result.push({
        time: bucket,
        open: adjustedOpen,
        high: Math.max(adjustedOpen, high),
        low: Math.min(adjustedOpen, low),
        close,
        volume,
      })
      prevClose = close
    }
  }

  return result
}
