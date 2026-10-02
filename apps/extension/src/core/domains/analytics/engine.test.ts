import type { ConsentKind } from "@common/analytics/schema"
import { BehaviorSubject } from "rxjs"
import { describe, expect, it } from "vitest"

import { AnalyticsEngine } from "./engine"
import type { Environment } from "./environment"
import { type ParsedEvent, parseTrackedEvent } from "./parse"
import { MIN_ALARM_DELAY_MS } from "./scheduler"
import { type AnalyticsStore, createMemoryAnalyticsStore } from "./store.queue"
import type { Transmission } from "./transmission"
import type { SendOutcome, Transport } from "./transport"
import type { Consent, WireEvent } from "./types"

const MINUTE = 60_000
const T0 = Date.UTC(2026, 9, 2, 12)
const OFFSET = 10 * MINUTE

const ENVIRONMENT: Environment = {
  appVersion: "3.10.1",
  appBuild: "54e646a97",
  appVariant: "development",
  browser: "chrome",
  os: "mac",
  browser_language: "en",
  $lib: "talisman-extension",
  $lib_version: "3.10.1",
  $app_version: "3.10.1",
  $os: "Mac OS X",
  $browser: "Chrome",
}

const POSTHOG: Transmission = {
  mode: "posthog",
  endpoint: "https://z.talisman.xyz/batch/",
  apiKey: "phc_test",
}

const consent = (usage: Consent["usage"], error: Consent["error"] = "granted"): Consent => ({
  usage,
  error,
})

const uuidTime = (uuid: string) => Number.parseInt(uuid.replaceAll("-", "").slice(0, 12), 16)

const parsed = (source: "onboarding" | "settings" = "settings") => {
  const result = parseTrackedEvent({ event: "analytics_opt_in", properties: { source } })
  if (!result.ok) throw new Error("fixture does not parse")
  return result.event
}

const errorEvent = () => ({ ...parsed(), kind: "error" }) as ParsedEvent

type World = {
  now: number
  store: AnalyticsStore
  alarmAt: number | undefined
  sent: WireEvent[][]
  outcome: SendOutcome
  hang: boolean
  transport: Transport
}

const createWorld = (): World => {
  const world: World = {
    now: T0,
    store: createMemoryAnalyticsStore(),
    alarmAt: undefined,
    sent: [],
    outcome: "sent",
    hang: false,
    transport: async (batch) => {
      world.sent.push([...batch])
      await new Promise((resolve) => setTimeout(resolve, 0))
      if (world.hang) await new Promise(() => {})
      return world.outcome
    },
  }
  return world
}

const startWorker = (
  world: World,
  {
    consent: initialConsent,
    transmission = POSTHOG,
  }: { consent: Consent; transmission?: Transmission }
) => {
  const consent$ = new BehaviorSubject(initialConsent)
  let onAlarm = () => {}
  const engine = new AnalyticsEngine({
    clock: () => world.now,
    drawOffset: () => OFFSET,
    store: world.store,
    scheduler: {
      schedule: async (when) => {
        world.alarmAt = when
      },
      clear: async () => {
        world.alarmAt = undefined
      },
      scheduledAt: async () => world.alarmAt,
      onFire: (listener) => {
        onAlarm = listener
      },
    },
    environment: async () => ENVIRONMENT,
    consent$,
    transmission,
    transportFor: (t) => (t.mode === "posthog" || t.mode === "dev_log" ? world.transport : null),
    devLog: null,
  })
  engine.start()

  return {
    engine,
    capture: (event: ParsedEvent = parsed(), realNow = world.now) =>
      engine.capture({ result: { ok: true, event }, uiContext: "dashboard", realNow }),
    setConsent: async (next: Consent) => {
      consent$.next(next)
      return engine.inspect()
    },
    fireAlarm: async () => {
      if (world.alarmAt !== undefined) world.now = Math.max(world.now, world.alarmAt)
      world.alarmAt = undefined
      onAlarm()
      await Promise.all((["usage", "error"] as ConsentKind[]).map((kind) => engine.flush(kind)))
    },
    queued: async () => (await engine.inspect()).queued,
  }
}

const sentEvents = (world: World) => world.sent.flat()
const rows = (store: AnalyticsStore, kind: ConsentKind = "usage") =>
  store.due(Number.POSITIVE_INFINITY, { kind, limit: 1000 })

