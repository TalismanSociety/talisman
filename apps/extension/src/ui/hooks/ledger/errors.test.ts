import { classifyError } from "@common/analytics/errorCategory"
import { describe, expect, it } from "vitest"

import { getTalismanLedgerError, TalismanLedgerError } from "./errors"

describe("Ledger errors in analytics", () => {
  it.each([
    ["Locked", "ledger_device_locked"],
    ["NotFound", "ledger_device_not_found"],
    ["InvalidApp", "ledger_wrong_app"],
    ["UserRejected", "user_rejected"],
    ["Busy", "ledger"],
  ] as const)("classifies a %s error as %s", (name, category) => {
    expect(classifyError(new TalismanLedgerError(name, "message"))).toBe(category)
  })

  it("classifies an error the mapper does not know as a Ledger error", () => {
    const transportError = Object.assign(new Error("Something odd"), { name: "OddError" })
    expect(classifyError(getTalismanLedgerError(transportError, "Ethereum"))).toBe("ledger")
  })
})

describe("Ledger status words", () => {
  const statusError = (statusCode: number) =>
    Object.assign(new Error("status"), { name: "TransportStatusError", statusCode })

  it.each([
    ["Ethereum", 0x6985],
    ["Solana", 0x6985],
    ["Polkadot", 0x6986],
  ])("reads a review rejected in the %s app as a user rejection", (app, statusCode) => {
    expect(getTalismanLedgerError(statusError(statusCode), app).name).toBe("UserRejected")
  })

  it("asks for the Ethereum app when the Solana app answers an Ethereum request", () => {
    expect(getTalismanLedgerError(statusError(0x6a83), "Ethereum").name).toBe("InvalidApp")
  })

  it("keeps the invalid message error for the Solana app", () => {
    expect(getTalismanLedgerError(statusError(0x6a83), "Solana").name).toBe("InvalidRequest")
  })
})
