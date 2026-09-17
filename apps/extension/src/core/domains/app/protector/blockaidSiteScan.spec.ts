import { BehaviorSubject } from "rxjs"
import { afterEach, beforeEach, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  blobs: new Map<string, unknown>(),
  get: vi.fn(),
  set: vi.fn(),
  fetch: vi.fn<typeof fetch>(),
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
    isMalicious: false,
    ...changes,
  })
const flush = () => vi.advanceTimersByTimeAsync(0)
let scans: typeof import("./blockaidSiteScan")
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
  vi.spyOn(chrome.storage.local, "set")
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
  scans = await import("./blockaidSiteScan")
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

async function restart() {
  protector.dispose()
  config$.complete()
  settings$.complete()
  vi.resetModules()
  config$ = new BehaviorSubject<{ featureFlags: { BLOCKAID_DAPP_SCAN: boolean } }>({
    featureFlags: { BLOCKAID_DAPP_SCAN: true },
  })
  settings$ = new BehaviorSubject<{ autoRiskScan?: boolean }>({ autoRiskScan: true })
  scans = await import("./blockaidSiteScan")
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
  mocks.fetch.mockImplementation(async () => response({ isMalicious: true }))
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
  ["missing fields", () => Promise.resolve(Response.json({}))],
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

it("pauses scans after a 429", async () => {
  mocks.fetch.mockResolvedValue(new Response(null, { status: 429 }))
  await scan()
  await scan("https://another.example")
  expect(mocks.fetch).toHaveBeenCalledTimes(1)
})

it("redirects once and keeps the verdict for one minute", async () => {
  mocks.fetch.mockImplementation(async () => response({ isMalicious: true }))
  await scan()
  await scan()
  expect(redirect).toHaveBeenCalledExactlyOnceWith("https://dapp.example")
  expect(scans.isBlockaidMalicious("dapp.example")).toBe(true)
  vi.setSystemTime(Date.now() + 59_999)
  expect(scans.isBlockaidMalicious("dapp.example")).toBe(true)
  vi.setSystemTime(Date.now() + 1)
  expect(scans.isBlockaidMalicious("dapp.example")).toBe(false)
  await scan()
  expect(mocks.fetch).toHaveBeenCalledTimes(2)
})

it("keeps verdicts only in memory", async () => {
  mocks.fetch.mockImplementation(async () => response({ isMalicious: true }))
  await scan()
  expect(scans.isBlockaidMalicious("dapp.example")).toBe(true)
  expect(mocks.set).not.toHaveBeenCalled()
  expect(chrome.storage.local.set).not.toHaveBeenCalled()
  await restart()
  expect(scans.isBlockaidMalicious("dapp.example")).toBe(false)
  await scan()
  expect(mocks.fetch).toHaveBeenCalledTimes(2)
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

it("allows a rescan after the one minute failure cache expires", async () => {
  mocks.fetch.mockRejectedValueOnce(new Error("offline"))
  await scan()
  await scan()
  expect(mocks.fetch).toHaveBeenCalledTimes(1)
  vi.setSystemTime(Date.now() + 60_000)
  await scan()
  expect(mocks.fetch).toHaveBeenCalledTimes(2)
})
