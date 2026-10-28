import { createGandalfAuthorization, createGandalfFetch } from "@common/createGandalfFetch"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { ExtensionStore } from "../../../handlers/stores"

const mocks = vi.hoisted(() => ({
  store: { get: vi.fn(), set: vi.fn() },
  registerInstall: vi.fn(),
  requestAccessToken: vi.fn(),
}))

vi.mock("../store", () => ({ gandalfStore: mocks.store }))
vi.mock("../client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../client")>()),
  registerInstall: mocks.registerInstall,
  requestAccessToken: mocks.requestAccessToken,
}))
vi.mock("@common/log", () => ({ log: { debug: vi.fn(), error: vi.fn(), warn: vi.fn() } }))

const TTL_S = 300
const SECOND = 1000
const MINUTE = 60 * SECOND

type Deferred = { resolve: () => void }

let trueOffsetMs = 0
const trueNow = () => Date.now() + trueOffsetMs

let server: { latencyMs: number; failure: Error | null; hang: Deferred[] | null }
let minted: { token: string; expMs: number }[]
let sent: { token: string; atMs: number }[]

async function importFresh() {
  vi.resetModules()
  const observable = await import("../observable")
  const client = await import("../client")
  const { GandalfHandler } = await import("../handler")
  return { ...observable, GandalfRequestError: client.GandalfRequestError, GandalfHandler }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-10-28T00:00:00.000Z"))
  vi.clearAllMocks()
  trueOffsetMs = 0
  server = { latencyMs: 0, failure: null, hang: null }
  minted = []
  sent = []
  mocks.store.get.mockResolvedValue({ installId: "inst-1", privateKeyHex: "aabb" })
  mocks.requestAccessToken.mockImplementation(async () => {
    const issuedMs = trueNow()
    if (server.hang) await new Promise<void>((resolve) => server.hang?.push({ resolve }))
    if (server.latencyMs) await new Promise((resolve) => setTimeout(resolve, server.latencyMs))
    if (server.failure) throw server.failure
    const token = `jwt-${minted.length + 1}`
    minted.push({ token, expMs: Math.floor(issuedMs / SECOND) * SECOND + TTL_S * SECOND })
    return { accessToken: token, expiresIn: TTL_S }
  })
})

afterEach(() => {
  vi.useRealTimers()
})

const expOf = (token: string) => minted.find((mint) => mint.token === token)?.expMs ?? 0
const expired = () => sent.filter((send) => send.atMs >= expOf(send.token))
const mints = () => mocks.requestAccessToken.mock.calls.length

const read = (getAccessToken: () => Promise<string>) =>
  getAccessToken().then(
    (token) => {
      sent.push({ token, atMs: trueNow() })
      return token
    },
    (error: Error) => error
  )

async function readEverySecond(getAccessToken: () => Promise<string>, seconds: number) {
  const reads: Promise<string | Error>[] = []
  for (let second = 0; second < seconds; second++) {
    reads.push(read(getAccessToken))
    await vi.advanceTimersByTimeAsync(SECOND)
  }
  await vi.advanceTimersByTimeAsync(server.latencyMs)
  return Promise.all(reads)
}

