import { CONSENT_KINDS, type ConsentKind } from "@common/analytics/schema"
import type { UiContext } from "@common/analytics/superProperties"
import { IS_FIREFOX } from "@common/constants"
import { log } from "@common/log"
import { isEqual } from "lodash-es"
import { combineLatest, distinctUntilChanged, firstValueFrom, map, type Observable } from "rxjs"

import { remoteConfigStore } from "../app/store.remoteConfig"
import { settingsStore } from "../app/store.settings"
import { admit, consentFromSettings, planConsent, transmits } from "./consent"
import { type Environment, readEnvironment } from "./environment"
import { type ParsedEvent, type ParseResult, parseTrackedEvent } from "./parse"
import {
  createChromeAlarmScheduler,
  type FlushScheduler,
  MIN_ALARM_DELAY_MS,
  planWake,
} from "./scheduler"
import { drawOffsetMs } from "./session"
import { KIND_POLICY, stampEvent } from "./stamp"
import {
  createStorageDevLog,
  type DevLog,
  type DevLogDisposition,
  type DevLogEntry,
  devLogStore,
} from "./store.devLog"
import {
  type AnalyticsStore,
  createDexieAnalyticsStore,
  createMemoryAnalyticsStore,
} from "./store.queue"
import { parseAnalyticsRemoteConfig, resolveTransmission, type Transmission } from "./transmission"
import {
  createDevLogTransport,
  createPosthogTransport,
  MAX_BATCH_SIZE,
  nextBackoffMs,
  type Transport,
} from "./transport"
import type { AnalyticsState, Consent, Disposition, QueuedEventRecord } from "./types"

const MAX_HELD_EVENTS = 200
const MAX_BATCHES_PER_FLUSH = 10

export type AnalyticsEngineDeps = {
  clock: () => number
  drawOffset: () => number
  store: AnalyticsStore
  scheduler: FlushScheduler
  environment: () => Promise<Environment>
  consent$: Observable<Consent>
  transmission$: Observable<Transmission>
  transportFor: (transmission: Transmission) => Transport | null
  devLog: DevLog | null
}

export type CaptureInput = {
  result: ParseResult
  uiContext: UiContext
  realNow: number
}

export type AnalyticsSnapshot = {
  consent: Consent
  transmission: Transmission
  appliedConsent: Consent | null
  session: AnalyticsState["session"]
  held: number
  queued: Record<ConsentKind, number>
  sendTimes: number[]
  alarmAt: number | undefined
}

type Step = <T>(work: () => Promise<T>) => Promise<T>

export class AnalyticsEngine {
  readonly #deps: AnalyticsEngineDeps
  readonly #started = Promise.withResolvers<void>()
  #store: AnalyticsStore
  #tail: Promise<unknown>
  #state!: AnalyticsState
  #consent!: Consent
  #transmission!: Transmission
  #held: QueuedEventRecord[] = []
  #inFlight: Partial<Record<ConsentKind, Promise<void>>> = {}
  #failures = 0

  constructor(deps: AnalyticsEngineDeps) {
    this.#deps = deps
    this.#store = deps.store
    this.#tail = this.#started.promise.then(() => this.#init())
  }

