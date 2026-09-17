import { BehaviorSubject } from "rxjs"
import { afterEach, beforeEach, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  blobs: new Map<string, unknown>(),
  get: vi.fn(),
  set: vi.fn(),
  fetch: vi.fn<typeof fetch>(),
  budget: new Map<string, unknown>(),
  getBudget: vi.fn(),
  setBudget: vi.fn(),
}))
let config$ = new BehaviorSubject<{ featureFlags: { BLOCKAID_DAPP_SCAN: boolean } }>({
  featureFlags: { BLOCKAID_DAPP_SCAN: true },
})
let settings$ = new BehaviorSubject<{ autoRiskScan?: boolean }>({ autoRiskScan: true })
let token$ = new BehaviorSubject({ status: "success", data: "test-token" })

vi.mock("../../../db/blobs", () => ({
  getBlobStore: (id: string) => ({
    get: () => mocks.get(id),
    set: (data: unknown) => mocks.set(id, data),
  }),
}))
vi.mock("../store.remoteConfig", () => ({
  remoteConfigStore: {
    get observable() {
      return config$
    },
  },
}))
vi.mock("../store.settings", () => ({
  settingsStore: {
    get observable() {
      return settings$
    },
  },
}))
vi.mock("../../gandalf/observable", () => ({
  get gandalfAccessToken$() {
    return token$
  },
}))

const response = (changes = {}) =>
  Response.json({
    status: "hit",
    isMalicious: false,
    ttlSeconds: 86_400,
    ...changes,
  })
const flush = () => vi.advanceTimersByTimeAsync(0)
let scans: typeof import("./blockaidSiteVerdicts")
let protector: typeof import("./ParaverseProtector")
let getPhishingSource: typeof import("./phishingSource").getPhishingSource
let redirect = vi.fn()

beforeEach(async () => {
  vi.resetModules()
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-09-17T00:00:00Z"))
  config$ = new BehaviorSubject<{ featureFlags: { BLOCKAID_DAPP_SCAN: boolean } }>({
    featureFlags: { BLOCKAID_DAPP_SCAN: true },
  })
  settings$ = new BehaviorSubject<{ autoRiskScan?: boolean }>({ autoRiskScan: true })
  token$ = new BehaviorSubject({ status: "success", data: "test-token" })
  mocks.budget.clear()
  mocks.getBudget
    .mockReset()
    .mockImplementation(async (id: string) => ({ [id]: structuredClone(mocks.budget.get(id)) }))
  mocks.setBudget.mockReset().mockImplementation(async (data: Record<string, unknown>) => {
    for (const [id, value] of Object.entries(data)) mocks.budget.set(id, structuredClone(value))
  })
  vi.spyOn(chrome.storage.local, "get").mockImplementation(mocks.getBudget)
  vi.spyOn(chrome.storage.local, "set").mockImplementation(mocks.setBudget)
  mocks.blobs.clear()
  mocks.blobs.set("phishing-metamask", {
    etag: "",
    data: {
      allowlist: [],
      blocklist: ["denied.example"],
      blocklistPaths: ["shared.example/phish", "shared.example/other-phish"],
      fuzzylist: [],
      tolerance: 0,
      version: 1,
    },
  })
  mocks.get
    .mockReset()
    .mockImplementation(async (id) => structuredClone(mocks.blobs.get(id) ?? null))
  mocks.set.mockReset().mockImplementation(async (id, data) => {
    mocks.blobs.set(id, structuredClone(data))
  })
  mocks.fetch.mockReset().mockImplementation(async () => response())
  vi.stubGlobal("fetch", mocks.fetch)
  scans = await import("./blockaidSiteVerdicts")
  protector = await import("./ParaverseProtector")
  ;({ getPhishingSource } = await import("./phishingSource"))
  redirect = vi.fn()
  scans.maliciousOrigin$.subscribe(redirect)
  await protector.isPhishingSite("https://initial.example")
  protector.dispose()
})

