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

const typeChecks = (caught: unknown, type: "error" | "success") => {
  notify({ type: "error", title: "Failed", cause: caught })
  notify({ type: "error", title: "Failed", errorCategory: "wrong_password" })
  // @ts-expect-error an error toast without a cause or a category
  notify({ type: "error", title: "Failed" })
  // @ts-expect-error a subtitle is not a classification
  notify({ type: "error", title: "Failed", subtitle: "Incorrect password" })
  // @ts-expect-error a toast whose type may be error needs a category too
  notify({ type, title: "Failed" })
  // @ts-expect-error only an error toast has a category
  notify({ type: "success", title: "Saved", errorCategory: "rpc" })
}

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

  it("prefers an explicit category over the cause's", () => {
    notify(
      {
        type: "error",
        title: "Expired",
        subtitle: "Please try again.",
        cause: new Error("Incorrect password"),
        errorCategory: "payload_expired",
      },
      { toastId: "c" }
    )
    notify({ type: "error", title: "Failed", errorCategory: "clipboard" }, { toastId: "d" })

    expect(categories()).toEqual(["payload_expired", "clipboard"])
  })

  it("reports a toast once per category, however often it is re-notified or updated", async () => {
    const cause = new Error("execution reverted")
    notify({ type: "processing", title: "Sending" }, { toastId: "tx" })
    await notifyUpdate("tx", { type: "error", title: "Failed", cause })
    notify({ type: "error", title: "Failed", cause }, { toastId: "tx" })

    expect(categories()).toEqual(["simulation"])
  })

  it("rejects an error toast that cannot say what failed, at compile time", () => {
    expect(typeChecks).toBeTypeOf("function")
  })

  it("sends nothing for other toasts", () => {
    notify({ type: "success", title: "Done", subtitle: "Incorrect password" })

    expect(track).not.toHaveBeenCalled()
  })
})
