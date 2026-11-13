import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { getLastResumedAt, onResume, setAwakeTimeout, setSuspended } from "./suspension"

// Date.now is driven by hand: while the runtime is suspended no timer runs, and on resume all
// the timers that came due run at once, each seeing the resume time
let now = 1_000_000

/** the runtime runs for `ms`, its timers firing on time */
const run = (ms: number) => {
  for (let left = ms; left > 0; left -= 100) {
    const step = Math.min(100, left)
    now += step
    vi.advanceTimersByTime(step)
  }
}

/** the runtime is frozen for `ms`, then every timer that came due fires at the resume time */
const suspend = (ms: number) => {
  now += ms
  vi.advanceTimersByTime(ms)
}

describe("suspension", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"] })
    vi.spyOn(Date, "now").mockImplementation(() => now)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe("setAwakeTimeout", () => {
    it("fires once the time is up while the runtime runs", () => {
      const callback = vi.fn()
      setAwakeTimeout(callback, 30_000)

      run(29_900)
      expect(callback).not.toHaveBeenCalled()
      run(200)
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it("starts over when the runtime resumes from a suspension", () => {
      const callback = vi.fn()
      setAwakeTimeout(callback, 30_000)

      run(5_000)
      suspend(90_000)
      // the timeout came due during the suspension, but it doesn't fire on resume
      expect(callback).not.toHaveBeenCalled()

      run(29_900)
      expect(callback).not.toHaveBeenCalled()
      run(200)
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it("counts a stall shorter than a suspension as running time", () => {
      const callback = vi.fn()
      setAwakeTimeout(callback, 30_000)

      run(27_000)
      // the thread was busy for 4s: a stall, not a suspension
      suspend(4_000)
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it("doesn't fire once cancelled", () => {
      const callback = vi.fn()
      const cancel = setAwakeTimeout(callback, 30_000)
      cancel()
      run(60_000)
      expect(callback).not.toHaveBeenCalled()
    })

    it("stops the ticker once nothing is pending", () => {
      const cancel = setAwakeTimeout(() => {}, 30_000)
      expect(vi.getTimerCount()).toBe(2)
      cancel()
      expect(vi.getTimerCount()).toBe(0)

      setAwakeTimeout(() => {}, 1_000)
      run(1_100)
      expect(vi.getTimerCount()).toBe(0)
    })
  })

  describe("onResume", () => {
    it("reports each suspension with its length", () => {
      const listener = vi.fn()
      const remove = onResume(listener)

      run(3_000)
      suspend(90_000)
      expect(listener).toHaveBeenCalledTimes(1)
      // measured from the last tick before the suspension
      expect(listener.mock.calls[0]?.[0]).toBeGreaterThanOrEqual(89_000)
      expect(getLastResumedAt()).toBe(now)

      run(10_000)
      expect(listener).toHaveBeenCalledTimes(1)
      remove()
    })

    it("ignores a stall shorter than a suspension", () => {
      const listener = vi.fn()
      const remove = onResume(listener)
      run(1_000)
      suspend(4_000)
      expect(listener).not.toHaveBeenCalled()
      remove()
    })

    it("runs the other listeners when one throws", () => {
      const thrown = new Error("listener failed")
      const failing = vi.fn(() => {
        throw thrown
      })
      const listener = vi.fn()
      const removeFailing = onResume(failing)
      const remove = onResume(listener)
      const rethrown = vi.spyOn(globalThis, "queueMicrotask").mockImplementation(() => {})

      run(1_000)
      suspend(60_000)
      expect(failing).toHaveBeenCalledTimes(1)
      expect(listener).toHaveBeenCalledTimes(1)
      expect(rethrown).toHaveBeenCalledTimes(1)

      removeFailing()
      remove()
    })

    it("stops the ticker once the last listener is removed", () => {
      const remove = onResume(() => {})
      expect(vi.getTimerCount()).toBe(1)
      remove()
      remove()
      expect(vi.getTimerCount()).toBe(0)
    })
  })

  describe("setSuspended", () => {
    it("holds the timeouts while the host marks the runtime suspended", () => {
      const callback = vi.fn()
      setAwakeTimeout(callback, 30_000)

      run(5_000)
      setSuspended(true)
      // the runtime keeps running, but its time doesn't count
      run(60_000)
      expect(callback).not.toHaveBeenCalled()

      setSuspended(false)
      run(29_900)
      expect(callback).not.toHaveBeenCalled()
      run(200)
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it("reports the resume with the time since the runtime was marked suspended", () => {
      const listener = vi.fn()
      const remove = onResume(listener)

      setSuspended(true)
      run(20_000)
      // a second mark keeps the first one's time
      setSuspended(true)
      run(20_000)
      expect(listener).not.toHaveBeenCalled()

      setSuspended(false)
      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener).toHaveBeenCalledWith(40_000)
      expect(getLastResumedAt()).toBe(now)

      // nothing to resume from
      setSuspended(false)
      expect(listener).toHaveBeenCalledTimes(1)
      remove()
    })

    it("reports a freeze during the marked time once, at the end of the mark", () => {
      const listener = vi.fn()
      const remove = onResume(listener)

      setSuspended(true)
      run(1_000)
      suspend(60_000)
      run(1_000)
      expect(listener).not.toHaveBeenCalled()

      setSuspended(false)
      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener).toHaveBeenCalledWith(62_000)
      remove()
    })
  })

  describe("in a page", () => {
    type Suspension = typeof import("./suspension")
    let suspension: Suspension
    let page: EventTarget & { visibilityState: "visible" | "hidden" }

    const setVisible = (visible: boolean) => {
      page.visibilityState = visible ? "visible" : "hidden"
      page.dispatchEvent(new Event("visibilitychange"))
    }

    /** a hidden tab whose timers run once a minute */
    const throttle = (ms: number) => {
      for (let left = ms; left > 0; left -= 60_000) suspend(Math.min(60_000, left))
    }

    beforeEach(async () => {
      page = Object.assign(new EventTarget(), {
        visibilityState: "visible" as "visible" | "hidden",
      })
      vi.stubGlobal("document", page)
      vi.resetModules()
      suspension = await import("./suspension")
    })
    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it("runs timeouts on time while a hidden page's timers keep running", () => {
      const callback = vi.fn()
      suspension.setAwakeTimeout(callback, 30_000)

      setVisible(false)
      run(30_100)
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it("holds timeouts while a hidden page is throttled, and resumes once when it is shown", () => {
      const callback = vi.fn()
      const listener = vi.fn()
      const remove = suspension.onResume(listener)
      suspension.setAwakeTimeout(callback, 30_000)

      setVisible(false)
      throttle(10 * 60_000)
      expect(callback).not.toHaveBeenCalled()
      expect(listener).not.toHaveBeenCalled()
      expect(suspension.isSuspended()).toBe(true)

      setVisible(true)
      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener).toHaveBeenCalledWith(60_000)
      expect(suspension.isSuspended()).toBe(false)

      run(29_900)
      expect(callback).not.toHaveBeenCalled()
      run(200)
      expect(callback).toHaveBeenCalledTimes(1)
      remove()
    })

    it("holds a timeout that comes due while a frozen page resumes, before it is shown", () => {
      const callback = vi.fn()
      const listener = vi.fn()
      const remove = suspension.onResume(listener)
      suspension.setAwakeTimeout(callback, 30_000)

      run(5_000)
      setVisible(false)
      suspend(90_000)
      expect(callback).not.toHaveBeenCalled()
      expect(listener).not.toHaveBeenCalled()

      setVisible(true)
      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener.mock.calls[0]?.[0]).toBeGreaterThanOrEqual(89_000)
      run(30_100)
      expect(callback).toHaveBeenCalledTimes(1)
      remove()
    })

    it("doesn't report a resume when a hidden page's timers kept running", () => {
      const listener = vi.fn()
      const remove = suspension.onResume(listener)

      setVisible(false)
      run(60_000)
      setVisible(true)
      expect(listener).not.toHaveBeenCalled()
      remove()
    })

    it("resumes once both the host and the page let go", () => {
      const listener = vi.fn()
      const remove = suspension.onResume(listener)

      suspension.setSuspended(true)
      setVisible(false)
      throttle(120_000)
      suspension.setSuspended(false)
      expect(listener).not.toHaveBeenCalled()
      expect(suspension.isSuspended()).toBe(true)

      setVisible(true)
      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener).toHaveBeenCalledWith(120_000)
      remove()
    })
  })
})
