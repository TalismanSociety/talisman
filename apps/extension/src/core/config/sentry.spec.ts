import { Scope } from "@sentry/browser"
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from "vitest"

import { sentry } from "./sentry"

// the wrapper reimplements @sentry/core's parseEventHintOrCaptureContext to route
// `hintOrContext` to either an EventHint or a CaptureContext: these tests lock that
// routing so it can't silently drift on SDK upgrades (crash mechanism hints depend on it)
describe("sentry wrapper", () => {
  let captureException: MockInstance
  let captureMessage: MockInstance

  beforeEach(() => {
    captureException = vi
      .spyOn(Scope.prototype, "captureException")
      .mockReturnValue("test-event-id")
    captureMessage = vi.spyOn(Scope.prototype, "captureMessage").mockReturnValue("test-event-id")
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("captureException", () => {
    it("wraps a plain ScopeContext ({ extra }) as captureContext", () => {
      const error = new Error("test")
      sentry.captureException(error, { extra: { chainId: "0x123" } })

      expect(captureException).toHaveBeenCalledWith(error, {
        captureContext: { extra: { chainId: "0x123" } },
      })
    })

    it("wraps a plain ScopeContext ({ tags }) as captureContext", () => {
      const error = new Error("test")
      sentry.captureException(error, { tags: { networkId: "solana" } })

      expect(captureException).toHaveBeenCalledWith(error, {
        captureContext: { tags: { networkId: "solana" } },
      })
    })

    it("passes an EventHint ({ mechanism }) through unchanged", () => {
      const error = new Error("crash")
      const hint = { mechanism: { handled: false, type: "onerror" } }
      sentry.captureException(error, hint)

      expect(captureException).toHaveBeenCalledWith(error, hint)
    })

    it("passes an EventHint ({ captureContext, mechanism }) through unchanged", () => {
      const error = new Error("boundary")
      const hint = {
        captureContext: { contexts: { react: { componentStack: "at App" } } },
        mechanism: { handled: true },
      }
      sentry.captureException(error, hint)

      expect(captureException).toHaveBeenCalledWith(error, hint)
    })

    it("wraps a Scope instance as captureContext", () => {
      const error = new Error("test")
      const customScope = new Scope()
      sentry.captureException(error, customScope)

      expect(captureException).toHaveBeenCalledWith(error, { captureContext: customScope })
    })

    it("wraps a scope callback as captureContext", () => {
      const error = new Error("test")
      const callback = (scope: Scope) => scope
      sentry.captureException(error, callback)

      expect(captureException).toHaveBeenCalledWith(error, { captureContext: callback })
    })

    it("passes undefined hint through", () => {
      const error = new Error("test")
      sentry.captureException(error)

      expect(captureException).toHaveBeenCalledWith(error, undefined)
    })

    it("returns the event id from the scope", () => {
      expect(sentry.captureException(new Error("test"))).toEqual("test-event-id")
    })
  })

  describe("captureMessage", () => {
    it("routes a severity level string as level", () => {
      sentry.captureMessage("something happened", "warning")

      expect(captureMessage).toHaveBeenCalledWith("something happened", "warning", undefined)
    })

    it("routes a capture context object as context", () => {
      const captureContext = { extra: { foo: "bar" } }
      sentry.captureMessage("something happened", captureContext)

      expect(captureMessage).toHaveBeenCalledWith("something happened", undefined, {
        captureContext,
      })
    })

    it("returns the event id from the scope", () => {
      expect(sentry.captureMessage("test")).toEqual("test-event-id")
    })
  })
})
