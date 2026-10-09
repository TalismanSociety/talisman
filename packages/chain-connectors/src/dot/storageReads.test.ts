import { describe, expect, it, vi } from "vitest"
import { fetchStorageKeysPaged, queryStorageAt } from "./storageReads"

const hexKey = (index: number): `0x${string}` => `0x${index.toString(16).padStart(8, "0")}`
const keys = (count: number) => Array.from({ length: count }, (_, index) => hexKey(index))

describe("fetchStorageKeysPaged", () => {
  it("walks pages of 1000 keys from the last key of the previous page", async () => {
    const send = vi.fn(async (_networkId: string, _method: string, params: unknown[]) =>
      params[2] ? keys(1200).slice(1000) : keys(1000)
    )

    const result = await fetchStorageKeysPaged({ send }, "polkadot", "0xprefix", { at: "0xblock" })

    expect(result).toEqual(keys(1200))
    expect(send.mock.calls.map(([, method, params]) => [method, params])).toEqual([
      ["state_getKeysPaged", ["0xprefix", 1000, null, "0xblock"]],
      ["state_getKeysPaged", ["0xprefix", 1000, hexKey(999), "0xblock"]],
    ])
  })

  it("sends only the prefix and page size when there is no block or start key", async () => {
    const send = vi.fn(async () => keys(3))

    await fetchStorageKeysPaged({ send }, "polkadot", "0xprefix")

    expect(send).toHaveBeenCalledWith("polkadot", "state_getKeysPaged", ["0xprefix", 1000])
  })

  it("stops between pages once aborted", async () => {
    const controller = new AbortController()
    const send = vi.fn(async () => {
      controller.abort()
      return keys(1000)
    })

    await expect(
      fetchStorageKeysPaged({ send }, "polkadot", "0xprefix", { signal: controller.signal })
    ).rejects.toThrow()
    expect(send).toHaveBeenCalledTimes(1)
  })
})

describe("queryStorageAt", () => {
  const changesFor = (storageKeys: string[]) => [
    {
      block: "0xblock",
      changes: storageKeys.map((key) => [key, key === hexKey(1) ? null : `${key}ff`]),
    },
  ]

  it("reads values in chunks of 500 keys and maps every key to its value", async () => {
    const send = vi.fn(async (_networkId: string, _method: string, [storageKeys]: unknown[]) =>
      changesFor(storageKeys as string[])
    )

    const values = await queryStorageAt({ send }, "polkadot", keys(1200))

    expect(send.mock.calls.map(([, , [chunk]]) => (chunk as string[]).length)).toEqual([
      500, 500, 200,
    ])
    expect(values.size).toBe(1200)
    expect(values.get(hexKey(0))).toBe(`${hexKey(0)}ff`)
    expect(values.get(hexKey(1))).toBeNull()
    expect(values.get(hexKey(1199))).toBe(`${hexKey(1199)}ff`)
  })

  it("reads nothing for an empty key list", async () => {
    const send = vi.fn()

    expect(await queryStorageAt({ send }, "polkadot", [])).toEqual(new Map())
    expect(send).not.toHaveBeenCalled()
  })

  it("passes the block hash and stops between chunks once aborted", async () => {
    const controller = new AbortController()
    const send = vi.fn(async (_networkId: string, _method: string, [storageKeys]: unknown[]) => {
      controller.abort()
      return changesFor(storageKeys as string[])
    })

    await expect(
      queryStorageAt({ send }, "polkadot", keys(600), { at: "0xblock", signal: controller.signal })
    ).rejects.toThrow()
    expect(send).toHaveBeenCalledTimes(1)
    expect(send.mock.calls[0][2][1]).toBe("0xblock")
  })

  it("rejects a response without a change set", async () => {
    const send = vi.fn(async () => [])

    await expect(queryStorageAt({ send }, "polkadot", keys(1))).rejects.toThrow(
      "Unexpected state_queryStorageAt response shape"
    )
  })
})
