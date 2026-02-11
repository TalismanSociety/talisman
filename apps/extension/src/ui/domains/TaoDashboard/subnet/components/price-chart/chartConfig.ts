// ────────────────────────────────────────────────────────────────────────────
// Chart configuration — Single source of truth for colors and layout
// ────────────────────────────────────────────────────────────────────────────

/**
 * Indicator configuration with color and chart settings.
 * Keys match IndicatorConfig from types.ts.
 */
export const INDICATOR_CONFIG = {
  sma7: {
    label: "SMA 7",
    color: "#f59e0b", // orange (tailwind orange-500, same as "crab" in holders chart)
    period: 7,
  },
  sma25: {
    label: "SMA 25",
    color: "#fd8fff", // pink (brand-pink)
    period: 25,
  },
  sma99: {
    label: "SMA 99",
    color: "#8b5cf6", // violet (tailwind violet-500)
    period: 99,
  },
  bollingerBands: {
    label: "BB",
    color: "#3b82f6", // blue (tailwind blue-500, same as "fish" in holders chart)
    /** Lighter text when active for better contrast */
    activeTextColor: "#60a5fa", // blue-400
    period: 20,
    stdDev: 2,
  },
  rsi: {
    label: "RSI",
    color: "#22d3ee", // cyan (tailwind cyan-400, same as "whale" in holders chart)
    period: 14,
  },
} as const

export type IndicatorKey = keyof typeof INDICATOR_CONFIG

/**
 * Chart color palette.
 */
export const CHART_COLORS = {
  // Background & grid
  background: "#181818",
  text: "#71717a",
  textSecondary: "#a1a1aa",
  gridLine: "#27272a",
  crosshair: "#525252",

  // Candles
  bullish: "#22c55e",
  bearish: "#ef4444",

  // Current price line
  currentPrice: "#f43f5e",

  // RSI specific (grey band between 30-70 threshold lines)
  rsiBandTop: "rgba(113, 113, 113, 0.1)", // grey-500 at 10% opacity
  rsiBandBottom: "rgba(113, 113, 113, 0.1)",
  rsiThreshold: "#71717a", // grey-500 for 30/70 lines

  // Bollinger bands (based on BB color: blue #3b82f6)
  bollingerBandFaded: "#3b82f680",
  bollingerBandFill: "rgba(59, 130, 246, 0.1)", // 10% opacity fill
} as const

/**
 * Chart layout constants.
 */
export const CHART_LAYOUT = {
  /** Volume section height as ratio of total chart */
  VOLUME_RATIO: 0.1,
  /** RSI section height as ratio of total chart */
  RSI_RATIO: 0.2,
  /** Gap between sections */
  SECTION_GAP: 0.02,
  /** Number of candles visible on initial load */
  INITIAL_VISIBLE_CANDLES: 50,
} as const
