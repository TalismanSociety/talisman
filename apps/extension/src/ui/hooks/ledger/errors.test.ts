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
