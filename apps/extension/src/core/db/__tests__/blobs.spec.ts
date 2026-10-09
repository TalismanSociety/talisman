import { beforeEach, describe, expect, it } from "vitest"

import { getBlobStore } from "../blobs"
import { db } from "../db"

describe("getBlobStore", () => {
  beforeEach(async () => {
    await db.blobs.clear()
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
})
