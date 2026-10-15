import { beforeEach, describe, expect, it } from "vitest"

import { activeNetworksStore } from "./store.activeNetworks"
import { activeTokensStore } from "./store.activeTokens"

describe.each([
  ["activeNetworksStore", activeNetworksStore],
  ["activeTokensStore", activeTokensStore],
])("%s", (_, store) => {
  beforeEach(async () => {
    await chrome.storage.local.clear()
  })

  it("applies a reset issued right after a set last", async () => {
    await Promise.all([store.setActive("a", true), store.resetActive("a")])

    expect(await store.get()).toEqual({})
  })

  it("keeps a key another writer removed while the set was in flight", async () => {
    await store.setActive("b", true)

    await Promise.all([store.setActive("a", true), store.resetActive("b")])

    expect(await store.get()).toEqual({ a: true })
  })

  it("applies the last of two sets", async () => {
    await store.setActive("a", false)

    await Promise.all([store.setActive("a", true), store.setActive("a", false)])

    expect(await store.get()).toEqual({ a: false })
  })
})
