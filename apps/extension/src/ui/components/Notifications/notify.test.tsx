import { attachErrorCategory } from "@common/analytics/errorCategory"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { notify, notifyUpdate } from "./notify"

const track = vi.hoisted(() => vi.fn())
vi.mock("@ui/api/track", () => ({ track }))

const toast = vi.hoisted(() =>
  Object.assign(
    vi.fn((_content: unknown, options?: { toastId?: string }) => options?.toastId ?? "generated"),
    { update: vi.fn(), isActive: vi.fn(() => true) }
  )
)
vi.mock("react-toastify", () => ({ toast }))

const categories = () => track.mock.calls.map(([, props]) => props.error_category)

describe("error toasts report error_shown", () => {
  beforeEach(() => track.mockClear())

  it("classifies the cause, which keeps the background's verdict across IPC", () => {
    notify(
      {
        type: "error",
        title: "Failed",
        subtitle: "nonce too low",
        cause: attachErrorCategory(new Error("x"), "insufficient_gas"),
      },
      { toastId: "a" }
    )

    expect(track).toHaveBeenCalledWith("error_shown", {
      surface: "toast",
      error_category: "insufficient_gas",
    })
  })

  it("classifies a string subtitle without a cause, and prefers an explicit category", () => {
    notify({ type: "error", title: "Failed", subtitle: "Incorrect password" }, { toastId: "b" })
    notify(
      {
        type: "error",
        title: "Expired",
        subtitle: "Please try again.",
        errorCategory: "payload_expired",
      },
      { toastId: "c" }
    )
    notify({ type: "error", title: "Failed", subtitle: <span>details</span> }, { toastId: "d" })

    expect(categories()).toEqual(["wrong_password", "payload_expired", "unknown"])
  })

  it("reports a toast once per category, however often it is re-notified or updated", async () => {
    notify({ type: "processing", title: "Sending" }, { toastId: "tx" })
    await notifyUpdate("tx", { type: "error", title: "Failed", subtitle: "execution reverted" })
    notify({ type: "error", title: "Failed", subtitle: "execution reverted" }, { toastId: "tx" })

    expect(categories()).toEqual(["simulation"])
  })

  it("sends nothing for other toasts", () => {
    notify({ type: "success", title: "Done", subtitle: "Incorrect password" })

    expect(track).not.toHaveBeenCalled()
  })
})
