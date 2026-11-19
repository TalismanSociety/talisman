import { vi } from "vitest"

const mockDbGet = vi.fn()
vi.mock("../../db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../db")>()),
  db: { transactionsV2: { get: (...args: unknown[]) => mockDbGet(...args) } },
}))

const mockUpdateSwapStatus = vi.fn()
vi.mock("./store.transactions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./store.transactions")>()),
  updateSwapStatus: (...args: unknown[]) => mockUpdateSwapStatus(...args),
}))

vi.mock("@common/chainflip", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@common/chainflip")>()),
  getChainflipApiKey: () => "test-api-key",
}))

vi.mock("../app/store.remoteConfig", () => ({
  remoteConfigStore: { get: async () => ({}) },
}))

const { watchSwapStatus } = await import("./watchSwapStatus")

// --- Test helpers ---

const txInfo = {
  type: "swap-chainflip" as const,
  exchangeId: "14310360-Ethereum-4192",
  fromTokenId: "1:evm-erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  toTokenId: "1:evm-native",
  fromAmount: "100000000",
  toAmount: "51360243753910",
  to: "0x1111111111111111111111111111111111111111",
}

const statusBody = (state: string, extra: Record<string, unknown> = {}) => ({
  id: 63321,
  platform: "chainflip",
  status: { state, swapId: "63321", ...extra },
})

