import type { BalancesResult } from "@talismn/balances"
import { BehaviorSubject, type Observable, Subject } from "rxjs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { AnalyticsLifecycleData } from "../store.lifecycle"
import { createTvlSchedule, LIVE_TIMEOUT_MS, TVL_INTERVAL_MS, tvlDue } from "./schedule"
import type { TvlInputs, TvlSnapshot } from "./summarise"

const T0 = Date.UTC(2026, 9, 2, 12)
const VERSION = "3.10.1"
const HOUR_MS = 60 * 60_000

const LIVE: BalancesResult = { status: "live", balances: [], failedBalanceIds: [] }

describe("tvlDue", () => {
  const due = (lastAt: number | null, lastVersion: string | null) =>
    tvlDue({ lastAt, lastVersion, version: VERSION, now: T0 })

  it("sends the first snapshot ever as daily", () => {
    expect(due(null, null)).toEqual({ due: true, trigger: "daily" })
  })

  it("sends on the first unlock after an update, within the day", () => {
    expect(due(T0 - HOUR_MS, "3.10.0")).toEqual({ due: true, trigger: "update" })
  })

  it("sends again from 24 h after the last snapshot", () => {
    expect(due(T0 - TVL_INTERVAL_MS, VERSION)).toEqual({ due: true, trigger: "daily" })
    expect(due(T0 - TVL_INTERVAL_MS + 1, VERSION)).toEqual({ due: false })
  })

  it("does not send twice within 24 h of the same version", () => {
    expect(due(T0 - HOUR_MS, VERSION)).toEqual({ due: false })
  })
})

describe("createTvlSchedule", () => {
  const setup = ({
    admits = true,
    live$ = new Subject<BalancesResult | null>(),
  }: {
    admits?: boolean
    live$?: Observable<BalancesResult | null>
  } = {}) => {
    const order: ("marker" | "send")[] = []
    const sent: TvlSnapshot[] = []
    const locked$ = new Subject<void>()
    let stored: AnalyticsLifecycleData = {
      installedAt: null,
      lastTvlSnapshotAt: null,
      lastTvlSnapshotVersion: null,
    }

    const schedule = createTvlSchedule({
      admits: async () => admits,
      live$,
      locked$,
      store: {
        get: async () => stored,
        set: async (value) => {
          order.push("marker")
          stored = { ...stored, ...value }
        },
      },
      gather: async (trigger): Promise<TvlInputs> => ({
        trigger,
        accounts: [],
        mnemonics: [],
        enabledNetworkIds: [],
        customNetworkCount: 0,
        nativeCoingeckoIdOf: () => null,
        holdings: [],
        allowedCoingeckoIds: new Set(),
        stablecoinCoingeckoIds: new Set(),
        currency: "usd",
        installedAt: null,
        now: Date.now(),
        quickUnlockEnabled: false,
      }),
      send: (snapshot) => {
        order.push("send")
        sent.push(snapshot)
      },
      version: VERSION,
      now: () => Date.now(),
    })

    return { schedule, order, sent, locked$, stored: () => stored }
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(T0)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("neither waits nor sends nor records when analytics does not admit it", async () => {
    const { schedule, sent, stored } = setup({ admits: false })

    await schedule.onUnlock()

    expect(sent).toEqual([])
    expect(stored().lastTvlSnapshotAt).toBeNull()
  })

  it("sends nothing when no balances go live, and tries again on the next unlock", async () => {
    const live$ = new Subject<BalancesResult | null>()
    const { schedule, sent, stored } = setup({ live$ })

    const first = schedule.onUnlock()
    await vi.advanceTimersByTimeAsync(LIVE_TIMEOUT_MS)
    await first

    expect(sent).toEqual([])
    expect(stored().lastTvlSnapshotAt).toBeNull()

    const second = schedule.onUnlock()
    await vi.advanceTimersByTimeAsync(0)
    live$.next(LIVE)
    await second

    expect(sent).toHaveLength(1)
  })

  it("records the cadence before it sends, once balances go live", async () => {
    const live$ = new Subject<BalancesResult | null>()
    const { schedule, order, sent, stored } = setup({ live$ })

    const run = schedule.onUnlock()
    await vi.advanceTimersByTimeAsync(0)
    live$.next(null)
    live$.next(LIVE)
    await run

    expect(order).toEqual(["marker", "send"])
    expect(sent).toEqual([expect.objectContaining({ trigger: "daily" })])
    expect(stored()).toMatchObject({ lastTvlSnapshotAt: T0, lastTvlSnapshotVersion: VERSION })
  })

  it("sends once for two unlocks during the wait", async () => {
    const live$ = new Subject<BalancesResult | null>()
    const { schedule, sent } = setup({ live$ })

    const first = schedule.onUnlock()
    const second = schedule.onUnlock()
    await vi.advanceTimersByTimeAsync(0)
    live$.next(LIVE)
    await Promise.all([first, second])
    await schedule.onUnlock()

    expect(sent).toHaveLength(1)
  })

  it("gives up when the wallet locks during the wait", async () => {
    const live$ = new Subject<BalancesResult | null>()
    const { schedule, sent, locked$, stored } = setup({ live$ })

    const run = schedule.onUnlock()
    await vi.advanceTimersByTimeAsync(0)
    locked$.next()
    live$.next(LIVE)
    await run

    expect(sent).toEqual([])
    expect(stored().lastTvlSnapshotAt).toBeNull()
  })

  it("sends at once when balances are already live", async () => {
    const { schedule, sent } = setup({ live$: new BehaviorSubject<BalancesResult | null>(LIVE) })

    await schedule.onUnlock()

    expect(sent).toHaveLength(1)
  })
})
