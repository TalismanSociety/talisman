import type { Loadable } from "@talismn/util"

import type { EarnSystemStatus } from "./types"

// normalize any source's status string (react-rxjs Loadable, custom, …) into an EarnSystemStatus
export const asEarnSystemStatus = (status: string): EarnSystemStatus =>
  status === "loading" ? "loading" : status === "error" ? "error" : "success"

// build a well-formed Loadable from a combined status: the "error" variant requires an error
// object, but combined system statuses don't carry one, so a generic error is attached
export const toEarnLoadable = <T>(status: EarnSystemStatus, data: T): Loadable<T> =>
  status === "error"
    ? { status, data, error: { name: "EarnSystemError", message: "Failed to load earn data" } }
    : { status, data }

// combine per-system statuses: loading wins (still settling), then error, else success. Systems that
// are best-effort simply never report "error", so they can't flip the combined status.
export const combineEarnStatuses = (statuses: EarnSystemStatus[]): EarnSystemStatus =>
  statuses.some((s) => s === "loading")
    ? "loading"
    : statuses.some((s) => s === "error")
      ? "error"
      : "success"
