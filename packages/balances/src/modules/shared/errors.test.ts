import { describe, expect, it } from "vitest"
import { BalanceFetchError, BalanceFetchNetworkError } from "./errors"

describe("BalanceFetchError", () => {
  it("sets message correctly", () => {
    const err = new BalanceFetchError("fetch failed", "token-1", "0xabc")
    expect(err.message).toBe("fetch failed")
  })

  it('sets name to "BalanceFetchError"', () => {
    const err = new BalanceFetchError("msg", "token-1", "0xabc")
    expect(err.name).toBe("BalanceFetchError")
  })

  it("sets cause when provided", () => {
    const cause = new Error("root cause")
    const err = new BalanceFetchError("msg", "token-1", "0xabc", cause)
    expect(err.cause).toBe(cause)
  })
})

describe("BalanceFetchNetworkError", () => {
  it("sets message correctly", () => {
    const err = new BalanceFetchNetworkError("network failed", "evm-1")
    expect(err.message).toBe("network failed")
  })

  it('sets name to "BalanceFetchNetworkError"', () => {
    const err = new BalanceFetchNetworkError("msg")
    expect(err.name).toBe("BalanceFetchNetworkError")
  })

  it("sets evmNetworkId when provided", () => {
    const err = new BalanceFetchNetworkError("msg", "evm-1")
    expect(err.evmNetworkId).toBe("evm-1")
  })

  it("evmNetworkId is undefined when not provided", () => {
    const err = new BalanceFetchNetworkError("msg")
    expect(err.evmNetworkId).toBeUndefined()
  })

  it("sets cause when provided", () => {
    const cause = new Error("root")
    const err = new BalanceFetchNetworkError("msg", "evm-1", cause)
    expect(err.cause).toBe(cause)
  })
})
