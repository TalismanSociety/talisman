import { createGandalfAuthorization } from "@common/createGandalfFetch"
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest"

const mocks = vi.hoisted(() => ({ getAccessToken: vi.fn<() => Promise<string>>() }))

vi.mock("../accessToken", () => ({ getAccessToken: mocks.getAccessToken }))
vi.mock("@common/log", () => ({ log: { debug: vi.fn(), error: vi.fn(), warn: vi.fn() } }))

let fetchSpy: Mock<typeof fetch>

beforeEach(() => {
  vi.useFakeTimers()
  mocks.getAccessToken.mockReset()
  fetchSpy = vi.fn<typeof fetch>().mockResolvedValue(new Response("ok", { status: 200 }))
  vi.stubGlobal("fetch", fetchSpy)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

const headersOf = (call: number) => new Headers(fetchSpy.mock.calls[call][1]?.headers)

describe("gandalfFetch", () => {
  it("injects the Authorization header when a token is available", async () => {
    mocks.getAccessToken.mockResolvedValue("jwt-test-token")
    const { gandalfFetch } = await import("../fetch")

    await gandalfFetch("https://api.example.com/data", { method: "GET" })

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(fetchSpy.mock.calls[0][0]).toBe("https://api.example.com/data")
    expect(headersOf(0).get("Authorization")).toBe("Bearer jwt-test-token")
  })

  it("falls back to an unauthenticated fetch when the token fails", async () => {
    mocks.getAccessToken.mockRejectedValue(new Error("token failed"))
    const { gandalfFetch } = await import("../fetch")

    await gandalfFetch("https://api.example.com/data")

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(headersOf(0).has("Authorization")).toBe(false)
  })

  it("gives up on its own after 10 seconds without aborting the acquisition", async () => {
    let settle = () => {}
    mocks.getAccessToken.mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          settle = () => resolve("jwt-late")
        })
    )
    const { gandalfFetch } = await import("../fetch")

    const request = gandalfFetch("https://api.example.com/data")
    await vi.advanceTimersByTimeAsync(9_999)
    expect(fetchSpy).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    await request

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(headersOf(0).has("Authorization")).toBe(false)
    expect(mocks.getAccessToken).toHaveBeenCalledTimes(1)

    settle()
    mocks.getAccessToken.mockResolvedValue("jwt-late")
    await gandalfFetch("https://api.example.com/data")
    expect(headersOf(1).get("Authorization")).toBe("Bearer jwt-late")
  })

  it("preserves existing headers from the caller", async () => {
    mocks.getAccessToken.mockResolvedValue("jwt-abc")
    const { gandalfFetch } = await import("../fetch")

    await gandalfFetch("https://api.example.com", { headers: { "X-Custom": "value" } })

    expect(headersOf(0).get("X-Custom")).toBe("value")
    expect(headersOf(0).get("Authorization")).toBe("Bearer jwt-abc")
  })

  it("keeps the headers of a Request input when there is no init", async () => {
    mocks.getAccessToken.mockResolvedValue("jwt-req")
    const { gandalfFetch } = await import("../fetch")

    const request = new Request("https://api.example.com/exchanges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    })
    await gandalfFetch(request)

    expect(fetchSpy.mock.calls[0][0]).toBe(request)
    expect(headersOf(0).get("Content-Type")).toBe("application/json")
    expect(headersOf(0).get("Authorization")).toBe("Bearer jwt-req")
  })
})

describe("createGandalfAuthorization", () => {
  it("resolves to the Bearer header value", async () => {
    mocks.getAccessToken.mockResolvedValue("jwt-auth")

    await expect(createGandalfAuthorization(mocks.getAccessToken)()).resolves.toBe(
      "Bearer jwt-auth"
    )
  })

  it("resolves to undefined when the token fails", async () => {
    mocks.getAccessToken.mockRejectedValue(new Error("token failed"))

    await expect(createGandalfAuthorization(mocks.getAccessToken)()).resolves.toBeUndefined()
  })
})
