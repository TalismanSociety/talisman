import { useMemo } from "react"
import type { LeaderboardPeriod, TimePeriod } from "./types"

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

export const useDaysPerPeriod = (period: TimePeriod): number => {
  return useMemo(() => getDaysPerPeriod(period), [period])
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
export const convertScore2To100 = (score2: number | null | undefined): number | null => {
  if (score2 === null || score2 === undefined) return 50
  return Math.round(((score2 + 2) / 4) * 100)
}

export const useScore2To100 = (score2: number | null | undefined): number | null => {
  return useMemo(() => convertScore2To100(score2), [score2])
}

/** converts a [-1,1] score to a [0,100] score */
export const convertScore1To100 = (score1: number | null | undefined): number | null => {
  if (score1 === null || score1 === undefined) return 50
  return Math.round(((score1 + 1) / 2) * 100)
}

export const useScore1To100 = (score1: number | null | undefined): number | null => {
  return useMemo(() => convertScore1To100(score1), [score1])
}

export const useColorFromScore100 = (score: number | null | undefined): string | null => {
  if (score === null || score === undefined) return null
  if (score > 50) return "text-buy"
  if (score < 50) return "text-sell"
  return null
}