describe("getAccessToken", () => {
  it("serves one fresh token per window to unheld reads at 1/s for 16 minutes", async () => {
    const { getAccessToken } = await importFresh()

    const results = await readEverySecond(getAccessToken, 16 * 60)

    expect(results.every((result) => typeof result === "string")).toBe(true)
    expect(sent).toHaveLength(960)
    expect(mints()).toBeLessThanOrEqual(5)
    expect(mints()).toBeGreaterThanOrEqual(4)
    expect(expired()).toEqual([])
  })

  it("counts freshness from request start when the mint takes 30 seconds", async () => {
    server.latencyMs = 30 * SECOND
    const { getAccessToken } = await importFresh()

    const results = await readEverySecond(getAccessToken, 16 * 60)

    expect(results.every((result) => typeof result === "string")).toBe(true)
    expect(mints()).toBeLessThanOrEqual(5)
    expect(expired()).toEqual([])
  })

  it("joins concurrent reads onto one mint", async () => {
    server.latencyMs = 2 * SECOND
    const { getAccessToken } = await importFresh()

    const reads = Array.from({ length: 10 }, () => read(getAccessToken))
    await vi.advanceTimersByTimeAsync(2 * SECOND)
    const tokens = await Promise.all(reads)

    expect(mints()).toBe(1)
    expect(new Set(tokens)).toEqual(new Set(["jwt-1"]))

    for (let batch = 0; batch < 48; batch++) {
      const batchReads = Array.from({ length: 10 }, () => read(getAccessToken))
      await vi.advanceTimersByTimeAsync(20 * SECOND)
      await Promise.all(batchReads)
    }
    expect(mints()).toBeLessThanOrEqual(5)
    expect(expired()).toEqual([])
  })

  it("mints again after an hour of sleep that paused the monotonic clock", async () => {
    const { getAccessToken } = await importFresh()

    await expect(read(getAccessToken)).resolves.toBe("jwt-1")
    await vi.advanceTimersByTimeAsync(100 * SECOND)
    vi.setSystemTime(Date.now() + 60 * MINUTE)

    await expect(read(getAccessToken)).resolves.toBe("jwt-2")
    await vi.advanceTimersByTimeAsync(100 * SECOND)
    await expect(read(getAccessToken)).resolves.toBe("jwt-2")
    expect(mints()).toBe(2)
    expect(expired()).toEqual([])
  })

  it("refreshes on time when the wall clock moves back 150 seconds", async () => {
    const { getAccessToken } = await importFresh()

    await readEverySecond(getAccessToken, 200)
    vi.setSystemTime(Date.now() - 150 * SECOND)
    trueOffsetMs += 150 * SECOND
    await readEverySecond(getAccessToken, 760)

    expect(sent).toHaveLength(960)
    expect(mints()).toBeLessThanOrEqual(5)
    expect(expired()).toEqual([])
  })

  it("refreshes on time when the wall clock moves back an hour", async () => {
    const { getAccessToken } = await importFresh()

    await readEverySecond(getAccessToken, 100)
    vi.setSystemTime(Date.now() - 60 * MINUTE)
    trueOffsetMs += 60 * MINUTE
    await readEverySecond(getAccessToken, 860)

    expect(sent).toHaveLength(960)
    expect(mints()).toBeLessThanOrEqual(5)
    expect(expired()).toEqual([])
  })

  it("keeps a one second reserve for Gandalf flooring exp to whole seconds", async () => {
    vi.setSystemTime(new Date("2026-10-28T00:00:00.900Z"))
    const { getAccessToken } = await importFresh()

    await expect(read(getAccessToken)).resolves.toBe("jwt-1")
    expect(expOf("jwt-1") - Date.now()).toBe(299_100)

    await vi.advanceTimersByTimeAsync(238_900)
    await expect(read(getAccessToken)).resolves.toBe("jwt-1")

    await vi.advanceTimersByTimeAsync(SECOND)
    await expect(read(getAccessToken)).resolves.toBe("jwt-2")
    expect(sent[1].atMs + 59_900).toBeLessThan(expOf("jwt-1"))
  })

  it("returns a different token to reads five minutes apart", async () => {
    const { getAccessToken } = await importFresh()

    await expect(read(getAccessToken)).resolves.toBe("jwt-1")
    await vi.advanceTimersByTimeAsync(5 * MINUTE)
    await expect(read(getAccessToken)).resolves.toBe("jwt-2")
    expect(expired()).toEqual([])
  })

  it.each([
    { status: 401, retryAfter: undefined, attempts: 10 },
    { status: 403, retryAfter: undefined, attempts: 10 },
    { status: 429, retryAfter: 60, attempts: 5 },
    { status: 429, retryAfter: 5, attempts: 10 },
    { status: 503, retryAfter: undefined, attempts: 10 },
  ])(
    "makes one attempt per backoff window when /v1/token fails with $status (Retry-After $retryAfter)",
    async ({ status, retryAfter, attempts }) => {
      const { getAccessToken, GandalfRequestError } = await importFresh()
      server.failure = new GandalfRequestError(
        `Gandalf token request failed (${status})`,
        status,
        retryAfter
      )

      const results = await readEverySecond(getAccessToken, 5 * 60)

      expect(results.every((result) => result === server.failure)).toBe(true)
      expect(mints()).toBe(attempts)

      server.failure = null
      await vi.advanceTimersByTimeAsync(60 * SECOND)
      await expect(read(getAccessToken)).resolves.toBe("jwt-1")
      await expect(read(getAccessToken)).resolves.toBe("jwt-1")
      expect(mints()).toBe(attempts + 1)
    }
  )

  it("backs off after a registration failure", async () => {
    mocks.store.get.mockResolvedValue({ installId: null, privateKeyHex: null })
    const { getAccessToken, GandalfRequestError } = await importFresh()
    const failure = new GandalfRequestError("Gandalf registration failed (500)", 500)
    mocks.registerInstall.mockRejectedValue(failure)

    await readEverySecond(getAccessToken, 29)

    expect(mocks.registerInstall).toHaveBeenCalledTimes(1)
    expect(mints()).toBe(0)
  })

  it("keeps one request in flight while callers give up their 10 second wait", async () => {
    server.hang = []
    const { getAccessToken } = await importFresh()
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("ok"))
    vi.stubGlobal("fetch", fetchMock)
    const gandalfFetch = createGandalfFetch(getAccessToken)

    const requests: Promise<Response>[] = []
    for (let i = 0; i < 6; i++) {
      requests.push(gandalfFetch("https://api.example/resource"))
      await vi.advanceTimersByTimeAsync(10 * SECOND)
    }
    await Promise.all(requests)

    expect(mints()).toBe(1)
    expect(fetchMock).toHaveBeenCalledTimes(6)
    for (const [, init] of fetchMock.mock.calls)
      expect(new Headers(init?.headers).has("Authorization")).toBe(false)

    const hang = server.hang
    server.hang = null
    for (const { resolve } of hang) resolve()
    await vi.advanceTimersByTimeAsync(0)

    await gandalfFetch("https://api.example/resource")
    expect(mints()).toBe(1)
    const [, init] = fetchMock.mock.calls[6]
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer jwt-1")
    vi.unstubAllGlobals()
  })

  it("treats a reply that is stale on arrival as a failure", async () => {
    server.hang = []
    const { getAccessToken } = await importFresh()

    const first = read(getAccessToken)
    await vi.advanceTimersByTimeAsync(250 * SECOND)
    const hang = server.hang
    server.hang = null
    for (const { resolve } of hang) resolve()
    await expect(first).resolves.toBeInstanceOf(Error)

    await expect(read(getAccessToken)).resolves.toBeInstanceOf(Error)
    expect(mints()).toBe(1)
    await vi.advanceTimersByTimeAsync(30 * SECOND)
    await expect(read(getAccessToken)).resolves.toBe("jwt-2")
    expect(sent).toHaveLength(1)
  })

  it("shares one acquisition and one backoff between the background and the UI", async () => {
    server.latencyMs = SECOND
    const { getAccessToken, GandalfHandler, GandalfRequestError } = await importFresh()
    const handler = new GandalfHandler({} as ExtensionStore)
    const uiRead = () =>
      handler.handle("1", "pri(gandalf.accessToken.get)", null, {} as chrome.runtime.Port)

    const ui = uiRead()
    const background = getAccessToken()
    await vi.advanceTimersByTimeAsync(SECOND)
    expect(await Promise.all([ui, background])).toEqual(["jwt-1", "jwt-1"])
    expect(mints()).toBe(1)

    await vi.advanceTimersByTimeAsync(5 * MINUTE)
    server.failure = new GandalfRequestError("Gandalf token request failed (503)", 503)
    const failedUi = uiRead().catch((error: unknown) => error)
    await vi.advanceTimersByTimeAsync(SECOND)
    await expect(failedUi).resolves.toBe(server.failure)
    await expect(getAccessToken()).rejects.toBe(server.failure)
    await expect(uiRead()).rejects.toBe(server.failure)
    expect(mints()).toBe(2)
  })

  it("feeds the LI.FI authorization hook", async () => {
    const { getAccessToken, GandalfRequestError } = await importFresh()
    const getAuthorization = createGandalfAuthorization(getAccessToken)

    await expect(getAuthorization()).resolves.toBe("Bearer jwt-1")

    await vi.advanceTimersByTimeAsync(5 * MINUTE)
    server.failure = new GandalfRequestError("Gandalf token request failed (401)", 401)
    await expect(getAuthorization()).resolves.toBeUndefined()
    await expect(getAuthorization()).resolves.toBeUndefined()
    expect(mints()).toBe(2)
  })
})

