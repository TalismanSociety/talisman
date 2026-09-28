import { describe, expect, it } from "vitest"

import { getTestScaleApi } from "../__fixtures__/chains"
import { getDispatchErrorMessage } from "./errors"

const { chain } = getTestScaleApi("polkadot")

const describeError = (err: unknown) => getDispatchErrorMessage(chain, err)

describe("getDispatchErrorMessage", () => {
  it("returns null when there is no error", () => {
    expect(describeError(undefined)).toBeNull()
    expect(describeError(null)).toBeNull()
  })

  it.each([
    ["CannotLookup", "Cannot lookup"],
    ["BadOrigin", "Bad origin"],
    ["ConsumerRemaining", "Consumer remaining"],
    ["NoProviders", "No providers"],
    ["TooManyConsumers", "Too many consumers"],
    ["Exhausted", "Resources exhausted"],
    ["Corruption", "State corrupt"],
    ["Unavailable", "Resource unavailable"],
    ["RootNotAllowed", "Root not allowed"],
    ["Trie", "Unknown error"],
    ["Other", "Unknown error"],
  ])("describes %s", (type, message) => {
    expect(describeError({ type, value: undefined })).toBe(message)
  })

  it.each([
    ["FundsUnavailable", "Funds are unavailable"],
    ["OnlyProvider", "Account that must exist would die"],
    ["BelowMinimum", "Account cannot exist with the funds that would be given"],
    ["CannotCreate", "Account cannot be created"],
    ["UnknownAsset", "The asset in question is unknown"],
    ["Frozen", "Funds exist but are frozen"],
    ["Unsupported", "Operation is not supported by the asset"],
    ["CannotCreateHold", "Account cannot be created for recording amount on hold"],
    ["NotExpendable", "Account that is desired to remain would die"],
    ["Blocked", "Account cannot receive the assets"],
  ])("describes Token.%s", (type, message) => {
    expect(describeError({ type: "Token", value: { type } })).toBe(message)
  })

  it.each([
    ["LimitReached", "Too many transactional layers have been spawned"],
    ["NoLayer", "A transactional layer was expected, but does not exist"],
  ])("describes Transactional.%s", (type, message) => {
    expect(describeError({ type: "Transactional", value: { type } })).toBe(message)
  })

  it("describes Arithmetic.DivisionByZero", () => {
    expect(describeError({ type: "Arithmetic", value: { type: "DivisionByZero" } })).toBe(
      "Division by zero"
    )
  })

  it("describes Arithmetic.Overflow", () => {
    expect(describeError({ type: "Arithmetic", value: { type: "Overflow" } })).toBe(
      "An overflow would occur"
    )
  })

  it("describes Arithmetic.Underflow", () => {
    expect(describeError({ type: "Arithmetic", value: { type: "Underflow" } })).toBe(
      "An underflow would occur"
    )
  })

  it("describes module errors with their metadata docs", () => {
    expect(
      describeError({
        type: "Module",
        value: { type: "Balances", value: { type: "InsufficientBalance", value: undefined } },
      })
    ).toBe("Balance too low to send value.")
  })

  it("falls back to pallet and variant names for unknown modules", () => {
    expect(
      describeError({ type: "Module", value: { type: "NotAPallet", value: { type: "Oops" } } })
    ).toBe("NotAPallet: Oops")
  })

  it("falls back to type names for unknown nested variants", () => {
    expect(describeError({ type: "Token", value: { type: "Melted" } })).toBe("Token: Melted")
    expect(describeError({ type: "Future", value: { type: "Thing" } })).toBe("Future: Thing")
  })

  it("returns a generic message when the error cannot be described", () => {
    expect(describeError({ type: "Future" })).toBe("Unknown error")
    expect(describeError({ type: "Token", value: undefined })).toBe("Unknown error")
    expect(describeError("boom")).toBe("Unknown error")
    expect(describeError({})).toBe("Unknown error")
  })
})
