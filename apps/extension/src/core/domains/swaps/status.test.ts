import { describe, expect, it, vi } from "vitest"

import type { RemoteConfigStoreData } from "../app/types"
import { fetchSimpleswapStatus, fetchStealthexStatus, type SwapStatusEnv } from "./status"

const respond = (body: unknown) =>
  vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status: 200 }))

const envWith = (fetchMock: typeof fetch): SwapStatusEnv => ({
  fetch: fetchMock,
  proxyFetch: fetchMock,
  getSwapsConfig: async () =>
    ({ simpleswapApiKey: "key" }) as unknown as RemoteConfigStoreData["swaps"],
})

describe.each([
  ["SimpleSwap", fetchSimpleswapStatus],
  ["StealthEX", fetchStealthexStatus],
])("%s exchange status", (provider, fetchStatus) => {
  it.each([
    "waiting",
    "confirming",
    "exchanging",
    "sending",
    "verifying",
    "finished",
    "failed",
    "refunded",
    "expired",
  ])("reads %s as the swap status of the same name", async (status) => {
    await expect(fetchStatus("exchange-1", envWith(respond({ status })))).resolves.toBe(status)
  })

  it.each(["hold", "overdue", "constructor"])(
    "reads a status it does not know, %s, as unknown",
    async (status) => {
      await expect(fetchStatus("exchange-1", envWith(respond({ status })))).resolves.toBe("unknown")
    }
  )

  it.each([
    ["no status", {}],
    ["an empty status", { status: "" }],
    ["a status that is not a string", { status: 3 }],
    ["no body", null],
  ])("throws on a response with %s", async (_, body) => {
    await expect(fetchStatus("exchange-1", envWith(respond(body)))).rejects.toThrow(
      `${provider} API returned no status`
    )
  })
})
