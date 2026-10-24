import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import BigNumber from "bignumber.js"
import type { PropsWithChildren } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { swapPlanPropose, swapPlanCancel, swapModules } = vi.hoisted(() => ({
  swapPlanPropose: vi.fn(),
  swapPlanCancel: vi.fn(),
  swapModules: [] as { protocol: string; supportsSlippageSetting?: boolean }[],
}))

vi.mock("@ui/api", () => ({ api: { swapPlanPropose, swapPlanCancel } }))
vi.mock("@core/db", () => ({
  db: { swapPlans: { get: async () => ({ phase: "proposed" }) } },
}))
vi.mock("../swaps.api", () => ({ useSwapModules: () => swapModules }))

import type { BaseQuote, BuiltLeg } from "@core/domains/swaps/types"
import { useSwapPlanProposal } from "../hooks/useSwapPlanProposal"

const SUB_ADDRESS = "5GW7UHZ9tLocJUaMXFWkr48QHgVoq5tVR1az62mknFacM3cu"
const EVM_ADDRESS = "0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A"
const RECIPIENT = "0x70045A9F59A354550EC0272f73AAe03B01Fb8a7a"

const quoteFor = (inputAmount: bigint) =>
  ({
    protocol: "forevermoney",
    outputAmountBN: inputAmount,
    legs: [
      {
        protocol: "bittensor-evm",
        fromTokenId: "bittensor:substrate-native",
        toTokenId: "964:evm-native",
        signer: SUB_ADDRESS,
        recipient: EVM_ADDRESS,
        inputAmount,
        outputAmount: inputAmount,
        fees: [],
        timeInSec: 12,
      },
      {
        protocol: "forevermoney",
        fromTokenId: "964:evm-native",
        toTokenId: "8453:evm-native",
        signer: EVM_ADDRESS,
        recipient: RECIPIENT,
        inputAmount,
        outputAmount: inputAmount,
        fees: [{ name: "fee", tokenId: "964:evm-native", amount: BigNumber(1) }],
        timeInSec: 180,
      },
    ],
  }) as unknown as BaseQuote

const builtFor = (nonce: number) =>
  ({
    transaction: { platform: "polkadot", payload: { nonce: `0x${nonce.toString(16)}` } },
    fees: [],
    expectedOutput: 0n,
    txInfo: { type: "swap" },
  }) as unknown as BuiltLeg

const A = { built: { quote: quoteFor(1_000n), leg: builtFor(7) } }
const B = { built: { quote: quoteFor(2_000n), leg: builtFor(7) } }

describe("useSwapPlanProposal", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    swapPlanPropose.mockReset().mockResolvedValue(true)
    swapPlanCancel.mockReset().mockResolvedValue(true)
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    swapModules.length = 0
  })

  const render = (slippage = 0.005) =>
    renderHook(
      (props: typeof A) =>
        useSwapPlanProposal({
          ...props,
          fromAmount: 1_000n,
          toAddress: RECIPIENT,
          slippage,
        }),
      {
        initialProps: A,
        wrapper: ({ children }: PropsWithChildren) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      }
    )

  it("proposes again when an earlier quote comes back, and signs as that proposal", async () => {
    const { result, rerender } = render()
    await waitFor(() => expect(result.current.isProposing).toBe(false))
    rerender(B)
    await waitFor(() => expect(result.current.isProposing).toBe(false))
    rerender(A)
    await waitFor(() => expect(result.current.isProposing).toBe(false))

    expect(swapPlanPropose).toHaveBeenCalledTimes(3)
    const [a, b, aAgain] = swapPlanPropose.mock.calls.map(([request]) => request)
    expect(aAgain.legs).toEqual(a.legs)
    expect(new Set([a.id, b.id, aAgain.id]).size).toBe(3)
    expect(result.current.txInfo?.plan).toEqual({ id: aAgain.id, leg: 0 })
    await waitFor(() => expect(swapPlanCancel.mock.calls).toEqual([[a.id], [b.id]]))
  })

  it("keeps the plan of a quote that only changed identity", async () => {
    const { result, rerender } = render()
    await waitFor(() => expect(result.current.isProposing).toBe(false))
    rerender({ built: { quote: quoteFor(1_000n), leg: builtFor(7) } })
    await waitFor(() => expect(result.current.isProposing).toBe(false))

    expect(swapPlanPropose).toHaveBeenCalledTimes(1)
    expect(swapPlanCancel).not.toHaveBeenCalled()
  })

  it("leaves the tolerance to a provider that does not let the user set it", async () => {
    swapModules.push({ protocol: "forevermoney" })
    const { result } = render(0.1)
    await waitFor(() => expect(result.current.isProposing).toBe(false))

    expect(swapPlanPropose.mock.lastCall?.[0].summary.slippage).toBe(0)
  })

  it("holds a provider that lets the user set the tolerance to the user's", async () => {
    swapModules.push({ protocol: "forevermoney", supportsSlippageSetting: true })
    const { result } = render(0.1)
    await waitFor(() => expect(result.current.isProposing).toBe(false))

    expect(swapPlanPropose.mock.lastCall?.[0].summary.slippage).toBe(0.1)
  })
})
