import type { ExceptionReport } from "@common/analytics/exceptionReport"
import { beforeEach, describe, expect, it, vi } from "vitest"

const sent = vi.hoisted(() => [] as ExceptionReport[])
const answer = vi.hoisted(() => ({ disposition: "queued" as string, fails: false }))

vi.mock("./api", () => ({
  api: {
    analyticsException: async (report: ExceptionReport) => {
      sent.push(report)
      if (answer.fails) throw new Error("port closed")
      return answer.disposition
    },
  },
}))

const { pageContext } = await import("./pageContext")
const { installErrorHandlers, reportError } = await import("./errorReporting")

beforeEach(() => {
  sent.length = 0
  answer.disposition = "queued"
  answer.fails = false
  pageContext.screen = "/portfolio/tokens/:symbol"
})

describe("reportError (page)", () => {
  it("sends the page's screen and resolves to the report id once queued", async () => {
    const id = await reportError(new Error("boom"))
    expect(sent[0]).toMatchObject({ id, mechanism: "caught", screen: "/portfolio/tokens/:symbol" })
  })

  it.each(["dropped_consent", "filtered", "dropped_off"])(
    "resolves null when %s",
    async (disposition) => {
      answer.disposition = disposition
      expect(await reportError(new Error("boom"))).toBeNull()
    }
  )

  it("swallows a closed port", async () => {
    answer.fails = true
    await expect(reportError(new Error("boom"))).resolves.toBeNull()
  })
})

describe("installErrorHandlers (page)", () => {
  it("reports uncaught errors and unhandled rejections with their mechanisms", () => {
    const listeners: Record<string, (event: unknown) => void> = {}
    const spy = vi.spyOn(window, "addEventListener").mockImplementation((type, listener) => {
      listeners[type] = listener as (event: unknown) => void
    })
    installErrorHandlers()
    spy.mockRestore()

    listeners.error({ error: new Error("uncaught"), message: "uncaught" })
    listeners.unhandledrejection({ reason: new Error("rejected") })

    expect(sent.map(({ mechanism }) => mechanism)).toEqual(["uncaught", "unhandled_rejection"])
    expect(sent.map(({ exceptions }) => exceptions[0].mechanism?.handled)).toEqual([false, false])
  })
})
