// ---------------------------------------------------------------------------
// OHLCV types — TradingView / lightweight-charts compatible
// ---------------------------------------------------------------------------

export type OhlcvResolution = "15" | "60" | "240" | "1440"

/**
 * A single OHLCV candle bar.
 *
 * This is the canonical wire-format for the future price-chart API and maps
 * directly to lightweight-charts' `CandlestickData`:
 *
 * ```ts
 * // lightweight-charts consumption:
 * candlestickSeries.setData(bars)          // OHLC fields
 * volumeSeries.setData(bars.map(toVolume)) // { time, value }
 * ```
 *
 * Presentation concerns (candle colours, volume bar colours) are intentionally
 * excluded — they belong in the chart component.
 */
export interface OhlcvBar {
  /** UTC timestamp in seconds — start of the candle period (matches `UTCTimestamp`) */
  time: number
  /** Opening price */
  open: number
  /** Highest price during the period */
  high: number
  /** Lowest price during the period */
  low: number
  /** Closing price */
  close: number
  /** Total trading volume (TAO) during the period */
  volume: number
}

/**
 * Shape of the paginated API response the future endpoint will return.
 *
 * ```
 * GET /api/v1/subnets/{netuid}/ohlcv?resolution=60&cursor=…&countBack=100
 * ```
 *
 * The wallet consumes this via `useOhlcvData` which hides pagination details
 * and exposes a simple `{ bars, loadMore, hasMore }` interface.
 */
export interface OhlcvResponse {
  /** Candle bars sorted ascending by time */
  bars: OhlcvBar[]
  /** Opaque cursor for fetching the next (older) page, `null` when exhausted */
  nextCursor: string | null
  /** Resolution of the returned bars */
  resolution: OhlcvResolution
  /** Metadata about the data source */
  meta: {
    /** Human-readable symbol, e.g. "TAO-SUBNET-1" */
    symbol: string
    /** Earliest available data timestamp in seconds, `null` if unknown */
    firstAvailableTime: number | null
  }
}

// ---------------------------------------------------------------------------
// Internal / legacy types
// ---------------------------------------------------------------------------

export interface ProcessedHourlyData {
  hour: Date
  open: number
  high: number
  low: number
  close: number
  taoIn: number
  taoOut: number
  volume: number
}

export interface IndicatorConfig {
  sma7: boolean
  sma25: boolean
  sma99: boolean
  // ema12: boolean
  // ema26: boolean
  bollingerBands: boolean
  rsi: boolean
}

export interface PriceData {
  movingPrice: string
  timestamp: string
}

export interface StakeEvent {
  method: "Adding" | "Removing"
  alphaAmount: string
  taoAmount: string
  timestamp: string
}

export const DEFAULT_INDICATORS: IndicatorConfig = {
  sma7: false,
  sma25: false,
  sma99: false,
  bollingerBands: false,
  rsi: false,
}

// Format numbers with K, M, B suffixes
export const formatCompactNumber = (num: number): string => {
  if (num >= 1000000000) return `$${(num / 1000000000).toFixed(2)}B`
  if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`
  if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`
  return `$${num.toFixed(0)}`
}

// Process stake events into hourly OHLC data
export function processStakeEventsToOHLC(
  stakeEvents: StakeEvent[],
  _priceData: PriceData[]
): ProcessedHourlyData[] {
  if (stakeEvents.length === 0) return []

  // Process stake events with cumulative sum
  const processedStakes = stakeEvents.map((e) => ({
    ...e,
    timestamp: new Date(e.timestamp),
    alpha: parseFloat(e.alphaAmount) / 1e9,
    tao: parseFloat(e.taoAmount) / 1e9,
  }))

  processedStakes.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  let cumsum = 0
  const withCumsum = processedStakes.map((s) => {
    const alphaSigned = s.method === "Adding" ? s.alpha : -s.alpha
    cumsum += alphaSigned
    return {
      ...s,
      alphaSigned,
      cumsum,
      hour: new Date(Math.floor(s.timestamp.getTime() / 3600000) * 3600000),
      taoIn: s.method === "Adding" ? s.tao : 0,
      taoOut: s.method === "Removing" ? s.tao : 0,
    }
  })

  // Group by hour
  const hourlyMap = new Map<
    string,
    { hour: Date; cumsums: number[]; taoIn: number; taoOut: number }
  >()

  for (const stake of withCumsum) {
    const hourKey = stake.hour.toISOString()
    if (!hourlyMap.has(hourKey)) {
      hourlyMap.set(hourKey, { hour: stake.hour, cumsums: [], taoIn: 0, taoOut: 0 })
    }
    const entry = hourlyMap.get(hourKey)!
    entry.cumsums.push(stake.cumsum)
    entry.taoIn += stake.taoIn
    entry.taoOut += stake.taoOut
  }

  // Build hourly data
  const hourlyEntries = Array.from(hourlyMap.entries()).sort(
    ([a], [b]) => new Date(a).getTime() - new Date(b).getTime()
  )

  return hourlyEntries.map(([, data]) => ({
    hour: data.hour,
    open: data.cumsums[0],
    high: Math.max(...data.cumsums),
    low: Math.min(...data.cumsums),
    close: data.cumsums[data.cumsums.length - 1],
    taoIn: data.taoIn,
    taoOut: data.taoOut,
    volume: data.taoIn + data.taoOut,
  }))
}
