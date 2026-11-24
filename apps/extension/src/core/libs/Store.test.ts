import { describe, expect, test, vi } from "vitest"

import { StorageProvider } from "./Store"

describe("StorageProvider", () => {
  test("rejects a write that browser storage refuses and keeps storing later writes", async () => {
    const store = new StorageProvider<{ value: number }>("storeWriteFailure")
    const setLocalStorageItems = vi.mocked(chrome.storage.local.set)
    const storeItems = setLocalStorageItems.getMockImplementation()
    expect(storeItems).toBeDefined()

    setLocalStorageItems.mockImplementationOnce(async () => {
      throw new Error("storage write failed")
    })
    await expect(store.set({ value: 1 })).rejects.toThrow("storage write failed")

    await expect(store.set({ value: 2 })).resolves.toEqual({ value: 2 })
    expect(await store.get("value")).toBe(2)

    store.destroy()
  })
})
