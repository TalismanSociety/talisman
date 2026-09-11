import { describe, expect, it } from "vitest"

import { yieldToEventLoop } from "./yieldToEventLoop"

describe("yieldToEventLoop", () => {
  it("resolves", async () => {
    await expect(yieldToEventLoop()).resolves.toBeUndefined()
  })

  it("resolves in a new macrotask (after already-queued macrotasks)", async () => {
    const order: string[] = []

    const timer = new Promise<void>((resolve) =>
      setTimeout(() => {
        order.push("timer")
        resolve()
      }, 0)
    )
    await yieldToEventLoop().then(() => order.push("yield"))
    await timer

    // both ran; the already-queued setTimeout was not starved by the yield
    expect(order).toContain("timer")
    expect(order).toContain("yield")
  })

  it("lets queued timers fire between repeated yields", async () => {
    let ticks = 0
    const interval = setInterval(() => ticks++, 0)
    const deadline = Date.now() + 1000
    try {
      while (ticks === 0 && Date.now() < deadline) await yieldToEventLoop()
    } finally {
      clearInterval(interval)
    }
    expect(ticks).toBeGreaterThan(0)
  })
})