afterEach(() => {
  protector.dispose()
  config$.complete()
  settings$.complete()
  token$.complete()
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const isFlagged = async (url: string) => (await getPhishingSource(url)) !== undefined

async function scan(url = "https://dapp.example/path?private=value") {
  expect(scans.requestSiteScan(url)).toBeUndefined()
  await flush()
}

function persistedBudget() {
  return mocks.budget.get("blockaidSiteScanBudget") as {
    day: string
    count: number
    recent: number[]
  }
}

async function restart() {
  protector.dispose()
  config$.complete()
  settings$.complete()
  vi.resetModules()
  config$ = new BehaviorSubject<{ featureFlags: { BLOCKAID_DAPP_SCAN: boolean } }>({
    featureFlags: { BLOCKAID_DAPP_SCAN: true },
  })
  settings$ = new BehaviorSubject<{ autoRiskScan?: boolean }>({ autoRiskScan: true })
  scans = await import("./blockaidSiteVerdicts")
  protector = await import("./ParaverseProtector")
  ;({ getPhishingSource } = await import("./phishingSource"))
  scans.maliciousOrigin$.subscribe(redirect)
}

it("keeps the hot path free of Blockaid requests", async () => {
  expect(await getPhishingSource("https://unknown.example")).toBeUndefined()
  expect(mocks.fetch).not.toHaveBeenCalled()
})

it("reports which source flagged a site", async () => {
  mocks.fetch.mockImplementation(async () => response({ isMalicious: true }))
  await scan()
  expect(await getPhishingSource("https://dapp.example")).toBe("blockaid")
  expect(await getPhishingSource("https://denied.example")).toBe("lists")
})

it("honours malicious verdicts, expiry and proceed anyway", async () => {
  mocks.fetch.mockImplementation(async () => response({ isMalicious: true, ttlSeconds: 60 }))
  await scan()
  expect(await isFlagged("https://dapp.example/other")).toBe(true)
  expect(protector.addException("https://dapp.example/other")).toBe(true)
  expect(await isFlagged("https://dapp.example/other")).toBe(false)
  protector.dispose()
  vi.setSystemTime(Date.now() + 60_000)
  expect(await isFlagged("https://dapp.example")).toBe(false)
})

it.each(["cached", "pending", "absent"])(
  "honours a path exception with a %s Blockaid verdict without allowing other static paths",
  async (verdictState) => {
    const sharedOrigin = "https://shared.example"
    const exceptedUrl = `${sharedOrigin}/phish`
    expect(await isFlagged(exceptedUrl)).toBe(true)
    expect(await isFlagged(`${sharedOrigin}/legit`)).toBe(false)
    mocks.fetch.mockImplementation(async () => response({ isMalicious: true }))
    let resolveScan: ((response: Response) => void) | undefined
    if (verdictState === "pending") {
      mocks.fetch.mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveScan = resolve
          })
      )
    }
    if (verdictState !== "absent") await scan(`${sharedOrigin}/legit`)
    if (verdictState === "cached") expect(scans.isBlockaidMalicious("shared.example")).toBe(true)
    redirect.mockClear()

    expect(protector.addException(exceptedUrl)).toBe(true)
    resolveScan?.(response({ isMalicious: true }))
    await flush()
    expect(await isFlagged(exceptedUrl)).toBe(false)
    expect(await isFlagged(`${sharedOrigin}/legit`)).toBe(false)
    expect(await isFlagged(`${sharedOrigin}/other-phish`)).toBe(true)
    expect(scans.isBlockaidMalicious("shared.example")).toBe(false)
    expect(redirect).not.toHaveBeenCalled()

    vi.setSystemTime(Date.now() + 60_000)
    await scan(exceptedUrl)
    await scan(`${sharedOrigin}/legit`)
    expect(mocks.fetch).toHaveBeenCalledTimes(verdictState === "absent" ? 0 : 1)
  }
)

it("deduplicates 100 concurrent triggers and later triggers within the TTL", async () => {
  for (let i = 0; i < 100; i++) scans.requestSiteScan(`https://dapp.example/${i}`)
  await flush()
  expect(mocks.fetch).toHaveBeenCalledTimes(1)
  await scan()
  expect(mocks.fetch).toHaveBeenCalledTimes(1)
  const [, init] = mocks.fetch.mock.calls[0]
  expect(JSON.parse(String(init?.body))).toEqual({ url: "https://dapp.example" })
  expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer test-token")
})

it("runs different hosts concurrently without a network queue", async () => {
  mocks.fetch.mockImplementation(() => new Promise(() => {}))
  for (let i = 0; i < 10; i++) scans.requestSiteScan(`https://dapp${i}.example`)
  await flush()
  expect(mocks.fetch).toHaveBeenCalledTimes(10)
  await vi.advanceTimersByTimeAsync(8_000)
})

