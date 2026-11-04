import type { AddressesAndTokens, BalanceSubscriptionResponse } from "@core/domains/balances/types"
import { act, renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

const backend = vi.hoisted(() => {
  const listeners = new Map<string, (update: BalanceSubscriptionResponse) => void>()
  return {
    listeners,
    emit: (params: AddressesAndTokens, update: BalanceSubscriptionResponse) =>
      listeners.get(JSON.stringify(params))?.(update),
  }
})

vi.mock("@ui/api", () => ({
  api: {
    balancesByParams: (
      params: AddressesAndTokens,
      onUpdate: (update: BalanceSubscriptionResponse) => void
    ) => {
      backend.listeners.set(JSON.stringify(params), onUpdate)
      return () => backend.listeners.delete(JSON.stringify(params))
    },
  },
}))

vi.mock("@ui/state/balances", () => {
  const hydrate = { networks: {}, tokens: {}, tokenRates: {} }
  return { useBalancesHydrate: () => hydrate }
})

import { useBalancesByParams } from "@ui/hooks/useBalancesByParams"

const live: BalanceSubscriptionResponse = { status: "live", balances: [], failedBalanceIds: [] }

describe("useBalancesByParams", () => {
  it("reports the balances as initialising until they are fetched for the new params", async () => {
    const before = { addresses: ["0x01"], tokenIds: ["1:evm-native"] }
    const after = { addresses: ["0x01"], tokenIds: ["1:evm-native", "10:evm-native"] }
    const { result, rerender } = renderHook(
      ({ addressesAndTokens }) => useBalancesByParams({ addressesAndTokens }),
      { initialProps: { addressesAndTokens: before } }
    )
    act(() => backend.emit(before, live))
    await waitFor(() => expect(result.current.status).toBe("live"))

    rerender({ addressesAndTokens: after })

    expect(result.current.status).toBe("initialising")
    act(() => backend.emit(after, live))
    await waitFor(() => expect(result.current.status).toBe("live"))
  })
})
