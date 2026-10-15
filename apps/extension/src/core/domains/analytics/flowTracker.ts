import { isErrorCategory } from "@common/analytics/errorCategory"
import {
  abandonOnPageClose,
  completeOnSettlement,
  type Emission,
  type Mirror,
  mirrorError,
  mirrorEvent,
  mirrorScreen,
  type Settled,
  stringIn,
} from "@common/analytics/flow/machine"
import { flowEventRef, flowList } from "@common/analytics/flow/registry"
import type { EventProperties } from "@common/analytics/schema"
import type { UiContext } from "@common/analytics/superProperties"
import { log } from "@common/log"

import type { Port } from "../../types/base"
import { sessionStorage } from "../../util/sessionStorageCompat"
import { analyticsEngine } from "./engine"
import { type ParsedCatalogueEvent, parseTrackedEvent } from "./parse"

type Slot = { readonly mirror: Mirror; readonly uiContext: UiContext }

type PortState = { readonly slots: Map<string, Slot>; screen: string | null }

type Settlement = { readonly settled: Settled; readonly settledAt: number }

export type FlowLinks = {
  put(transactionId: string, slot: Slot, now: number): Promise<Settlement | null>
  take(transactionId: string, settled: Settled, now: number): Promise<Slot | null>
}

export type FlowSend = (
  event: string,
  properties: EventProperties,
  { uiContext, screen, realNow }: { uiContext: UiContext; screen: string | null; realNow: number }
) => void

const MAX_OPEN_PER_PORT = 16

export class FlowTracker {
  readonly #ports = new Map<Port, PortState>()

  constructor(private readonly deps: { send: FlowSend; links: FlowLinks }) {}

  observe(port: Port, uiContext: UiContext, event: ParsedCatalogueEvent, now: number): void {
    const state = this.#watch(port)
    const { slots } = state
    const flowId = stringIn(event.properties, "flow_id")

    if (event.name === "$screen") {
      const screen = stringIn(event.properties, "$screen_name")
      state.screen = screen
      if (screen)
        for (const [id, slot] of slots)
          slots.set(id, { ...slot, mirror: mirrorScreen(slot.mirror, screen) })
      return
    }

    if (event.name === "error_shown") {
      const slot = flowId && slots.get(flowId)
      const category = event.properties.error_category
      if (slot && flowId && isErrorCategory(category))
        slots.set(flowId, { ...slot, mirror: mirrorError(slot.mirror, category) })
      return
    }

    const ref = flowEventRef(event.name)
    if (!ref || !flowId) return
    const mirror = mirrorEvent(slots.get(flowId)?.mirror ?? null, ref, event.properties, {
      now,
      screen: event.screen ?? state.screen,
      transactionId: event.transactionId,
    })

    if (!mirror) {
      slots.delete(flowId)
      return
    }
    const slot = { mirror, uiContext }
    if (mirror.phase === "submitted" && mirror.transactionId) {
      slots.delete(flowId)
      this.deps.links
        .put(mirror.transactionId, slot, now)
        .then((early) => early && this.#complete(slot, early.settled, early.settledAt))
        .catch(reportFailure("link"))
      return
    }
    slots.set(flowId, slot)
    const oldest = slots.keys().next().value
    if (slots.size > MAX_OPEN_PER_PORT && oldest !== undefined) slots.delete(oldest)
  }

  async settled(transactionId: string, settled: Settled, now: number): Promise<void> {
    const slot = await this.deps.links.take(transactionId, settled, now)
    if (slot) this.#complete(slot, settled, now)
  }

  #complete(slot: Slot, settled: Settled, now: number) {
    this.#emit(slot, completeOnSettlement(slot.mirror, settled, now), null, now)
  }

  #watch(port: Port): PortState {
    const known = this.#ports.get(port)
    if (known) return known
    const state: PortState = { slots: new Map(), screen: null }
    this.#ports.set(port, state)
    port.onDisconnect.addListener(() => this.#disconnect(port, Date.now()))
    return state
  }

  #disconnect(port: Port, now: number) {
    const state = this.#ports.get(port)
    this.#ports.delete(port)
    for (const slot of state?.slots.values() ?? []) {
      const emission = abandonOnPageClose(slot.mirror, now)
      if (emission) this.#emit(slot, emission, state?.screen ?? null, now)
    }
  }

  #emit({ mirror, uiContext }: Slot, emission: Emission, screen: string | null, now: number) {
    const event = mirror.flow.eventNames[emission.lifecycle]
    if (event) this.deps.send(event, emission.properties, { uiContext, screen, realNow: now })
  }
}