/** Each response is used for one poll, in order. */
const stubFetch = (responses: { ok: boolean; status?: number; body?: unknown }[]) => {
  let call = 0
  const fetchMock = vi.fn(async (input: string | URL) => {
    void input
    const res = responses[Math.min(call, responses.length - 1)]
    call += 1
    return { ok: res.ok, status: res.status ?? 200, json: async () => res.body }
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const statuses = () => mockUpdateSwapStatus.mock.calls.map(([, status]) => status)

beforeEach(() => {
  vi.unstubAllGlobals()
  mockUpdateSwapStatus.mockReset()
  mockDbGet.mockReset()
  mockDbGet.mockResolvedValue({ id: "tx-1", timestamp: Date.now(), txInfo })
})

describe("watchSwapStatus for chainflip", () => {
  it("polls the deposit channel and records a terminal status", async () => {
    const fetchMock = stubFetch([{ ok: true, body: statusBody("completed") }])

    await watchSwapStatus("tx-1")

    // Proves the type is in isTxInfoSwap: without it the watcher returns before polling
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const url = new URL(fetchMock.mock.calls[0]![0].toString())
    expect(url.pathname).toBe("/status-by-deposit-channel")
    expect(url.searchParams.get("apiKey")).toBe("test-api-key")
    expect(statuses()).toEqual(["finished"])
  })

  it("splits the channel key back into query params", async () => {
    const fetchMock = stubFetch([{ ok: true, body: statusBody("completed") }])

    await watchSwapStatus("tx-parse")

    const url = new URL(fetchMock.mock.calls[0]![0].toString())
    expect(url.searchParams.get("issuedBlock")).toBe("14310360")
    expect(url.searchParams.get("network")).toBe("Ethereum")
    expect(url.searchParams.get("channelId")).toBe("4192")
  })

  it("throws on a malformed channel key rather than polling a wrong channel", async () => {
    vi.useFakeTimers()
    try {
      // Over an hour old, so the watcher treats "unknown" as final instead of polling on
      mockDbGet.mockResolvedValue({
        id: "tx-bad",
        timestamp: Date.now() - 2 * 60 * 60 * 1_000,
        txInfo: { ...txInfo, exchangeId: "nonsense" },
      })
      const fetchMock = stubFetch([{ ok: true, body: statusBody("completed") }])

      const watching = watchSwapStatus("tx-bad")
      // 10 retries, 5s apart, then the watcher gives up
      await vi.advanceTimersByTimeAsync(60_000)
      await watching

      expect(fetchMock).not.toHaveBeenCalled()
      expect(statuses()).toEqual(["unknown"])
    } finally {
      vi.useRealTimers()
    }
  })

  it("maps a refunded swap to refunded, not failed", async () => {
    stubFetch([{ ok: true, body: statusBody("failed", { refundEgress: { amount: "100000000" } }) }])

    await watchSwapStatus("tx-2")

    expect(statuses()).toEqual(["refunded"])
  })

  it("maps a completed swap with only a refund to refunded", async () => {
    stubFetch([
      { ok: true, body: statusBody("completed", { refundEgress: { amount: "100000000" } }) },
    ])

    await watchSwapStatus("tx-2")

    expect(statuses()).toEqual(["refunded"])
  })

  it("maps a partly filled DCA swap, with output and a refund, to finished", async () => {
    stubFetch([
      {
        ok: true,
        body: statusBody("completed", {
          swapEgress: { amount: "5000000000" },
          refundEgress: { amount: "40000000" },
        }),
      },
    ])

    await watchSwapStatus("tx-2")

    expect(statuses()).toEqual(["finished"])
  })

  it("maps a failure without a refund to failed", async () => {
    stubFetch([{ ok: true, body: statusBody("failed") }])

    await watchSwapStatus("tx-3")

    expect(statuses()).toEqual(["failed"])
  })

  it.each([
    ["waiting", "waiting"],
    ["receiving", "confirming"],
    ["swapping", "exchanging"],
    ["sending", "sending"],
    ["sent", "sending"],
  ])("maps the in-flight state %s to %s", async (state, expected) => {
    vi.useFakeTimers()
    try {
      stubFetch([
        { ok: true, body: statusBody(state) },
        { ok: true, body: statusBody("completed") },
      ])

      const watching = watchSwapStatus(`tx-${state}`)
      await vi.advanceTimersByTimeAsync(20_000)
      await watching

      expect(statuses()).toEqual([expected, "finished"])
    } finally {
      vi.useRealTimers()
    }
  })

  it("treats a 404 as not_found rather than an error, then continues polling", async () => {
    vi.useFakeTimers()
    try {
      stubFetch([
        { ok: false, status: 404, body: { title: "Not Found", status: 404 } },
        { ok: true, body: statusBody("completed") },
      ])

      const watching = watchSwapStatus("tx-4")
      await vi.advanceTimersByTimeAsync(20_000)
      await watching

      expect(statuses()).toEqual(["not_found", "finished"])
    } finally {
      vi.useRealTimers()
    }
  })

  it("throws on any other non-ok response so the retry loop applies", async () => {
    vi.useFakeTimers()
    try {
      const fetchMock = stubFetch([
        { ok: false, status: 500, body: {} },
        { ok: true, body: statusBody("completed") },
      ])

      const watching = watchSwapStatus("tx-5")
      // One retry delay, not one poll interval — a throw is retried, a status is not
      await vi.advanceTimersByTimeAsync(5_000)
      await watching

      expect(fetchMock).toHaveBeenCalledTimes(2)
      // No status was written for the failed attempt
      expect(statuses()).toEqual(["finished"])
    } finally {
      vi.useRealTimers()
    }
  })

  it("throws on an unrecognised state rather than persisting unknown", async () => {
    vi.useFakeTimers()
    try {
      stubFetch([
        { ok: true, body: statusBody("someNewStateWeHaveNeverSeen") },
        { ok: true, body: statusBody("completed") },
      ])

      const watching = watchSwapStatus("tx-6")
      await vi.advanceTimersByTimeAsync(5_000)
      await watching

      // "unknown" is the watcher's give-up value — a swap sitting on it is abandoned after an
      // hour, so an unexpected state must be retried instead of recorded
      expect(statuses()).not.toContain("unknown")
      expect(statuses()).toEqual(["finished"])
    } finally {
      vi.useRealTimers()
    }
  })
})
