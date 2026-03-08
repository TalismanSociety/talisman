import type { Loadable } from "@talismn/util"
import { BehaviorSubject } from "rxjs"
import { afterEach, beforeEach, vi } from "vitest"

// ── Module mocks ────────────────────────────────────────────────────────────

const mockAccessToken$ = new BehaviorSubject<Loadable<string>>({
  status: "loading",
})

vi.mock("../observable", () => ({
  gandalfAccessToken$: mockAccessToken$,
}))

vi.mock("@common/log", () => ({
  log: { debug: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

// We need to grab real fetch to spy on it
const realFetch = globalThis.fetch
let fetchSpy: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchSpy = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }))
  globalThis.fetch = fetchSpy
})

afterEach(() => {
  globalThis.fetch = realFetch
  mockAccessToken$.next({ status: "loading" })
})

// ── Tests ───────────────────────────────────────────────────────────────────

describe("gandalfFetch", () => {
  it("injects Authorization header when token is available", async () => {
    // Emit a success token right away
    mockAccessToken$.next({ status: "success", data: "jwt-test-token" })

    const { gandalfFetch } = await import("../fetch")

    await gandalfFetch("https://api.example.com/data", { method: "GET" })

    expect(fetchSpy).toHaveBeenCalledTimes(1)

    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe("https://api.example.com/data")

    const headers = new Headers(init?.headers)
    expect(headers.get("Authorization")).toBe("Bearer jwt-test-token")
  })

  it("falls back to unauthenticated fetch when token fails", async () => {
    // Emit an error state
    mockAccessToken$.next({
      status: "error",
      error: { name: "Error", message: "token failed" },
    } as Loadable<string>)

    const { gandalfFetch } = await import("../fetch")

    await gandalfFetch("https://api.example.com/data")

    expect(fetchSpy).toHaveBeenCalledTimes(1)

    const [, init] = fetchSpy.mock.calls[0]
    // Should NOT have Authorization header
    const headers = init?.headers ? new Headers(init.headers) : new Headers()
    expect(headers.has("Authorization")).toBe(false)
  })

  it("preserves existing headers from the caller", async () => {
    mockAccessToken$.next({ status: "success", data: "jwt-abc" })

    const { gandalfFetch } = await import("../fetch")

    await gandalfFetch("https://api.example.com", {
      headers: { "X-Custom": "value" },
    })

    const [, init] = fetchSpy.mock.calls[0]
    const headers = new Headers(init?.headers)
    expect(headers.get("X-Custom")).toBe("value")
    expect(headers.get("Authorization")).toBe("Bearer jwt-abc")
  })
})
