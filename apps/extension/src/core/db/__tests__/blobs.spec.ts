import { Dexie } from "dexie"
import { firstValueFrom } from "rxjs"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { blobWriteErrors$, getBlobStore } from "../blobs"
import { db } from "../db"

describe("getBlobStore", () => {
  beforeEach(async () => {
    await db.blobs.clear()
  })

  afterEach(async () => {
    if (!db.isOpen()) await db.open()
  })

  it("round-trips data", async () => {
    const data = { networks: [{ id: "polkadot", name: "Polkadot" }], tokens: ["DOT"] }
    await getBlobStore("chaindata").set(data)

    expect(await getBlobStore("chaindata").get()).toEqual(data)
  })

  it("returns null for a corrupt blob", async () => {
    await db.blobs.put({ id: "chaindata", data: new Uint8Array([1, 2, 3, 4]) })

    expect(await getBlobStore("chaindata").get()).toBeNull()
  })

  it("resolves when the write fails, so fire-and-forget callers leak no rejection", async () => {
    db.close()
    const writeError = firstValueFrom(blobWriteErrors$)

    await expect(getBlobStore("chaindata").set({ tokens: ["DOT"] })).resolves.toBeUndefined()
    expect(await writeError).toBeInstanceOf(Dexie.DatabaseClosedError)
  })

  it("rejects a failed write for callers that must know", async () => {
    db.close()

    await expect(getBlobStore("chaindata").setOrThrow({ tokens: ["DOT"] })).rejects.toBeInstanceOf(
      Dexie.DatabaseClosedError
    )
  })
})