const reportFailure = (what: string) => (cause: unknown) =>
  log.error(`[analytics] flow ${what} failed`, { cause })

const MAX_LINKS = 50
const LINK_TTL_MS = 24 * 60 * 60_000
const MAX_SETTLEMENTS = 20
const SETTLEMENT_TTL_MS = 10 * 60_000

type LinkRecord = Omit<Mirror, "flow"> & {
  readonly kind: "link"
  readonly flow: string
  readonly uiContext: UiContext
  readonly linkedAt: number
}

type SettlementRecord = Settlement & {
  readonly kind: "settlement"
  readonly transactionId: string
}

export type FlowLinkRecord = LinkRecord | SettlementRecord

const isLive = (now: number) => (record: FlowLinkRecord) =>
  record.kind === "link"
    ? now - record.linkedAt < LINK_TTL_MS
    : now - record.settledAt < SETTLEMENT_TTL_MS

const capped = (records: readonly FlowLinkRecord[]) => [
  ...records.filter((record) => record.kind === "link").slice(-MAX_LINKS),
  ...records.filter((record) => record.kind === "settlement").slice(-MAX_SETTLEMENTS),
]

const findRecord = <K extends FlowLinkRecord["kind"]>(
  records: readonly FlowLinkRecord[],
  kind: K,
  transactionId: string
) =>
  records.find(
    (record): record is Extract<FlowLinkRecord, { kind: K }> =>
      record.kind === kind && record.transactionId === transactionId
  )

export type LinkStorage = {
  read(): Promise<readonly FlowLinkRecord[]>
  write(records: readonly FlowLinkRecord[]): Promise<void>
}

export const createFlowLinks = (storage: LinkStorage): FlowLinks => {
  let queue: Promise<unknown> = Promise.resolve()
  const serialised = <T>(task: () => Promise<T>): Promise<T> => {
    const result = queue.then(task)
    queue = result.catch(() => {})
    return result
  }

  const readLive = async (now: number) => (await storage.read()).filter(isLive(now))
  const without = (records: readonly FlowLinkRecord[], transactionId: string) =>
    records.filter((record) => record.transactionId !== transactionId)

  return {
    put: (transactionId, { mirror, uiContext }, now) =>
      serialised(async () => {
        const records = await readLive(now)
        const early = findRecord(records, "settlement", transactionId)
        const kept = without(records, transactionId)
        if (early) {
          await storage.write(kept)
          return { settled: early.settled, settledAt: early.settledAt }
        }
        const record: LinkRecord = {
          ...mirror,
          kind: "link",
          flow: mirror.flow.name,
          uiContext,
          linkedAt: now,
        }
        await storage.write(capped([...kept, record]))
        return null
      }),
    take: (transactionId, settled, now) =>
      serialised(async () => {
        const records = await readLive(now)
        const link = findRecord(records, "link", transactionId)
        const kept = without(records, transactionId)
        if (!link) {
          const early: SettlementRecord = {
            kind: "settlement",
            transactionId,
            settled,
            settledAt: now,
          }
          await storage.write(capped([...kept, early]))
          return null
        }
        await storage.write(kept)
        const flow = flowList().find((candidate) => candidate.name === link.flow)
        if (!flow) return null
        const { kind: _kind, uiContext, linkedAt: _linkedAt, ...mirror } = link
        return { mirror: { ...mirror, flow }, uiContext }
      }),
  }
}

const sessionLinkStorage: LinkStorage = {
  read: async () => (await sessionStorage.get("analyticsFlowLinks")) ?? [],
  write: (records) => sessionStorage.set({ analyticsFlowLinks: [...records] }),
}

export const flowTracker = new FlowTracker({
  send: (event, properties, { uiContext, screen, realNow }) => {
    analyticsEngine
      .capture({
        result: parseTrackedEvent({ event, properties, ...(screen && { screen }) }),
        uiContext,
        realNow,
      })
      .catch(reportFailure("capture"))
  },
  links: createFlowLinks(sessionLinkStorage),
})
