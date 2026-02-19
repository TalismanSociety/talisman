import { useInfiniteQuery } from "@tanstack/react-query"
import { sn45Api } from "@ui/domains/TaoDashboard/hooks/useSn45Api"
import { useCallback, useMemo } from "react"
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
export function useOhlcvData({
  netuid,
  resolution = "60",
  pageSize = 100,
}: UseOhlcvDataOptions): UseOhlcvDataReturn {
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error, isError } =
    useInfiniteQuery({
      queryKey: ["sn45", "subnetOhlcv", netuid, resolution, pageSize],
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
      enabled: !!netuid,
      refetchInterval: 60_000,
      staleTime: 30_000,
      retry: shouldRetrySn45Error,
      refetchOnReconnect: true,
    })

  // Flatten all pages into a single sorted array of OhlcvBar
  const bars = useMemo<OhlcvBar[]>(() => {
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
