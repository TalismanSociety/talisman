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
