import type { BalancesResult } from "@talismn/balances"
import { filter, firstValueFrom, type Observable, of, takeUntil, timeout } from "rxjs"

import type { AnalyticsLifecycleData } from "../store.lifecycle"
import { summariseTvl, type TvlInputs, type TvlSnapshot } from "./summarise"

export const TVL_INTERVAL_MS = 24 * 60 * 60_000
export const LIVE_TIMEOUT_MS = 120_000

export type TvlDue = { due: false } | { due: true; trigger: TvlSnapshot["trigger"] }

/** A first-ever snapshot is daily: update only ever means a real update. */
export const tvlDue = ({
  lastAt,
  lastVersion,
  version,
  now,
}: {
  lastAt: number | null
  lastVersion: string | null
  version: string
  now: number
}): TvlDue => {
  if (lastVersion !== null && lastVersion !== version) return { due: true, trigger: "update" }
  if (lastAt === null || now - lastAt >= TVL_INTERVAL_MS) return { due: true, trigger: "daily" }
  return { due: false }
}

type TvlScheduleDeps = {
  admits: () => Promise<boolean>
  /** Live balances, else null. Never a subscription that starts balances itself. */
  live$: Observable<BalancesResult | null>
  locked$: Observable<unknown>
  store: {
    get(): Promise<AnalyticsLifecycleData>
    set(value: Partial<AnalyticsLifecycleData>): Promise<unknown>
  }
  gather: (trigger: TvlSnapshot["trigger"], live: BalancesResult) => Promise<TvlInputs>
  send: (snapshot: TvlSnapshot) => void
  version: string
  now: () => number
  liveTimeoutMs?: number
}

/**
 * Checked on each unlock. When no page shows balances, none go live and nothing is sent: the
 * next unlock tries again. One run at a time, and the cadence is recorded before the event is
 * queued, so two unlocks during the wait cannot send twice.
 */
export const createTvlSchedule = ({
  admits,
  live$,
  locked$,
  store,
  gather,
  send,
  version,
  now,
  liveTimeoutMs = LIVE_TIMEOUT_MS,
}: TvlScheduleDeps) => {
  let running = false

  const run = async () => {
    const { lastTvlSnapshotAt, lastTvlSnapshotVersion } = await store.get()
    const due = tvlDue({
      lastAt: lastTvlSnapshotAt,
      lastVersion: lastTvlSnapshotVersion,
      version,
      now: now(),
    })
    if (!due.due || !(await admits())) return

    const live = await firstValueFrom(
      live$.pipe(
        filter((result): result is BalancesResult => result !== null),
        timeout({ first: liveTimeoutMs, with: () => of(null) }),
        takeUntil(locked$)
      ),
      { defaultValue: null }
    )
    if (!live) return

    const inputs = await gather(due.trigger, live)
    await store.set({ lastTvlSnapshotAt: now(), lastTvlSnapshotVersion: version })
    send(summariseTvl(inputs))
  }

  return {
    async onUnlock(): Promise<void> {
      if (running) return
      running = true
      try {
        await run()
      } finally {
        running = false
      }
    },
  }
}
