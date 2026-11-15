import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { type RequestFact, requestStore } from "./requests/store"
import { windowManager } from "./WindowManager"

const POPUP_ID = 1

const nextMacrotask = () => new Promise((resolve) => setTimeout(resolve, 0))

const collectUnhandledRejections = () => {
  const reasons: unknown[] = []
  const listener = (reason: unknown) => reasons.push(reason)
  process.on("unhandledRejection", listener)
  return { reasons, stop: () => process.off("unhandledRejection", listener) }
}

const throwInvocationError = () => {
  throw new TypeError("Error in invocation of windows.remove")
}

describe("windowManager.popupClose when chrome.windows.remove fails", () => {
  beforeEach(async () => {
    vi.spyOn(chrome.windows, "create").mockResolvedValue({ id: POPUP_ID } as never)
    await windowManager.popupClose()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("resolves when closing a popup rejects", async () => {
    vi.spyOn(chrome.windows, "remove").mockRejectedValue(new Error("No window with id: 1."))
    await windowManager.popupOpen()

    await expect(windowManager.popupClose(POPUP_ID)).resolves.toBeUndefined()
  })

  it("resolves when closing a popup throws synchronously", async () => {
    vi.spyOn(chrome.windows, "remove").mockImplementation(throwInvocationError)
    await windowManager.popupOpen()

    await expect(windowManager.popupClose(POPUP_ID)).resolves.toBeUndefined()
  })

  it("resolves when closing every popup fails", async () => {
    const remove = vi
      .spyOn(chrome.windows, "remove")
      .mockRejectedValue(new Error("No window with id: 1."))
    await windowManager.popupOpen()

    await expect(windowManager.popupClose()).resolves.toBeUndefined()
    expect(remove).toHaveBeenCalledWith(POPUP_ID)
  })

  it("stops tracking a popup it failed to close", async () => {
    const remove = vi
      .spyOn(chrome.windows, "remove")
      .mockRejectedValue(new Error("No window with id: 1."))
    await windowManager.popupOpen()
    await windowManager.popupClose(POPUP_ID).catch(() => {})
    remove.mockClear()

    await expect(windowManager.popupClose()).resolves.toBeUndefined()
    expect(remove).not.toHaveBeenCalled()
  })

  it("leaves no unhandled rejection when a request completes", async () => {
    const remove = vi.spyOn(chrome.windows, "remove").mockImplementation(throwInvocationError)
    const facts: RequestFact[] = []
    const subscription = requestStore.facts$.subscribe((fact) => facts.push(fact))
    const unhandled = collectUnhandledRejections()

    try {
      const pending = requestStore.createRequest({
        type: "eth-watchasset",
        url: "https://app.example.com",
      } as never)
      await nextMacrotask()
      const created = facts[0]
      if (created?.type !== "created") throw new Error("no created fact")
      requestStore.getRequest(created.request.id as `eth-watchasset.${string}`)?.resolve(true)
      await pending
      await nextMacrotask()

      expect(remove).toHaveBeenCalledWith(POPUP_ID)
      expect(unhandled.reasons).toEqual([])
    } finally {
      unhandled.stop()
      subscription.unsubscribe()
    }
  })
})
