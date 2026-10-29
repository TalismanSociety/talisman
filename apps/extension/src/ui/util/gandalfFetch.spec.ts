import { afterEach, beforeEach, expect, it, type Mock, vi } from "vitest"

const mocks = vi.hoisted(() => ({ gandalfAccessToken: vi.fn<() => Promise<string | null>>() }))

vi.mock("@ui/api", () => ({ api: { gandalfAccessToken: mocks.gandalfAccessToken } }))

let fetchSpy: Mock<typeof fetch>
let reply: (token: string | null) => void

beforeEach(() => {
  vi.useFakeTimers()
  mocks.gandalfAccessToken.mockReset().mockImplementation(
    () =>
      new Promise<string | null>((resolve) => {
        reply = resolve
      })
  )
  fetchSpy = vi.fn<typeof fetch>().mockResolvedValue(new Response("ok"))
  vi.stubGlobal("fetch", fetchSpy)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

const authorizationSent = () => new Headers(fetchSpy.mock.calls[0][1]?.headers).get("Authorization")

async function fetchWithReplyAfter({
  wallMs = 0,
  monoMs = 0,
}: {
  wallMs?: number
  monoMs?: number
}) {
  const { gandalfFetch } = await import("./gandalfFetch")
  const request = gandalfFetch("https://api.example.com/data")
  const monoBase = performance.now()
  vi.spyOn(performance, "now").mockReturnValue(monoBase + monoMs)
  vi.setSystemTime(Date.now() + wallMs)
  reply("jwt-ui")
  await request
}

const expectTokenDiscarded = () => {
  expect(fetchSpy).toHaveBeenCalledTimes(1)
  expect(authorizationSent()).toBeNull()
  expect(mocks.gandalfAccessToken).toHaveBeenCalledTimes(1)
}

it("sends the token when the background replies promptly", async () => {
  await fetchWithReplyAfter({ wallMs: 200, monoMs: 200 })
  expect(authorizationSent()).toBe("Bearer jwt-ui")
})

it("sends the token when a suspended page gets its reply just under a minute late", async () => {
  await fetchWithReplyAfter({ wallMs: 59_900 })
  expect(authorizationSent()).toBe("Bearer jwt-ui")
})

it("discards a token whose reply took a minute or more of wall time", async () => {
  await fetchWithReplyAfter({ wallMs: 60_000 })
  expectTokenDiscarded()
})

it("discards a token whose reply took a minute of monotonic time while the wall clock stood still", async () => {
  await fetchWithReplyAfter({ monoMs: 60_000 })
  expectTokenDiscarded()
})

it("sends no header when the background has no token to give", async () => {
  const { gandalfFetch } = await import("./gandalfFetch")
  const request = gandalfFetch("https://api.example.com/data")
  reply(null)
  await request
  expectTokenDiscarded()
})

it("exposes the authorization hook for the LI.FI SDK", async () => {
  const { getGandalfAuthorization } = await import("./gandalfFetch")
  const authorization = getGandalfAuthorization()
  reply("jwt-lifi")
  await expect(authorization).resolves.toBe("Bearer jwt-lifi")
})

it("asks the background for a token on every request instead of keeping one", async () => {
  mocks.gandalfAccessToken.mockResolvedValueOnce("jwt-1").mockResolvedValueOnce("jwt-2")
  const { getGandalfAuthorization } = await import("./gandalfFetch")

  await expect(getGandalfAuthorization()).resolves.toBe("Bearer jwt-1")
  await expect(getGandalfAuthorization()).resolves.toBe("Bearer jwt-2")
  expect(mocks.gandalfAccessToken).toHaveBeenCalledTimes(2)
})
