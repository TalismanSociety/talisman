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

export type FlowLinks = {
  put(transactionId: string, slot: Slot, now: number): Promise<void>
  take(transactionId: string): Promise<Slot | null>
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
      this.deps.links.put(mirror.transactionId, slot, now).catch(reportFailure("link"))
      return
    }
    slots.set(flowId, slot)
    const oldest = slots.keys().next().value
    if (slots.size > MAX_OPEN_PER_PORT && oldest !== undefined) slots.delete(oldest)
  }

  async settled(transactionId: string, settled: Settled, now: number): Promise<void> {
    const slot = await this.deps.links.take(transactionId)
    if (slot) this.#emit(slot, completeOnSettlement(slot.mirror, settled, now), null, now)
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

export type FlowLinkRecord = Omit<Mirror, "flow"> & {
  readonly flow: string
  readonly uiContext: UiContext
  readonly linkedAt: number
}

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

  return {
    put: (transactionId, { mirror, uiContext }, now) =>
      serialised(async () => {
        const kept = (await storage.read()).filter(
          (record) => now - record.linkedAt < LINK_TTL_MS && record.transactionId !== transactionId
        )
        const record = { ...mirror, flow: mirror.flow.name, uiContext, linkedAt: now }
        await storage.write([...kept, record].slice(-MAX_LINKS))
      }),
    take: (transactionId) =>
      serialised(async () => {
        const records = await storage.read()
        const record = records.find((candidate) => candidate.transactionId === transactionId)
        if (!record) return null
        await storage.write(records.filter((candidate) => candidate !== record))
        const flow = flowList().find((candidate) => candidate.name === record.flow)
        if (!flow) return null
        const { uiContext, linkedAt: _, ...mirror } = record
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
