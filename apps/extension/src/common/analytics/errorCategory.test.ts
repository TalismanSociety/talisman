import { describe, expect, it } from "vitest"

import {
  attachErrorCategory,
  CATEGORY_RULES,
  classifyError,
  type ErrorCategory,
} from "./errorCategory"

const named = (name: string, message = "") => Object.assign(new Error(message), { name })
const coded = (code: number | string, message = "") => Object.assign(new Error(message), { code })
const ledger = (name: string) =>
  Object.assign(new Error("ledger"), { name, isTalismanLedgerError: true })

const ROWS: [string, unknown, ErrorCategory][] = [
  [
    "attached verdict",
    attachErrorCategory(new Error("whatever"), "nonce_conflict"),
    "nonce_conflict",
  ],
  [
    "attached on a cause",
    new Error("wrapped", { cause: attachErrorCategory(new Error(""), "rpc") }),
    "rpc",
  ],
  ["ledger locked", ledger("Locked"), "ledger_device_locked"],
  ["ledger user rejection", ledger("UserRejected"), "user_rejected"],
  ["ledger wrong app", ledger("InvalidApp"), "ledger_wrong_app"],
  ["ledger not found", ledger("NotFound"), "ledger_device_not_found"],
  ["ledger other", ledger("Busy"), "ledger"],
  [
    "ledger custom defers to its message",
    Object.assign(ledger("Custom"), { message: "Payload expired" }),
    "payload_expired",
  ],
  ["swap fee balance", { type: "insufficient-fee-balance" }, "insufficient_gas"],
  ["swap quote", { type: "quote-stale" }, "quote_stale"],
  ["swap balance", { type: "insufficient-swap-balance" }, "insufficient_balance"],
  ["gas balance check", named("InsufficientGasBalanceError"), "insufficient_gas"],
  ["webauthn cancel", named("NotAllowedError"), "user_rejected"],
  ["viem funds", named("InsufficientFundsError"), "insufficient_gas"],
  ["viem nonce", named("NonceTooLowError"), "nonce_conflict"],
  [
    "viem revert deep in the causes",
    new Error("a", { cause: new Error("b", { cause: named("ExecutionRevertedError") }) }),
    "simulation",
  ],
  ["transport", named("HttpRequestError"), "rpc"],
  ["timeout name", named("TimeoutError"), "timeout"],
  ["webauthn unsupported", named("NotSupportedError"), "unsupported"],
  ["database", named("QuotaExceededError"), "storage"],
  ["eip-1193 rejection", coded(4001), "user_rejected"],
  ["ethers rejection", coded("ACTION_REJECTED"), "user_rejected"],
  ["unsupported method", coded(4200), "unsupported"],
  ["rate limit status", Object.assign(new Error(""), { status: 429 }), "rpc"],
  ["request window closed", new Error("Cancelled"), "user_rejected"],
  [
    "substrate fees",
    new Error("1010: Invalid Transaction: Inability to pay some fees"),
    "insufficient_fee",
  ],
  [
    "evm gas funds message",
    new Error("insufficient funds for gas * price + value"),
    "insufficient_gas",
  ],
  ["balance message", new Error("Insufficient balance"), "insufficient_balance"],
  ["nonce message", new Error("replacement transaction underpriced"), "nonce_conflict"],
  ["substrate duplicate", new Error("1013: Transaction Already Imported"), "nonce_conflict"],
  ["stale nonce", new Error("Transaction is outdated"), "nonce_conflict"],
  [
    "ancient birth block",
    new Error("1010: Invalid Transaction: Transaction has an ancient birth block"),
    "payload_expired",
  ],
  ["substrate pool code without a reason", coded(1013), "nonce_conflict"],
  [
    "substrate reason in data",
    Object.assign(new Error("Invalid Transaction"), {
      code: 1010,
      data: "Inability to pay some fees",
    }),
    "insufficient_fee",
  ],
  [
    "bad signature",
    new Error("1010: Invalid Transaction: Transaction has a bad signature"),
    "bad_proof",
  ],
  ["revert message", new Error("execution reverted: STF"), "simulation"],
  ["dispatch", new Error("ExtrinsicFailed"), "dispatch_failed"],
  ["banned resubmission", new Error("Transaction is temporarily banned"), "network_rejected"],
  ["other validity", new Error("Invalid Transaction: Custom error: 3"), "network_rejected"],
  ["wrong password", new Error("Incorrect Password"), "wrong_password"],
  ["locked approval", new Error("Unauthorised"), "wrong_password"],
  ["keyring decryption", new Error("Failed to decrypt data"), "wrong_password"],
  ["timeout message", new Error("Request timed out"), "timeout"],
  ["fetch failure", new Error("Failed to fetch"), "rpc"],
  ["a string is a message", "user rejected the request", "user_rejected"],
  ["nothing known", new Error("Something odd"), "unknown"],
  ["not an error", 42, "unknown"],
  ["null", null, "unknown"],
]

describe("classifyError", () => {
  it.each(ROWS)("%s", (_, error, category) => {
    expect(classifyError(error)).toBe(category)
  })

  it("prefers a rule earlier in the table to a message pattern on the same error", () => {
    expect(classifyError(named("TimeoutError", "Incorrect Password"))).toBe("timeout")
  })

  it("stops walking causes after five levels", () => {
    let error: unknown = named("HttpRequestError")
    for (let depth = 0; depth < 6; depth++) error = new Error("wrapper", { cause: error })

    expect(classifyError(error)).toBe("unknown")
  })

  it("returns only an enum value, never the message", () => {
    const message = "insufficient funds for gas: address 0x71C7656EC7ab88b098defB751B7401B5f6d8976F"

    expect(classifyError(new Error(message))).toBe("insufficient_gas")
  })

  it("needs every rule: removing one changes a row", () => {
    const unproven = CATEGORY_RULES.filter((rule) => {
      const without = CATEGORY_RULES.filter((other) => other !== rule)
      return ROWS.every(([, error, category]) => classifyError(error, without) === category)
    })

    expect(unproven).toEqual([])
  })
})
