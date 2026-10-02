import type { ConsentKind } from "@common/analytics/schema"
import { Dexie } from "dexie"

import type { AnalyticsState, QueuedEventRecord } from "./types"

export const MAX_QUEUED_EVENTS = 1_000

export interface AnalyticsStore {
  load(): Promise<AnalyticsState | undefined>
  commit(change: {
    state?: AnalyticsState
    put?: readonly QueuedEventRecord[]
    remove?: readonly string[]
  }): Promise<void>
  due(until: number, options: { kind: ConsentKind; limit: number }): Promise<QueuedEventRecord[]>
  sendTimes(): Promise<number[]>
  purge(kinds: readonly ConsentKind[]): Promise<string[]>
}

const bySendAt = (a: QueuedEventRecord, b: QueuedEventRecord) => a.sendAt - b.sendAt

export const createMemoryAnalyticsStore = (): AnalyticsStore => {
  let state: AnalyticsState | undefined
  const rows = new Map<string, QueuedEventRecord>()
  const sorted = () => [...rows.values()].sort(bySendAt)

  return {
    load: async () => state && structuredClone(state),
    commit: async (change) => {
      if (change.state) state = structuredClone(change.state)
      for (const row of change.put ?? []) rows.set(row.uuid, structuredClone(row))
      for (const uuid of change.remove ?? []) rows.delete(uuid)
      for (const row of sorted().slice(0, Math.max(0, rows.size - MAX_QUEUED_EVENTS)))
        rows.delete(row.uuid)
    },
    due: async (until, { kind, limit }) =>
      sorted()
        .filter((row) => row.kind === kind && row.sendAt <= until)
        .slice(0, limit),
    sendTimes: async () => sorted().map((row) => row.sendAt),
    purge: async (kinds) => {
      const purged = [...rows.values()].filter((row) => kinds.includes(row.kind))
      for (const row of purged) rows.delete(row.uuid)
      return purged.map((row) => row.uuid)
    },
  }
}

type StateRow = AnalyticsState & { key: "state" }

class AnalyticsDatabase extends Dexie {
  events!: Dexie.Table<QueuedEventRecord, string>
  state!: Dexie.Table<StateRow, "state">

  constructor() {
    super("TalismanAnalytics")
    this.version(1).stores({ events: "uuid, sendAt, kind", state: "key" })
  }
}

export const createDexieAnalyticsStore = (): AnalyticsStore => {
  const db = new AnalyticsDatabase()
  return {
    load: async () => {
      const row = await db.state.get("state")
      if (!row) return undefined
      const { key: _, ...state } = row
      return state
    },
    commit: ({ state, put, remove }) =>
      db.transaction("rw", db.events, db.state, async () => {
        if (state) await db.state.put({ ...state, key: "state" })
        if (put?.length) await db.events.bulkPut([...put])
        if (remove?.length) await db.events.bulkDelete([...remove])
        const excess = (await db.events.count()) - MAX_QUEUED_EVENTS
        if (excess > 0)
          await db.events.bulkDelete(await db.events.orderBy("sendAt").limit(excess).primaryKeys())
      }),
    due: (until, { kind, limit }) =>
      db.events
        .where("sendAt")
        .belowOrEqual(until)
        .filter((row) => row.kind === kind)
        .limit(limit)
        .toArray(),
    sendTimes: async () => (await db.events.orderBy("sendAt").keys()).map(Number),
    purge: (kinds) =>
      db.transaction("rw", db.events, async () => {
        const uuids = await db.events
          .where("kind")
          .anyOf([...kinds])
          .primaryKeys()
        await db.events.bulkDelete(uuids)
        return uuids
      }),
  }
}
