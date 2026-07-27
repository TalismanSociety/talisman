import { firstValueFrom, take, toArray } from "rxjs"
import { afterEach, beforeEach, vi } from "vitest"

// ── Module mocks ────────────────────────────────────────────────────────────

const mockGandalfStore = {
  get: vi.fn(),
  set: vi.fn(),
}

const mockRegisterInstall = vi.fn()
const mockRequestAccessToken = vi.fn()

vi.mock("../store", () => ({
  gandalfStore: mockGandalfStore,
}))

vi.mock("../client", () => ({
  registerInstall: (...args: unknown[]) => mockRegisterInstall(...args),
  requestAccessToken: (...args: unknown[]) => mockRequestAccessToken(...args),
}))

vi.mock("@common/log", () => ({
  log: { debug: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

// ── Tests ───────────────────────────────────────────────────────────────────

describe("gandalfAccessToken$", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.resetModules()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  async function importFresh() {
    // Dynamic import so each test gets a fresh module with fresh cache
    return await import("../observable")
  }

  it("emits loading first, then a success token on first subscription", async () => {
    mockGandalfStore.get.mockResolvedValue({
      installId: "inst-1",
      privateKeyHex: "aabb",
    })
    mockRequestAccessToken.mockResolvedValue({
      accessToken: "jwt-token-abc",
      expiresIn: 300,
    })

    const { gandalfAccessToken$ } = await importFresh()

    const resultPromise = firstValueFrom(
      gandalfAccessToken$.pipe(
        take(2), // loading + success
        toArray()
      )
    )

    // Advance timer to trigger the first tick (timer(0, ...))
    await vi.advanceTimersByTimeAsync(0)

    const result = await resultPromise

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ status: "loading" })
    expect(result[1]).toEqual({ status: "success", data: "jwt-token-abc" })
  })

  it("calls registerInstall when no stored credentials", async () => {
    mockGandalfStore.get.mockResolvedValue({
      installId: null,
      privateKeyHex: null,
    })
    mockRegisterInstall.mockResolvedValue({
      installId: "new-inst",
      privateKeyHex: "ccdd",
    })
    mockGandalfStore.set.mockResolvedValue(undefined)
    mockRequestAccessToken.mockResolvedValue({
      accessToken: "jwt-new",
      expiresIn: 300,
    })

    const { gandalfAccessToken$ } = await importFresh()

    const resultPromise = firstValueFrom(
      gandalfAccessToken$.pipe(
        take(2), // loading + success
        toArray()
      )
    )

    await vi.advanceTimersByTimeAsync(0)
    const result = await resultPromise

    expect(mockRegisterInstall).toHaveBeenCalledTimes(1)
    expect(mockGandalfStore.set).toHaveBeenCalledWith({
      installId: "new-inst",
      privateKeyHex: "ccdd",
    })
    expect(result[1]).toEqual({ status: "success", data: "jwt-new" })
  })

  it("keeps credentials that appeared while registration was in flight", async () => {
    mockGandalfStore.get
      .mockResolvedValueOnce({ installId: null, privateKeyHex: null })
      .mockResolvedValueOnce({ installId: "seeded-inst", privateKeyHex: "1122" })
    mockRegisterInstall.mockResolvedValue({
      installId: "new-inst",
      privateKeyHex: "ccdd",
    })
    mockRequestAccessToken.mockResolvedValue({
      accessToken: "jwt-seeded",
      expiresIn: 300,
    })

    const { gandalfAccessToken$ } = await importFresh()

    const resultPromise = firstValueFrom(gandalfAccessToken$.pipe(take(2), toArray()))

    await vi.advanceTimersByTimeAsync(0)
    const result = await resultPromise

    expect(mockGandalfStore.set).not.toHaveBeenCalled()
    expect(mockRequestAccessToken).toHaveBeenCalledWith("seeded-inst", "1122", expect.anything())
    expect(result[1]).toEqual({ status: "success", data: "jwt-seeded" })
  })

  it("emits error status when requestAccessToken fails", async () => {
    mockGandalfStore.get.mockResolvedValue({
      installId: "inst-1",
      privateKeyHex: "aabb",
    })
    mockRequestAccessToken.mockRejectedValue(new Error("network down"))

    const { gandalfAccessToken$ } = await importFresh()

    const resultPromise = firstValueFrom(
      gandalfAccessToken$.pipe(
        take(2), // loading + error
        toArray()
      )
    )

    await vi.advanceTimersByTimeAsync(0)
    const result = await resultPromise

    expect(result[0]).toEqual({ status: "loading" })
    expect(result[1]).toMatchObject({
      status: "error",
      error: { message: "network down" },
    })
  })

  it("does not call registerInstall when credentials exist", async () => {
    mockGandalfStore.get.mockResolvedValue({
      installId: "existing-inst",
      privateKeyHex: "eeff",
    })
    mockRequestAccessToken.mockResolvedValue({
      accessToken: "jwt-existing",
      expiresIn: 300,
    })

    const { gandalfAccessToken$ } = await importFresh()

    const resultPromise = firstValueFrom(gandalfAccessToken$.pipe(take(2), toArray()))

    await vi.advanceTimersByTimeAsync(0)
    await resultPromise

    expect(mockRegisterInstall).not.toHaveBeenCalled()
  })
})
