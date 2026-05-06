import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  accountProxiesRefresh: vi.fn(),
  logError: vi.fn(),
  useTransaction: vi.fn(),
}))

vi.mock("@common/log", () => ({
  log: {
    error: mocks.logError,
  },
}))

vi.mock("@ui/api", () => ({
  api: {
    accountProxiesRefresh: mocks.accountProxiesRefresh,
  },
}))

vi.mock("@ui/state/transactions", () => ({
  useTransaction: mocks.useTransaction,
}))

import { useRefreshAccountProxiesOnTxSuccess } from "./useRefreshAccountProxiesOnTxSuccess"

describe("useRefreshAccountProxiesOnTxSuccess", () => {
  beforeEach(() => {
    mocks.accountProxiesRefresh.mockReset()
    mocks.accountProxiesRefresh.mockResolvedValue(true)
    mocks.logError.mockReset()
    mocks.useTransaction.mockReset()
  })

  it("does not refresh while the transaction is still pending", () => {
    mocks.useTransaction.mockReturnValue({ status: "pending" })

    renderHook(() =>
      useRefreshAccountProxiesOnTxSuccess({
        hash: "0x123",
        networkId: "polkadot",
        address: "delegator",
      })
    )

    expect(mocks.accountProxiesRefresh).not.toHaveBeenCalled()
  })

  it("refreshes exactly once when the submitted transaction succeeds", async () => {
    const tx = { status: "pending" as "pending" | "success" }
    mocks.useTransaction.mockImplementation(() => tx)

    const { rerender } = renderHook(() =>
      useRefreshAccountProxiesOnTxSuccess({
        hash: "0x123",
        networkId: "polkadot",
        address: "delegator",
      })
    )

    expect(mocks.accountProxiesRefresh).not.toHaveBeenCalled()

    tx.status = "success"
    rerender()

    await waitFor(() => expect(mocks.accountProxiesRefresh).toHaveBeenCalledTimes(1))
    expect(mocks.accountProxiesRefresh).toHaveBeenCalledWith({
      networkId: "polkadot",
      address: "delegator",
    })

    rerender()

    expect(mocks.accountProxiesRefresh).toHaveBeenCalledTimes(1)
  })
})
