import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"
import type { QuoteLeg } from "../swap-modules/common.swap-module"

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

import { useLaterLegApprovals } from "./useLegApprovals"

const EVM_ADDRESS = "0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A"

const legs: QuoteLeg[] = [
  {
    protocol: "bittensor-evm",
    fromTokenId: "bittensor:substrate-native",
    toTokenId: "964:evm-native",
    signer: "5GW7UHZ9tLocJUaMXFWkr48QHgVoq5tVR1az62mknFacM3cu",
    recipient: EVM_ADDRESS,
    inputAmount: 1_000_000_000n,
    outputAmount: 999_999_500_000_000_000n,
    fees: [],
    timeInSec: 12,
  },
  {
    protocol: "lifi",
    fromTokenId: `1:evm-erc20:${USDT}`,
    toTokenId: "8453:evm-erc20:0xf3081494b87e8d5fb7960f066e931d1d0e6e3d67",
    signer: EVM_ADDRESS,
    recipient: "0x70045A9F59A354550EC0272f73AAe03B01Fb8a7a",
    inputAmount: 999_999_500_000_000_000n,
    outputAmount: 990_000_000_000_000_000n,
    fees: [],
    timeInSec: 180,
  },
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
