import { describe, expect, it, vi } from "vitest"

import { classifyResponseStatus, createPosthogTransport, nextBackoffMs } from "./transport"
import type { RedactedProperties, WireEvent } from "./types"

const EVENT: WireEvent = {
  event: "analytics_opt_in",
  distinct_id: "install-id",
  properties: { source: "settings" } as unknown as RedactedProperties,
  timestamp: "2026-10-02T12:00:00.000Z",
  uuid: "0199a4f0-0000-7000-8000-000000000000",
}

describe("classifyResponseStatus", () => {
  it.each([
    [200, "sent"],
    [204, "sent"],
    [400, "drop"],
    [401, "drop"],
    [408, "retry"],
    [429, "retry"],
    [500, "retry"],
    [503, "retry"],
  ] as const)("%i: %s", (status, expected) => {
    expect(classifyResponseStatus(status)).toBe(expected)
  })
})

describe("createPosthogTransport", () => {
  it("posts the batch with the key to the endpoint", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }))
    const send = createPosthogTransport({
      endpoint: "https://z.talisman.xyz/batch/",
      apiKey: "phc_test",
      fetchImpl,
    })

    expect(await send([EVENT])).toBe("sent")
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe("https://z.talisman.xyz/batch/")
    expect(JSON.parse(init?.body as string)).toEqual({
      api_key: "phc_test",
      historical_migration: false,
      batch: [EVENT],
    })
  })

  it("retries on a network error", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("Failed to fetch"))
    const send = createPosthogTransport({ endpoint: "https://x.example/", apiKey: "k", fetchImpl })

    expect(await send([EVENT])).toBe("retry")
  })
})

describe("nextBackoffMs", () => {
  it.each([
    [0, 0],
    [1, 5_000],
    [2, 10_000],
    [7, 300_000],
    [20, 300_000],
  ])("%i failures: %i ms", (failures, expected) => {
    expect(nextBackoffMs(failures)).toBe(expected)
  })
})