describe("registration", () => {
  it("registers when no credentials are stored and reports the proof of work", async () => {
    mocks.store.get.mockResolvedValue({ installId: null, privateKeyHex: null })
    mocks.registerInstall.mockResolvedValue({
      installId: "new-inst",
      privateKeyHex: "ccdd",
      proofOfWork: { durationMs: 1234, difficulty: 18 },
    })
    const { getAccessToken, proofOfWorkSolves$ } = await importFresh()
    const solves: unknown[] = []
    proofOfWorkSolves$.subscribe((solve) => solves.push(solve))

    await expect(getAccessToken()).resolves.toBe("jwt-1")

    expect(mocks.registerInstall).toHaveBeenCalledTimes(1)
    expect(mocks.store.set).toHaveBeenCalledWith({ installId: "new-inst", privateKeyHex: "ccdd" })
    expect(mocks.requestAccessToken).toHaveBeenCalledWith("new-inst", "ccdd")
    expect(solves).toEqual([{ durationMs: 1234, difficulty: 18 }])
  })

  it("keeps credentials that appeared while registration was in flight", async () => {
    mocks.store.get
      .mockResolvedValueOnce({ installId: null, privateKeyHex: null })
      .mockResolvedValueOnce({ installId: "seeded-inst", privateKeyHex: "1122" })
    mocks.registerInstall.mockResolvedValue({
      installId: "new-inst",
      privateKeyHex: "ccdd",
      proofOfWork: { durationMs: 1, difficulty: 1 },
    })
    const { getAccessToken } = await importFresh()

    await expect(getAccessToken()).resolves.toBe("jwt-1")

    expect(mocks.store.set).not.toHaveBeenCalled()
    expect(mocks.requestAccessToken).toHaveBeenCalledWith("seeded-inst", "1122")
  })

  it("does not register when credentials exist", async () => {
    const { getAccessToken } = await importFresh()

    await expect(getAccessToken()).resolves.toBe("jwt-1")

    expect(mocks.registerInstall).not.toHaveBeenCalled()
  })
})