  /**
   * Call once, synchronously, at the top level of the service worker: it registers the alarm
   * listener.
   */
  start(): void {
    this.#deps.scheduler.onFire(() => {
      for (const kind of CONSENT_KINDS) void this.flush(kind)
    })
    this.#started.resolve()
    combineLatest([this.#deps.consent$, this.#deps.transmission$]).subscribe(
      ([consent, transmission]) => {
        this.#serial(() => this.#apply(consent, transmission)).catch((cause) =>
          log.error("[analytics] consent or transmission change failed", { cause })
        )
      }
    )
  }

  capture({ result, uiContext, realNow }: CaptureInput): Promise<Disposition> {
    return this.#serial(async () => {
      if (result.ok) return this.#capture(result.event, uiContext, realNow)
      log.warn("[analytics] rejected event", result.name, result.issues)
      await this.#log({
        id: crypto.randomUUID(),
        name: result.name,
        capturedAt: realNow,
        disposition: "rejected",
        issues: result.issues,
      })
      return "rejected"
    })
  }

  flush(kind: ConsentKind): Promise<void> {
    this.#inFlight[kind] ??= (async () => {
      try {
        const outcome = await this.#drain(kind, (work) => this.#serial(work))
        if (outcome === "done") await this.#serial(() => this.#reschedule())
      } catch (cause) {
        log.error("[analytics] flush failed", { cause })
      } finally {
        delete this.#inFlight[kind]
      }
    })()
    return this.#inFlight[kind]
  }

  inspect(): Promise<AnalyticsSnapshot> {
    return this.#serial(async () => {
      const queued = await Promise.all(
        CONSENT_KINDS.map(async (kind) => {
          const rows = await this.#store.due(Number.POSITIVE_INFINITY, {
            kind,
            limit: Number.MAX_SAFE_INTEGER,
          })
          return [kind, rows.length] as const
        })
      )
      return {
        consent: this.#consent,
        transmission: this.#transmission,
        appliedConsent: this.#state.appliedConsent,
        session: this.#state.session,
        held: this.#held.length,
        queued: Object.fromEntries(queued) as Record<ConsentKind, number>,
        sendTimes: await this.#store.sendTimes(),
        alarmAt: await this.#deps.scheduler.scheduledAt(),
      }
    })
  }

  #serial<T>(work: () => Promise<T>): Promise<T> {
    const run = this.#tail.then(work, work)
    this.#tail = run.catch(() => {})
    return run
  }

  async #init() {
    const stored = await this.#store.load().catch((cause) => {
      log.warn("[analytics] IndexedDB unavailable, queueing in memory", { cause })
      this.#store = createMemoryAnalyticsStore()
      return undefined
    })
    this.#state = stored ?? {
      installId: crypto.randomUUID(),
      errorId: crypto.randomUUID(),
      session: null,
      appliedConsent: null,
    }
    if (!stored) await this.#store.commit({ state: this.#state })
    ;[this.#consent, this.#transmission] = await Promise.all([
      firstValueFrom(this.#deps.consent$),
      firstValueFrom(this.#deps.transmission$),
    ])
  }

  async #capture(event: ParsedEvent, uiContext: UiContext, realNow: number): Promise<Disposition> {
    const admission = admit(event.kind, this.#consent, this.#transmission)
    if (admission === "dropped_consent" || admission === "dropped_off") {
      await this.#log({
        id: crypto.randomUUID(),
        name: event.name,
        capturedAt: realNow,
        disposition: admission,
      })
      return admission
    }

    const { record, state } = stampEvent({
      event,
      uiContext,
      environment: await this.#deps.environment(),
      state: this.#state,
      realNow,
      drawOffset: this.#deps.drawOffset,
    })
    this.#state = state
    if (admission === "held") {
      this.#held = [...this.#held, record].slice(-MAX_HELD_EVENTS)
      await this.#store.commit({ state })
    } else {
      await this.#store.commit({ state, put: [record] })
    }
    await this.#log({
      id: record.uuid,
      name: event.name,
      capturedAt: realNow,
      disposition: admission,
      wire: record.wire,
    })

    if (admission === "queued") {
      if (KIND_POLICY[event.kind].flushImmediately) void this.flush(event.kind)
      else await this.#reschedule()
    }
    return admission
  }

  async #apply(consent: Consent, transmission: Transmission) {
    this.#consent = consent
    this.#transmission = transmission

    const blocked = CONSENT_KINDS.filter((kind) => !transmits(kind, transmission))
    await this.#dropHeld((record) => blocked.includes(record.kind), "dropped_off")
    await this.#purge(blocked)
    if (transmission.mode === "off") await this.#deps.scheduler.clear()

    const plan = planConsent(this.#state.appliedConsent, consent)
    switch (plan.usage) {
      case "decline":
        await this.#dropHeld((record) => record.kind === "usage", "dropped_consent")
        break
      case "opt_in_onboarding":
        await this.#releaseHeld()
        await this.#optIn("onboarding")
        break
      case "opt_in_settings":
        await this.#optIn("settings")
        break
      case "opt_out":
        await this.#drain("usage", (work) => work())
        this.#state = { ...this.#state, session: null }
        break
      case "none":
        break
    }
    await this.#purge(plan.purge)

    this.#state = { ...this.#state, appliedConsent: consent }
    await this.#store.commit({ state: this.#state })
    await this.#reschedule()
  }

  async #optIn(source: "onboarding" | "settings") {
    const result = parseTrackedEvent({ event: "analytics_opt_in", properties: { source } })
    if (result.ok) await this.#capture(result.event, "background", this.#deps.clock())
  }

  async #releaseHeld() {
    const released = this.#held
    this.#held = []
    if (!released.length) return
    await this.#store.commit({ put: released })
    await this.#setDisposition(
      released.map((record) => record.uuid),
      "released"
    )
  }

  async #dropHeld(matches: (record: QueuedEventRecord) => boolean, disposition: DevLogDisposition) {
    const dropped = this.#held.filter(matches)
    if (!dropped.length) return
    this.#held = this.#held.filter((record) => !matches(record))
    await this.#setDisposition(
      dropped.map((record) => record.uuid),
      disposition
    )
  }

  async #purge(kinds: readonly ConsentKind[]) {
    if (!kinds.length) return
    await this.#setDisposition(await this.#store.purge(kinds), "purged")
  }

  async #drain(kind: ConsentKind, step: Step): Promise<"done" | "retry"> {
    const transport = await step(async () => this.#deps.transportFor(this.#transmission))
    if (!transport) return "done"
    for (let batch = 0; batch < MAX_BATCHES_PER_FLUSH; batch++) {
      const rows = await step(() =>
        this.#store.due(this.#deps.clock(), { kind, limit: MAX_BATCH_SIZE })
      )
      if (!rows.length) return "done"

      const outcome = await transport(rows.map((row) => row.wire))
      if (outcome === "retry") {
        this.#failures++
        const delay = Math.max(MIN_ALARM_DELAY_MS, nextBackoffMs(this.#failures))
        await step(() => this.#deps.scheduler.schedule(this.#deps.clock() + delay))
        return "retry"
      }
      this.#failures = 0
      await step(() => this.#store.commit({ remove: rows.map((row) => row.uuid) }))
      if (rows.length < MAX_BATCH_SIZE) return "done"
    }
    return "done"
  }

  async #reschedule() {
    if (!this.#deps.transportFor(this.#transmission)) return
    const plan = planWake({
      sendTimes: await this.#store.sendTimes(),
      now: this.#deps.clock(),
      scheduledAt: await this.#deps.scheduler.scheduledAt(),
      drawDelay: this.#deps.drawOffset,
    })
    if (plan.type === "schedule") await this.#deps.scheduler.schedule(plan.at)
    if (plan.type === "clear") await this.#deps.scheduler.clear()
  }

  async #log(entry: DevLogEntry) {
    await this.#deps.devLog?.record([entry])
  }

  async #setDisposition(ids: readonly string[], disposition: DevLogDisposition) {
    if (ids.length) await this.#deps.devLog?.setDisposition(ids, disposition)
  }
}

const devLog = devLogStore && createStorageDevLog(devLogStore)

export const analyticsEngine = new AnalyticsEngine({
  clock: Date.now,
  drawOffset: drawOffsetMs,
  store: createDexieAnalyticsStore(),
  scheduler: createChromeAlarmScheduler(),
  environment: readEnvironment,
  consent$: settingsStore.observable.pipe(map(consentFromSettings), distinctUntilChanged(isEqual)),
  transmission$: remoteConfigStore.observable.pipe(
    map((config) =>
      resolveTransmission({
        isDevBuild: process.env.BUILD === "dev",
        build: IS_FIREFOX ? "firefox" : "chrome",
        config: parseAnalyticsRemoteConfig(config),
      })
    ),
    distinctUntilChanged(isEqual)
  ),
  transportFor: (transmission) => {
    if (transmission.mode === "posthog") return createPosthogTransport(transmission)
    if (transmission.mode === "dev_log" && devLog) return createDevLogTransport(devLog, Date.now)
    return null
  },
  devLog,
})

if (process.env.BUILD === "dev")
  Object.assign(globalThis, {
    talismanAnalytics: {
      log: async () => (await devLogStore?.get())?.entries,
      inspect: () => analyticsEngine.inspect(),
      flush: () => Promise.all(CONSENT_KINDS.map((kind) => analyticsEngine.flush(kind))),
    },
  })