it("caps 100 different hosts at ten calls per rolling minute and 100 per UTC day across restarts", async () => {
  for (let minute = 0; minute < 10; minute++) {
    for (let i = 0; i < 100; i++) scans.requestSiteScan(`https://dapp${minute}-${i}.example`)
    await flush()
    expect(mocks.fetch).toHaveBeenCalledTimes((minute + 1) * 10)
    await vi.advanceTimersByTimeAsync(60_000)
  }
  expect(persistedBudget().count).toBe(100)
  await restart()
  await scan("https://over-budget.example")
  expect(mocks.fetch).toHaveBeenCalledTimes(100)
  vi.setSystemTime(new Date("2026-09-18T00:00:00Z"))
  await scan("https://next-day.example")
  expect(mocks.fetch).toHaveBeenCalledTimes(101)
})

it("persists reservations before fetch and preserves the rolling minute across restart", async () => {
  mocks.fetch.mockImplementation(async () => {
    expect(persistedBudget().count).toBeGreaterThan(0)
    return response()
  })
  for (let i = 0; i < 10; i++) await scan(`https://host${i}.example`)
  await restart()
  await scan("https://eleventh.example")
  expect(mocks.fetch).toHaveBeenCalledTimes(10)
  vi.setSystemTime(Date.now() + 60_000)
  await scan("https://eleventh.example")
  expect(mocks.fetch).toHaveBeenCalledTimes(11)
})

it("skips network if a budget reservation cannot be persisted", async () => {
  mocks.setBudget.mockRejectedValue(new Error("disk unavailable"))
  await scan()
  expect(mocks.fetch).not.toHaveBeenCalled()
})

it.each([false, undefined])("does not scan when autoRiskScan is %s", async (autoRiskScan) => {
  settings$.next({ autoRiskScan })
  await scan()
  expect(mocks.fetch).not.toHaveBeenCalled()
})

it("does not scan with the feature flag off", async () => {
  config$.next({ featureFlags: { BLOCKAID_DAPP_SCAN: false } })
  await scan()
  expect(mocks.fetch).not.toHaveBeenCalled()
})

it.each(["flag", "setting"])(
  "stops blocking immediately when the %s goes off",
  async (switchName) => {
    mocks.fetch.mockImplementation(async () => response({ isMalicious: true }))
    await scan()
    expect(scans.isBlockaidMalicious("dapp.example")).toBe(true)
    if (switchName === "flag") config$.next({ featureFlags: { BLOCKAID_DAPP_SCAN: false } })
    else settings$.next({ autoRiskScan: false })
    expect(scans.isBlockaidMalicious("dapp.example")).toBe(false)
    expect(await isFlagged("https://dapp.example")).toBe(false)
  }
)

it.each([
  "http://localhost:3000",
  "http://127.0.0.1",
  "http://[::1]",
  "http://intranet",
  "https://foo.local",
  "https://foo.test",
  "https://foo.local.",
  "chrome-extension://abc/test",
  "https://app.talisman.xyz",
  "https://talisman.xyz",
  "https://excepted.example",
  "invalid",
])("filters %s without a fetch", async (url) => {
  await protector.isPhishingSite("https://initial.example")
  protector.addException("https://excepted.example")
  await scan(url)
  expect(mocks.fetch).not.toHaveBeenCalled()
})

const failures = [
  ["401", () => Promise.resolve(new Response(null, { status: 401 }))],
  ["429", () => Promise.resolve(new Response(null, { status: 429 }))],
  ["500", () => Promise.resolve(new Response(null, { status: 500 }))],
  ["offline", () => Promise.reject(new Error("offline"))],
  [
    "synchronous throw",
    () => {
      throw new Error("fetch threw")
    },
  ],
  ["malformed JSON", () => Promise.resolve(new Response("{"))],
  ["wrong boolean", () => Promise.resolve(response({ isMalicious: "yes" }))],
  ["inconsistent status", () => Promise.resolve(response({ status: "miss", isMalicious: true }))],
  ["missing fields", () => Promise.resolve(Response.json({ status: "hit", isMalicious: true }))],
  ["timeout", () => new Promise<Response>(() => {})],
] as const
it.each(failures)("fails open and negative-caches %s", async (_, fetchResponse) => {
  mocks.fetch.mockImplementation(fetchResponse)
  await scan()
  await vi.advanceTimersByTimeAsync(8_000)
  expect(redirect).not.toHaveBeenCalled()
  expect(await isFlagged("https://dapp.example")).toBe(false)
  await scan()
  expect(mocks.fetch).toHaveBeenCalledTimes(1)
})

