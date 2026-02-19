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
