import type { SwapStatus, WalletTransactionEth } from "@core/domains/transactions/types"
import { describe, expect, it } from "vitest"

import { getSwapProgressDetails } from "./swapProgressStatus"

const t = (key: string) => key

const makeTx = (
  status: WalletTransactionEth["status"],
  swapStatus?: SwapStatus
): WalletTransactionEth => ({
  id: "0xaaaa000000000000000000000000000000000000000000000000000000000001",
  platform: "ethereum",
  networkId: "1",
  account: "0x1111111111111111111111111111111111111111",
  status,
  confirmed: false,
  payload: {},
  hash: "0xaaaa000000000000000000000000000000000000000000000000000000000001",
  nonce: 5,
  timestamp: Date.now(),
  swapStatus,
})

describe("getSwapProgressDetails", () => {
  it("shows Submitting while the tx is loading", () => {
    const details = getSwapProgressDetails(t, undefined, false)
    expect(details.animStatus).toBe("processing")
    expect(details.pillLabel).toBe("Submitting")
  })

  it("shows Submitting while the tx is pending", () => {
    const details = getSwapProgressDetails(t, makeTx("pending"), false)
    expect(details.animStatus).toBe("processing")
    expect(details.pillLabel).toBe("Submitting")
  })

  it("shows Depositing funds while the swap status hasn't loaded", () => {
    const details = getSwapProgressDetails(t, makeTx("success"), false)
    expect(details.animStatus).toBe("processing")
    expect(details.pillLabel).toBe("Depositing funds")
  })

  it("shows Depositing funds while the exchange hasn't seen the deposit (not_found)", () => {
    const details = getSwapProgressDetails(t, makeTx("success", "not_found"), false)
    expect(details.animStatus).toBe("processing")
    expect(details.pillLabel).toBe("Depositing funds")
  })

  it("shows an ambiguous state when the tracker gave up (unknown)", () => {
    const details = getSwapProgressDetails(t, makeTx("success", "unknown"), false)
    expect(details.animStatus).toBe("failure")
    expect(details.title).toBe("Swap status unknown")
    expect(details.pillLabel).toBeUndefined()
  })

  it("shows an ambiguous state when the tracker couldn't parse the tx (invalid)", () => {
    const details = getSwapProgressDetails(t, makeTx("success", "invalid"), false)
    expect(details.animStatus).toBe("failure")
    expect(details.title).toBe("Swap status unknown")
  })

  it("shows success when the swap finished", () => {
    const details = getSwapProgressDetails(t, makeTx("success", "finished"), false)
    expect(details.animStatus).toBe("success")
    expect(details.title).toBe("Swap complete")
  })

  it("shows failure when the exchange failed the swap", () => {
    const details = getSwapProgressDetails(t, makeTx("success", "failed"), false)
    expect(details.animStatus).toBe("failure")
    expect(details.title).toBe("Swap failed")
  })

  it("shows cancelled when the tx was replaced", () => {
    const details = getSwapProgressDetails(t, makeTx("replaced"), false)
    expect(details.animStatus).toBe("failure")
    expect(details.title).toBe("Transaction cancelled")
  })

  it("shows failure when the tx failed on-chain", () => {
    const details = getSwapProgressDetails(t, makeTx("error"), false)
    expect(details.animStatus).toBe("failure")
    expect(details.title).toBe("Transaction failed")
  })

  it("shows not found when the tx status is unknown", () => {
    const details = getSwapProgressDetails(t, makeTx("unknown"), false)
    expect(details.animStatus).toBe("failure")
    expect(details.title).toBe("Transaction not found")
  })
})
