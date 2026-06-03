import type { EarnSystemStatus } from "./types"

// normalize any source's status string (react-rxjs Loadable, custom, …) into an EarnSystemStatus
export const asEarnSystemStatus = (status: string): EarnSystemStatus =>
  status === "loading" ? "loading" : status === "error" ? "error" : "success"

// combine per-system statuses: loading wins (still settling), then error, else success. Systems that
// are best-effort simply never report "error", so they can't flip the combined status.
export const combineEarnStatuses = (statuses: EarnSystemStatus[]): EarnSystemStatus =>
  statuses.some((s) => s === "loading")
    ? "loading"
    : statuses.some((s) => s === "error")
      ? "error"
      : "success"
