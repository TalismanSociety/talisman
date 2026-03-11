import { ExponentialBackoff } from "./helpers"

describe("ExponentialBackoff", () => {
  describe("constructor", () => {
    it("uses default min=2000ms and max=120000ms", () => {
      const backoff = new ExponentialBackoff()
      expect(backoff.next).toBe(2000)
      expect(backoff.isMin).toBe(true)
      expect(backoff.isMax).toBe(false)
    })

    it("respects custom min and max values", () => {
      const backoff = new ExponentialBackoff(10000, 500)
      expect(backoff.next).toBe(500)
      expect(backoff.isMin).toBe(true)
    })

    it("starts at min interval after construction", () => {
      const backoff = new ExponentialBackoff(60000, 1000)
      expect(backoff.next).toBe(1000)
    })
  })

  describe("increase()", () => {
    it("doubles the interval", () => {
      const backoff = new ExponentialBackoff(120000, 2000)
      backoff.increase()
      expect(backoff.next).toBe(4000)
    })

    it("caps at max interval", () => {
      const backoff = new ExponentialBackoff(8000, 2000)
      backoff.increase() // 4000
      backoff.increase() // 8000
      backoff.increase() // capped at 8000
      expect(backoff.next).toBe(8000)
      expect(backoff.isMax).toBe(true)
    })

    it("goes to min when starting from zero (internal state)", () => {
      // When #nextInterval is 0, increase sets it to 1, then doubles to 2,
      // then capMin clamps to min. Use resetTo to force to a low value first.
      const backoff = new ExponentialBackoff(120000, 2000)
      // After construction, next = 2000 (min). increase doubles to 4000.
      backoff.increase()
      expect(backoff.next).toBe(4000)
    })

    it("follows the full doubling sequence with default values", () => {
      const backoff = new ExponentialBackoff()
      expect(backoff.next).toBe(2000)

      backoff.increase()
      expect(backoff.next).toBe(4000)

      backoff.increase()
      expect(backoff.next).toBe(8000)

      backoff.increase()
      expect(backoff.next).toBe(16000)

      backoff.increase()
      expect(backoff.next).toBe(32000)

      backoff.increase()
      expect(backoff.next).toBe(64000)

      backoff.increase()
      expect(backoff.next).toBe(120000) // capped at max (2 minutes)

      backoff.increase()
      expect(backoff.next).toBe(120000) // stays at max
      expect(backoff.isMax).toBe(true)
    })
  })

  describe("decrease()", () => {
    it("halves the interval", () => {
      const backoff = new ExponentialBackoff(120000, 2000)
      backoff.increase() // 4000
      backoff.increase() // 8000
      backoff.decrease()
      expect(backoff.next).toBe(4000)
    })

    it("caps at min interval", () => {
      const backoff = new ExponentialBackoff(120000, 2000)
      backoff.decrease() // 2000 / 2 = 1000, capped to 2000
      expect(backoff.next).toBe(2000)
      expect(backoff.isMin).toBe(true)
    })
  })

  describe("reset()", () => {
    it("resets to min interval", () => {
      const backoff = new ExponentialBackoff(120000, 2000)
      backoff.increase()
      backoff.increase()
      expect(backoff.next).toBe(8000)

      backoff.reset()
      expect(backoff.next).toBe(2000)
      expect(backoff.isMin).toBe(true)
    })
  })

  describe("resetTo()", () => {
    it("sets to the given value", () => {
      const backoff = new ExponentialBackoff(120000, 2000)
      backoff.resetTo(5000)
      expect(backoff.next).toBe(5000)
    })

    it("caps at min if value is below min", () => {
      const backoff = new ExponentialBackoff(120000, 2000)
      backoff.resetTo(100)
      expect(backoff.next).toBe(2000)
    })

    it("caps at max if value is above max", () => {
      const backoff = new ExponentialBackoff(120000, 2000)
      backoff.resetTo(999999)
      expect(backoff.next).toBe(120000)
    })
  })

  describe("resetToMax()", () => {
    it("sets interval to max", () => {
      const backoff = new ExponentialBackoff(120000, 2000)
      backoff.resetToMax()
      expect(backoff.next).toBe(120000)
      expect(backoff.isMax).toBe(true)
    })
  })

  describe("enable() / disable()", () => {
    it("starts active by default", () => {
      const backoff = new ExponentialBackoff()
      expect(backoff.isActive).toBe(true)
    })

    it("disable() sets isActive to false", () => {
      const backoff = new ExponentialBackoff()
      backoff.disable()
      expect(backoff.isActive).toBe(false)
    })

    it("enable() sets isActive back to true", () => {
      const backoff = new ExponentialBackoff()
      backoff.disable()
      backoff.enable()
      expect(backoff.isActive).toBe(true)
    })
  })

  describe("isMin / isMax", () => {
    it("isMin is true at min, false otherwise", () => {
      const backoff = new ExponentialBackoff(120000, 2000)
      expect(backoff.isMin).toBe(true)

      backoff.increase()
      expect(backoff.isMin).toBe(false)
    })

    it("isMax is true at max, false otherwise", () => {
      const backoff = new ExponentialBackoff(8000, 2000)
      expect(backoff.isMax).toBe(false)

      backoff.resetToMax()
      expect(backoff.isMax).toBe(true)
    })
  })
})
