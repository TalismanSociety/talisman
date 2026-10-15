import { Dexie } from "dexie"
import { beforeEach, describe, expect, it } from "vitest"

import { shift } from "./session"
import {
  type AnalyticsStore,
  createDexieAnalyticsStore,
  createMemoryAnalyticsStore,
  MAX_QUEUED_EVENTS,
} from "./store.queue"
import type { AnalyticsState, QueuedEventRecord, RedactedProperties } from "./types"

const row = (uuid: string, sendAt: number, kind: QueuedEventRecord["kind"] = "usage") => ({
  uuid,
  sendAt: shift(sendAt, 0),
  kind,
  wire: {
    event: "analytics_opt_in",
    distinct_id: "session-id",
    properties: {} as RedactedProperties,
    timestamp: new Date(sendAt).toISOString(),
    uuid,
  },
})

const STATE: AnalyticsState = {
  session: null,
  appliedConsent: { usage: "granted", error: "granted" },
}

describe.each([
  ["memory", createMemoryAnalyticsStore],
  ["IndexedDB", createDexieAnalyticsStore],
])("%s analytics store", (_, create) => {
  let store: AnalyticsStore

  beforeEach(async () => {
    await Dexie.delete("TalismanAnalytics")
    store = create()
  })

  it("commits the state and rows together and reads them back", async () => {
    await store.commit({ state: STATE, put: [row("b", 20), row("a", 10)] })

    expect(await store.load()).toEqual(STATE)
    expect(await store.sendTimes()).toEqual([10, 20])
  })

  it("returns due rows of one kind, oldest first, up to the limit", async () => {
    await store.commit({ put: [row("c", 30), row("a", 10), row("e", 15, "error"), row("b", 20)] })

    expect((await store.due(25, { kind: "usage", limit: 10 })).map((r) => r.uuid)).toEqual([
      "a",
      "b",
    ])
    expect((await store.due(25, { kind: "usage", limit: 1 })).map((r) => r.uuid)).toEqual(["a"])
    expect((await store.due(25, { kind: "error", limit: 10 })).map((r) => r.uuid)).toEqual(["e"])
  })

  it("is idempotent: a resent row overwrites itself, a repeated delete is a no-op", async () => {
    await store.commit({ put: [row("a", 10)] })
    await store.commit({ put: [row("a", 10)] })
    await store.commit({ remove: ["a"] })
    await store.commit({ remove: ["a"] })

    expect(await store.sendTimes()).toEqual([])
  })

  it("purges the rows of the given kinds and returns their uuids", async () => {
    await store.commit({ put: [row("a", 10), row("e", 15, "error")] })

    expect(await store.purge(["usage"])).toEqual(["a"])
    expect(await store.sendTimes()).toEqual([15])
  })

  it(`keeps at most ${MAX_QUEUED_EVENTS} rows, dropping the oldest`, async () => {
    const rows = Array.from({ length: MAX_QUEUED_EVENTS + 5 }, (_, i) => row(`r${i}`, 1000 + i))
    await store.commit({ put: rows })

    const sendTimes = await store.sendTimes()
    expect(sendTimes).toHaveLength(MAX_QUEUED_EVENTS)
    expect(sendTimes[0]).toBe(1005)
  })
})
