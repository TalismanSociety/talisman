import type { CoachmarkId } from "@core/domains/app/coachmarks"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { type SetStateAction, useState } from "react"
import { beforeEach, describe, expect, test, vi } from "vitest"

const storage = vi.hoisted(() => ({ dismissedCoachmarks: undefined as CoachmarkId[] | undefined }))
const track = vi.hoisted(() => vi.fn())
const STORAGE_WRITE_MS = 20
const settle = () => new Promise((resolve) => setTimeout(resolve, STORAGE_WRITE_MS * 2))

vi.mock("@ui/api/track", () => ({ track, trackFlowEvent: vi.fn() }))
vi.mock("@ui/state/app", () => ({
  useAppState: () => {
    const [value, setValue] = useState(storage.dismissedCoachmarks)
    const set = async (next: SetStateAction<CoachmarkId[] | undefined>) => {
      storage.dismissedCoachmarks = typeof next === "function" ? next(value) : next
      await new Promise((resolve) => setTimeout(resolve, STORAGE_WRITE_MS))
      setValue(storage.dismissedCoachmarks)
    }
    return [value, set] as const
  },
}))

const { Coachmark } = await import("../Coachmark")

const Page = () => (
  <Coachmark
    id="popup_fullscreen_moved"
    title="Expand has moved here"
    description="Open Talisman in a full tab from the top right."
  >
    <button type="button">Fullscreen</button>
  </Coachmark>
)

const coachmark = () => screen.queryByRole("dialog", { name: "Expand has moved here" })

const modalClosed = () =>
  track.mock.calls
    .filter(([event]) => event === "modal_closed")
    .map(([, { modal_id, dismiss }]) => ({ modal_id, dismiss }))

describe("Coachmark", () => {
  beforeEach(() => {
    storage.dismissedCoachmarks = undefined
    track.mockReset()
  })

  test("points at its anchor until the user acknowledges it, then never again", async () => {
    const { unmount } = render(<Page />)

    expect(coachmark()).not.toBeNull()

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Got it" }))
      await settle()
    })

    expect(coachmark()).toBeNull()
    expect(storage.dismissedCoachmarks).toEqual(["popup_fullscreen_moved"])
    expect(modalClosed()).toEqual([
      { modal_id: "coachmark_popup_fullscreen_moved", dismiss: "completed" },
    ])

    unmount()
    render(<Page />)
    expect(coachmark()).toBeNull()
  })

  test("escape dismisses it for good and hands focus back to its anchor", async () => {
    render(<Page />)

    await act(async () => {
      fireEvent.keyDown(document.body, { key: "Escape" })
      await settle()
    })

    expect(coachmark()).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Fullscreen" }))
    expect(storage.dismissedCoachmarks).toEqual(["popup_fullscreen_moved"])
    expect(modalClosed()).toEqual([
      { modal_id: "coachmark_popup_fullscreen_moved", dismiss: "escape" },
    ])
  })
})
