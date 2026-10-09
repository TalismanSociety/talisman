import * as pako from "pako"
import { beforeEach, describe, expect, it } from "vitest"

import { getBlobStore } from "../blobs"
import { db } from "../db"
import { queryCacheStore } from "../queryCache"

const payloads: Record<string, unknown> = {
  object: { networks: [{ id: "polkadot", name: "Polkadot", decimals: 10 }], tokens: ["DOT"] },
  array: [1, "two", { three: 3 }, [4], null, true],
  null: null,
  string: "polkadot",
  number: 1.5e-7,
  boolean: false,
  "empty object": {},
  "empty array": [],
  unicode: {
    accents: "Café crème",
    cjk: "波卡",
    emoji: "🦄🔥",
    rtl: "مرحبا",
    combining: "e\u0301",
  },
  escapes: {
    quote: '"',
    backslash: "\\",
    newline: "a\nb",
    control: "\u0000\u001f",
    separator: "\u2028",
  },
  "multi-chunk": Array.from({ length: 20_000 }, (_, i) => ({
    id: `${i}-substrate-native`,
    symbol: `TKN${i}`,
    balance: String(BigInt(i) * 10n ** 18n),
  })),
}

const levels = [0, 1, 6, 9] as const

const stores = {
  "blob store": {
    writeLegacy: (bytes: Uint8Array<ArrayBuffer>) => db.blobs.put({ id: "chaindata", data: bytes }),
    read: () => getBlobStore("chaindata").get(),
    write: (data: unknown) => getBlobStore("chaindata").set(data),
    readRaw: async () => (await db.blobs.get("chaindata"))?.data,
  },
  "query cache": {
    writeLegacy: (bytes: Uint8Array<ArrayBuffer>) =>
      db.queryCache.put({
        key: "legacy",
        data: bytes,
        purgeAt: Date.now() + 60_000,
        updatedAt: Date.now(),
        dataUpdatedAt: Date.now(),
      }),
    read: async () => (await queryCacheStore.get("legacy"))?.data ?? null,
    write: (data: unknown) => queryCacheStore.set("legacy", data, Date.now() + 60_000, Date.now()),
    readRaw: async () => (await db.queryCache.get("legacy"))?.data,
  },
}

describe.each(Object.entries(stores))("%s keeps pako-written data readable", (_, store) => {
  beforeEach(async () => {
    await Promise.all([db.blobs.clear(), db.queryCache.clear()])
  })

  describe.each(levels)("deflated at level %i", (level) => {
    it.each(Object.entries(payloads))("reads %s", async (_, data) => {
      await store.writeLegacy(pako.deflate(JSON.stringify(data), { level }))

      expect(await store.read()).toEqual(data)
    })
  })

  it.each(Object.entries(payloads))("writes %s in a format pako inflates", async (_, data) => {
    await store.write(data)

    const raw = await store.readRaw()
    expect(raw).toBeInstanceOf(Uint8Array)
    expect(JSON.parse(pako.inflate(raw!, { toText: true }))).toEqual(data)
  })
})
