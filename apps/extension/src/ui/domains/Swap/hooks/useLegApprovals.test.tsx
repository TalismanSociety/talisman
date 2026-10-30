import { fromPersistedLeg } from "@core/domains/swaps/plans/helpers"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

const SPENDER_A = "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE"
const SPENDER_B = "0x89c6340B1a1f4b25D36cd8B063D49045caF3f818"
const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7"

const { allowances, spender } = vi.hoisted(() => ({
  allowances: new Map<string, bigint>(),
  spender: { current: "" },
}))

vi.mock("../swap-modules/evm-network", () => ({
  getEvmPublicClient: async () => ({
    readContract: async ({ args }: { args: [string, string] }) => allowances.get(args[1]) ?? 0n,
  }),
}))

vi.mock("../swaps.api", () => ({
  swapModules: [
    {
      protocol: "lifi",
      getApprovalInfo: ({
        fromAmount,
        fromAddress,
      }: {
        fromAmount: bigint
        fromAddress: string
      }) => ({
        contractAddress: spender.current,
        amount: fromAmount,
        tokenAddress: USDT,
        chainId: 1,
        fromAddress,
        protocolName: "LI.FI",
      }),
    },
  ],
}))

import { LEG0, LEG1 } from "@core/domains/swaps/plans/__tests__/fixtures"
import { useLaterLegApprovals } from "./useLegApprovals"

const legs = [
  fromPersistedLeg(LEG0.quote),
  fromPersistedLeg({ ...LEG1.quote, protocol: "lifi", fromTokenId: `1:evm-erc20:${USDT}` }),
]
const checks = legs.map((leg) => ({ leg, enabled: true }))

describe("useLaterLegApprovals", () => {
  it("reads the allowance of the spender the route approves, not one another route read", async () => {
    const client = new QueryClient()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    allowances.set(SPENDER_A, 0n)
    allowances.set(SPENDER_B, legs[1].inputAmount)

    spender.current = SPENDER_A
    const first = renderHook(() => useLaterLegApprovals(checks), { wrapper })
    await waitFor(() => expect(first.result.current).toEqual(new Set([1])))
    first.unmount()

    spender.current = SPENDER_B
    const second = renderHook(() => useLaterLegApprovals(checks), { wrapper })
    await waitFor(() => expect(client.isFetching()).toBe(0))
    expect(second.result.current).toEqual(new Set())
  })

  it("reads the allowance again on a screen that opens after it was granted", async () => {
    const client = new QueryClient()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    spender.current = SPENDER_A
    allowances.set(SPENDER_A, 0n)
    const first = renderHook(() => useLaterLegApprovals(checks), { wrapper })
    await waitFor(() => expect(first.result.current).toEqual(new Set([1])))
    first.unmount()

    allowances.set(SPENDER_A, legs[1].inputAmount)
    const second = renderHook(() => useLaterLegApprovals(checks), { wrapper })
    await waitFor(() => expect(second.result.current).toEqual(new Set()))
  })
})
