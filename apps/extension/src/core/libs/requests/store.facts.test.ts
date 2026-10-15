import { describe, expect, it, vi } from "vitest"

import { type RequestFact, requestStore } from "./store"

const popup = vi.hoisted(() => ({ close: () => {} }))

vi.mock("../WindowManager", () => ({
  windowManager: {
    popupOpen: vi.fn(async (_route: string, onClose: () => void) => {
      popup.close = onClose
      return 1
    }),
    popupClose: vi.fn(async () => {}),
  },
}))

const endings = (facts: RequestFact[]) =>
  facts.flatMap((fact) => (fact.type === "ended" ? [fact.ending] : []))

describe("RequestStore facts", () => {
  it("ends a request once, whichever exit runs first", async () => {
    const facts: RequestFact[] = []
    const subscription = requestStore.facts$.subscribe((fact) => facts.push(fact))

    const pending = requestStore
      .createRequest({ type: "eth-watchasset", url: "https://app.example.com" } as never)
      .catch(() => {})
    await vi.waitFor(() => expect(facts).toHaveLength(1))
    const created = facts[0]
    if (created?.type !== "created") throw new Error("no created fact")
    const queued = requestStore.getRequest(created.request.id as `eth-watchasset.${string}`)

    popup.close()
    queued?.resolve(true)
    await pending
    subscription.unsubscribe()

    expect(endings(facts)).toEqual(["window_closed"])
  })
})
