import { useMemo } from "react"
import type { LeaderboardPeriod, TimePeriod } from "./types"

const RAO_PER_TAO = 1_000_000_000n

/**
 * Convert a rao-encoded string (or bigint) to a TAO number for display.
 *
 * Uses BigInt arithmetic for the integer part so precision is preserved
 * for amounts > Number.MAX_SAFE_INTEGER rao (~9 007 199 TAO).
 */
export const raoToTao = (value: string | bigint | null | undefined): number => {
  if (value === null || value === undefined) return 0
  try {
    const bi = typeof value === "bigint" ? value : BigInt(value)
    const sign = bi < 0n ? -1 : 1
    const abs = bi < 0n ? -bi : bi
    const integerPart = abs / RAO_PER_TAO
    const remainder = abs % RAO_PER_TAO
    return sign * (Number(integerPart) + Number(remainder) / 1e9)
  } catch {
    // If BigInt parsing fails, fall back to Number parsing
    const n = Number(value)
    return Number.isFinite(n) ? n / 1e9 : 0
  }
}

export const getDaysPerPeriod = (period: TimePeriod): number => {
  switch (period) {
    case "1D":
      return 1
    case "1W":
      return 7
    case "1M":
      return 30
  }
}

export const getLeaderboardPeriod = (period: TimePeriod): LeaderboardPeriod => {
  switch (period) {
    case "1D":
      return "1d"
    case "1W":
      return "1w"
    case "1M":
      return "1m"
  }
}

export const useLeaderboardPeriod = (period: TimePeriod): LeaderboardPeriod => {
  return useMemo(() => getLeaderboardPeriod(period), [period])
}

/** converts a [-2,2] score to a [0,100] score */
export const convertScore2To100 = (score2: number | null | undefined): number => {
  if (score2 === null || score2 === undefined) return 50
  return Math.round(((score2 + 2) / 4) * 100)
}

export const useScore2To100 = (score2: number | null | undefined): number => {
  return useMemo(() => convertScore2To100(score2), [score2])
}

/** converts a [-1,1] score to a [0,100] score */
export const convertScore1To100 = (score1: number | null | undefined): number => {
  if (score1 === null || score1 === undefined) return 50
  return Math.round(((score1 + 1) / 2) * 100)
}

export const useScore1To100 = (score1: number | null | undefined): number => {
  return useMemo(() => convertScore1To100(score1), [score1])
}

export const useColorFromScore100 = (score: number | null | undefined): string | null => {
  if (score === null || score === undefined) return null
  if (score > 50) return "text-buy"
  if (score < 50) return "text-sell"
  return null
}
