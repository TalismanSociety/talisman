import { describe, expect, it } from "vitest"

import { getErrorMessage } from "./getErrorMessage"

describe("getErrorMessage", () => {
  it("reads the message of an Error", () => {
    expect(getErrorMessage(new TypeError("boom"))).toBe("boom")
  })

  it("reads the message of an error-like object", () => {
    expect(getErrorMessage({ message: "rpc failed", code: -32000 })).toBe("rpc failed")
  })

  it("returns a thrown string as is", () => {
    expect(getErrorMessage("boom")).toBe("boom")
  })

  it("returns the fallback when there is no message", () => {
    expect(getErrorMessage(undefined)).toBe("Unknown error")
    expect(getErrorMessage(null, "Failed")).toBe("Failed")
    expect(getErrorMessage(42, "Failed")).toBe("Failed")
    expect(getErrorMessage({ message: 42 }, "Failed")).toBe("Failed")
    expect(getErrorMessage(new Error(""), "Failed")).toBe("Failed")
    expect(getErrorMessage("", "Failed")).toBe("Failed")
  })
})
