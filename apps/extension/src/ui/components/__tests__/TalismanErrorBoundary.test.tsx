import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const reports = vi.hoisted(() => [] as { thrown: unknown; options: unknown }[])
const answer = vi.hoisted(() => ({ eventId: null as string | null }))

vi.mock("@ui/api/errorReporting", () => ({
  reportError: async (thrown: unknown, options: unknown) => {
    reports.push({ thrown, options })
    return answer.eventId
  },
}))
vi.mock("@ui/hooks/analytics/errorShown", () => ({ reportErrorShown: () => {} }))
vi.mock("@talismn/icons", () => ({ TalismanDeadHandIcon: () => null }))

const { TalismanErrorBoundary } = await import("../TalismanErrorBoundary")

const Crash = (): never => {
  throw new Error("render failed")
}

const renderCrash = () =>
  render(
    <TalismanErrorBoundary>
      <Crash />
    </TalismanErrorBoundary>
  )

beforeEach(() => {
  reports.length = 0
  vi.spyOn(console, "error").mockImplementation(() => {})
})

describe("TalismanErrorBoundary", () => {
  it("reports the crash with its component stack and shows the Error ID once queued", async () => {
    answer.eventId = "6f1c2b9e-3a4d-4e5f-8a7b-9c0d1e2f3a4b"
    renderCrash()

    expect(await screen.findByText(/Error ID:.6f1c2b9e-3a4d-4e5f-8a7b-9c0d1e2f3a4b/)).toBeTruthy()
    expect(reports).toHaveLength(1)
    expect(reports[0].options).toEqual({ mechanism: "error_boundary" })
    expect((reports[0].thrown as Error).cause).toBeInstanceOf(Error)
  })

  it("shows no Error ID when the report was not queued", async () => {
    answer.eventId = null
    renderCrash()

    await screen.findByText("Sorry, an error occurred in Talisman")
    await Promise.resolve()
    expect(screen.queryByText(/Error ID/)).toBeNull()
    expect(reports).toHaveLength(1)
  })
})
