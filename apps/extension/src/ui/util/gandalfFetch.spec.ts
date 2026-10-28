import { afterEach, beforeEach, expect, it, type Mock, vi } from "vitest"

const mocks = vi.hoisted(() => ({ gandalfAccessToken: vi.fn<() => Promise<string>>() }))

vi.mock("@ui/api", () => ({ api: { gandalfAccessToken: mocks.gandalfAccessToken } }))

let fetchSpy: Mock<typeof fetch>
let reply: (token: string) => void

beforeEach(() => {
  vi.useFakeTimers()
  mocks.gandalfAccessToken.mockReset().mockImplementation(
    () =>
      new Promise<string>((resolve) => {
        reply = resolve
      })
  )
  fetchSpy = vi.fn<typeof fetch>().mockResolvedValue(new Response("ok"))
  vi.stubGlobal("fetch", fetchSpy)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

const authorizationSent = () => new Headers(fetchSpy.mock.calls[0][1]?.headers).get("Authorization")

async function fetchWithReplyAfter(wallDelayMs: number, monoDelayMs = 0) {
  const { gandalfFetch } = await import("./gandalfFetch")
  const request = gandalfFetch("https://api.example.com/data")
  await vi.advanceTimersByTimeAsync(monoDelayMs)
  vi.setSystemTime(Date.now() + wallDelayMs)
  reply("jwt-ui")
  await request
}

it("sends the token when the background replies promptly", async () => {
  await fetchWithReplyAfter(200, 200)
  expect(authorizationSent()).toBe("Bearer jwt-ui")
})

it("sends the token when a suspended page gets its reply just under a minute late", async () => {
  await fetchWithReplyAfter(59_900)
  expect(authorizationSent()).toBe("Bearer jwt-ui")
})

it("discards a token whose reply took a minute or more to arrive", async () => {
  await fetchWithReplyAfter(60_000)
  expect(fetchSpy).toHaveBeenCalledTimes(1)
  expect(authorizationSent()).toBeNull()
  expect(mocks.gandalfAccessToken).toHaveBeenCalledTimes(1)
})

it("exposes the authorization hook for the LI.FI SDK", async () => {
  const { getGandalfAuthorization } = await import("./gandalfFetch")
  const authorization = getGandalfAuthorization()
  reply("jwt-lifi")
  await expect(authorization).resolves.toBe("Bearer jwt-lifi")
})