it("includes the Gandalf token wait in the eight second deadline", async () => {
  token$.next({ status: "loading", data: "" })
  await scan()
  await vi.advanceTimersByTimeAsync(8_000)
  expect(mocks.fetch).not.toHaveBeenCalled()
  await scan()
  expect(mocks.fetch).not.toHaveBeenCalled()
  token$.next({ status: "success", data: "late-token" })
  await flush()
  expect(redirect).not.toHaveBeenCalled()
  expect(mocks.fetch).not.toHaveBeenCalled()
})

it("opens the breaker after three failures and reopens when the recovery scan fails", async () => {
  mocks.fetch.mockRejectedValue(new Error("offline"))
  for (let i = 0; i < 3; i++) await scan(`https://bad${i}.example`)
  await scan("https://new.example")
  expect(mocks.fetch).toHaveBeenCalledTimes(3)
  vi.setSystemTime(Date.now() + 599_999)
  await scan("https://new.example")
  expect(mocks.fetch).toHaveBeenCalledTimes(3)
  vi.setSystemTime(Date.now() + 1)
  await scan("https://new.example")
  expect(mocks.fetch).toHaveBeenCalledTimes(4)
  await scan("https://still-offline.example")
  expect(mocks.fetch).toHaveBeenCalledTimes(4)
})

it("opens the breaker immediately for a 429", async () => {
  mocks.fetch.mockResolvedValue(new Response(null, { status: 429 }))
  await scan()
  await scan("https://another.example")
  expect(mocks.fetch).toHaveBeenCalledTimes(1)
})

it("counts error responses as failures with the server TTL and resets failures after success", async () => {
  mocks.fetch.mockImplementation(async () => response({ status: "error", ttlSeconds: 5 }))
  await scan("https://error1.example")
  await scan("https://error2.example")
  mocks.fetch.mockImplementationOnce(async () => response({ status: "miss" }))
  await scan("https://success.example")
  await scan("https://error3.example")
  await scan("https://error4.example")
  await scan("https://error5.example")
  await scan("https://blocked.example")
  expect(mocks.fetch).toHaveBeenCalledTimes(6)
})

it.each([
  [5, 5],
  [10_000_000, 60],
])("caps TTL %s at %s seconds and redirects once", async (ttlSeconds, expected) => {
  mocks.fetch.mockImplementation(async () => response({ isMalicious: true, ttlSeconds }))
  await scan()
  await scan()
  expect(redirect).toHaveBeenCalledExactlyOnceWith("https://dapp.example")
  expect(scans.isBlockaidMalicious("dapp.example")).toBe(true)
  vi.setSystemTime(Date.now() + expected * 1_000)
  expect(scans.isBlockaidMalicious("dapp.example")).toBe(false)
  await scan()
  expect(mocks.fetch).toHaveBeenCalledTimes(2)
})

it("keeps verdicts only in memory, while retaining the budget on restart", async () => {
  mocks.fetch.mockImplementation(async () => response({ isMalicious: true }))
  await scan()
  expect(scans.isBlockaidMalicious("dapp.example")).toBe(true)
  await restart()
  expect(scans.isBlockaidMalicious("dapp.example")).toBe(false)
  await scan()
  expect(mocks.fetch).toHaveBeenCalledTimes(2)
  expect(persistedBudget().count).toBe(2)
  expect(mocks.set).not.toHaveBeenCalled()
  expect(
    mocks.setBudget.mock.calls.every(([data]) => !("verdicts" in data.blockaidSiteScanBudget))
  ).toBe(true)
})

it("does not redirect when the setting or a host exception changes during a scan", async () => {
  let resolve!: (response: Response) => void
  mocks.fetch.mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done
      })
  )
  await scan()
  settings$.next({ autoRiskScan: false })
  resolve(response({ isMalicious: true }))
  await flush()
  expect(redirect).not.toHaveBeenCalled()
  settings$.next({ autoRiskScan: true })
  await scan("https://other.example")
  protector.addException("https://other.example")
  resolve(response({ isMalicious: true }))
  await flush()
  expect(redirect).not.toHaveBeenCalled()
})

it("skips scans if the persisted budget cannot be read", async () => {
  mocks.getBudget.mockRejectedValue(new Error("storage unavailable"))
  await scan()
  expect(mocks.fetch).not.toHaveBeenCalled()
  expect(scans.isBlockaidMalicious("dapp.example")).toBe(false)
})

it("allows a rescan after the one minute failure cache expires", async () => {
  mocks.fetch.mockRejectedValueOnce(new Error("offline"))
  await scan()
  await scan()
  expect(mocks.fetch).toHaveBeenCalledTimes(1)
  vi.setSystemTime(Date.now() + 60_000)
  await scan()
  expect(mocks.fetch).toHaveBeenCalledTimes(2)
})