describe("AnalyticsEngine", () => {
  describe("consent", () => {
    it("holds usage events while pending: nothing reaches the store", async () => {
      const world = createWorld()
      const worker = startWorker(world, { consent: consent("pending") })

      expect(await worker.capture()).toBe("held")
      expect((await worker.engine.inspect()).held).toBe(1)
      expect(await rows(world.store)).toEqual([])
    })

    it("pending → granted: queues the held events with their timestamps, then analytics_opt_in from onboarding", async () => {
      const world = createWorld()
      const worker = startWorker(world, { consent: consent("pending") })
      await worker.capture()
      world.now += MINUTE
      await worker.capture()
      world.now += MINUTE

      await worker.setConsent(consent("granted"))

      const queued = await rows(world.store)
      expect(queued.map((row) => [row.wire.event, row.wire.properties.source, row.sendAt])).toEqual(
        [
          ["analytics_opt_in", "settings", T0 + OFFSET],
          ["analytics_opt_in", "settings", T0 + MINUTE + OFFSET],
          ["analytics_opt_in", "onboarding", T0 + 2 * MINUTE + OFFSET],
        ]
      )
      expect(new Set(queued.map((row) => row.wire.properties.$session_id)).size).toBe(1)
    })

    it("pending → denied: drops the held events", async () => {
      const world = createWorld()
      const worker = startWorker(world, { consent: consent("pending") })
      await worker.capture()

      const snapshot = await worker.setConsent(consent("denied"))

      expect(snapshot.held).toBe(0)
      expect(await rows(world.store)).toEqual([])
      world.now += 20 * MINUTE
      await worker.fireAlarm()
      expect(sentEvents(world)).toEqual([])
    })

    it("granted → denied: purges every row and sends nothing, not even the rows already due", async () => {
      const world = createWorld()
      const worker = startWorker(world, { consent: consent("granted") })
      const due = await worker.capture()
      world.now += OFFSET + MINUTE
      await worker.capture()

      const snapshot = await worker.setConsent(consent("denied"))

      expect(due).toBe("queued")
      expect(snapshot.queued.usage).toBe(0)
      expect(snapshot.session).toBeNull()
      expect(await worker.capture()).toBe("dropped_consent")
      world.now += 30 * MINUTE
      await worker.fireAlarm()
      expect(sentEvents(world)).toEqual([])
    })

    it("a flush that started before the opt-out sends no batch after it", async () => {
      const world = createWorld()
      const worker = startWorker(world, { consent: consent("granted") })
      await worker.capture()
      world.now += OFFSET + MINUTE

      const flushed = worker.engine.flush("usage")
      await worker.setConsent(consent("denied"))
      await flushed

      expect(sentEvents(world)).toEqual([])
    })

    it("ending the session gives the next event another id", async () => {
      const world = createWorld()
      const worker = startWorker(world, { consent: consent("granted") })
      await worker.capture()

      await worker.engine.endSession()
      await worker.capture()

      const [before, after] = (await rows(world.store)).map((row) => row.wire)
      expect(after.distinct_id).not.toBe(before.distinct_id)
      expect(after.properties.$session_id).toBe(after.distinct_id)
    })

    it("denied → granted from settings queues analytics_opt_in from settings", async () => {
      const world = createWorld()
      const worker = startWorker(world, { consent: consent("denied") })
      await worker.engine.inspect()

      await worker.setConsent(consent("granted"))

      expect((await rows(world.store)).map((row) => row.wire.properties.source)).toEqual([
        "settings",
      ])
    })

    it("applies a change made while the worker was stopped on the next start, once", async () => {
      const world = createWorld()
      const first = startWorker(world, { consent: consent("pending") })
      await first.capture()

      const second = startWorker(world, { consent: consent("granted") })
      await second.engine.inspect()
      const third = startWorker(world, { consent: consent("granted") })
      await third.engine.inspect()

      expect((await rows(world.store)).map((row) => row.wire.properties.source)).toEqual([
        "onboarding",
      ])
    })

    it("gates error events on useErrorTracking, whatever the usage consent", async () => {
      const world = createWorld()
      const worker = startWorker(world, { consent: consent("denied", "granted") })

      expect(await worker.capture(errorEvent())).toBe("queued")
      await worker.engine.flush("error")
      expect(sentEvents(world).map((event) => event.distinct_id)).toEqual([
        sentEvents(world)[0].uuid,
      ])

      world.outcome = "retry"
      await worker.capture(errorEvent())
      await worker.engine.flush("error")
      expect((await worker.queued()).error).toBe(1)
      const snapshot = await worker.setConsent(consent("denied", "denied"))
      expect(snapshot.queued.error).toBe(0)
      expect(await worker.capture(errorEvent())).toBe("dropped_consent")
    })
  })

  describe("time", () => {
    it("never posts a row before its sendAt, whatever fires the alarm", async () => {
      const world = createWorld()
      const worker = startWorker(world, { consent: consent("granted") })
      await worker.capture()

      world.now = T0 + OFFSET - 1
      await worker.engine.flush("usage")
      expect(sentEvents(world)).toEqual([])

      await worker.fireAlarm()
      expect(sentEvents(world)).toHaveLength(1)
      expect(world.now).toBeGreaterThanOrEqual(Date.parse(sentEvents(world)[0].timestamp))
    })

    it("shifts every event of a session by the same offset and keeps the capture order", async () => {
      const world = createWorld()
      const worker = startWorker(world, { consent: consent("granted") })
      const times = [T0, T0 + 1, T0 + 5 * MINUTE]
      for (const realNow of times) await worker.capture(parsed(), realNow)

      const queued = await rows(world.store)
      expect(queued.map((row) => Date.parse(row.wire.timestamp))).toEqual(
        times.map((realNow) => realNow + OFFSET)
      )
    })

    it("mints the $session_id and each event uuid from the shifted time, never the real clock", async () => {
      const world = createWorld()
      const worker = startWorker(world, { consent: consent("granted") })
      await worker.capture()
      await worker.capture(parsed(), T0 + MINUTE)

      const [first, second] = await rows(world.store)
      expect(uuidTime(first.wire.properties.$session_id as string)).toBe(T0 + OFFSET)
      expect(uuidTime(first.uuid)).toBe(Date.parse(first.wire.timestamp))
      expect(uuidTime(second.uuid)).toBe(Date.parse(second.wire.timestamp))
      expect(uuidTime(second.uuid)).not.toBe(T0 + MINUTE)
    })

    it("sets the alarm at the earliest shifted time", async () => {
      const world = createWorld()
      const worker = startWorker(world, { consent: consent("granted") })
      await worker.capture()

      expect(world.alarmAt).toBe(T0 + OFFSET)
    })

    it("start() never flushes, even when rows are due", async () => {
      const world = createWorld()
      await startWorker(world, { consent: consent("granted") }).capture()
      world.now += OFFSET + MINUTE
      world.alarmAt = undefined

      const worker = startWorker(world, { consent: consent("granted") })
      await worker.engine.inspect()

      expect(sentEvents(world)).toEqual([])
      expect(world.alarmAt).toBe(world.now + MIN_ALARM_DELAY_MS + OFFSET)
    })
  })

  describe("durability", () => {
    it("resends the same uuids after a worker dies between the POST and the delete", async () => {
      const world = createWorld()
      const first = startWorker(world, { consent: consent("granted") })
      await first.capture()
      world.now += OFFSET
      world.hang = true
      void first.engine.flush("usage")
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(world.sent).toHaveLength(1)

      world.hang = false
      const second = startWorker(world, { consent: consent("granted") })
      await second.fireAlarm()

      const [lost, resent] = world.sent
      expect(resent.map((event) => event.uuid)).toEqual(lost.map((event) => event.uuid))
      expect(await rows(world.store)).toEqual([])
    })

    it("keeps the rows and backs off on retry; deletes them on drop", async () => {
      const world = createWorld()
      const worker = startWorker(world, { consent: consent("granted") })
      await worker.capture()
      world.now += OFFSET
      world.outcome = "retry"

      await worker.fireAlarm()
      expect((await worker.queued()).usage).toBe(1)
      expect(world.alarmAt).toBe(world.now + MIN_ALARM_DELAY_MS)

      world.outcome = "drop"
      await worker.fireAlarm()
      expect((await worker.queued()).usage).toBe(0)
      expect(world.sent).toHaveLength(2)
    })

    it("a build that sends nothing drops every capture and queues nothing", async () => {
      const world = createWorld()
      const worker = startWorker(world, {
        consent: consent("granted"),
        transmission: { mode: "off" },
      })

      expect(await worker.capture()).toBe("dropped_off")
      expect(await worker.capture(errorEvent())).toBe("dropped_off")
      expect(await worker.engine.admits("error")).toBe(false)
      expect(await worker.queued()).toEqual({ usage: 0, error: 0 })
      expect(world.alarmAt).toBeUndefined()
    })
  })

  describe("a failed start", () => {
    const expectInert = async (worker: ReturnType<typeof startWorker>, world: World) => {
      expect(await worker.capture()).toBe("dropped_off")
      expect(await worker.capture(errorEvent())).toBe("dropped_off")
      expect(await worker.engine.admits("usage")).toBe(false)
      await worker.engine.flush("usage")
      expect(sentEvents(world)).toEqual([])
      expect(world.alarmAt).toBeUndefined()
    }

    it("drops every event when the store cannot save, even after consent changes", async () => {
      const world = createWorld()
      world.store = {
        ...world.store,
        load: async () => undefined,
        commit: async () => {
          throw new Error("QuotaExceededError")
        },
      }
      const worker = startWorker(world, { consent: consent("granted") })

      await expectInert(worker, world)
      await worker.setConsent(consent("granted", "denied"))
      await expectInert(worker, world)
    })
  })

  it("rejects an event that fails the parse and stores nothing", async () => {
    const world = createWorld()
    const worker = startWorker(world, { consent: consent("granted") })

    const disposition = await worker.engine.capture({
      result: parseTrackedEvent({ event: "analytics_opt_in", properties: { source: "dapp" } }),
      uiContext: "dashboard",
      realNow: world.now,
    })

    expect(disposition).toBe("rejected")
    expect(await rows(world.store)).toEqual([])
  })

  it("answers a filtered report with its own disposition and stores nothing", async () => {
    const world = createWorld()
    const worker = startWorker(world, { consent: consent("granted") })

    const disposition = await worker.engine.capture({
      result: { ok: false, name: "$exception", issues: ["throttled"], disposition: "filtered" },
      uiContext: "background",
      realNow: world.now,
    })

    expect(disposition).toBe("filtered")
    expect(await rows(world.store, "error")).toEqual([])
  })
})
