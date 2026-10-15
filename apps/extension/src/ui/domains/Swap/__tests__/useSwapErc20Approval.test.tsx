import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const readContract = vi.fn()

vi.mock("@ui/state/chaindata", () => ({
  useNetworks: () => [{ id: "8453", platform: "ethereum" }],
}))

vi.mock("@ui/domains/Ethereum/usePublicClient", () => ({
  getExtensionPublicClient: () => ({ readContract }),
}))

import { useSwapErc20Approval } from "../hooks/useSwapErc20Approval"
import type { BaseQuote } from "../swap-modules/common.swap-module"
import type { SwapModuleEntry } from "../swaps.api"

const AMOUNT = 10n ** 18n
const FROM = "0x5C9EBa3b10E45BF6db77267B40B95F3f91Fc5f67"

const selectedModule = {
  getApprovalInfo: () => ({
    contractAddress: "0x1da2415229b614C787e145D1D7346eb496319C52",
    amount: AMOUNT,
    tokenAddress: "0xf3081494B87e8D5fb7960f066E931D1D0e6E3d67",
    chainId: 8453,
    fromAddress: FROM,
    protocolName: "ForeverMoney",
  }),
} as unknown as SwapModuleEntry

const selectedQuote = { protocol: "forevermoney" } as unknown as BaseQuote

describe("useSwapErc20Approval", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    readContract.mockReset()
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  })

  afterEach(() => {
    queryClient.clear()
  })

  const render = (approvalCounter: number) =>
    renderHook(
      () =>
        useSwapErc20Approval({
          selectedModule,
          fromTokenId: "8453:evm-erc20:0xf3081494b87e8d5fb7960f066e931d1d0e6e3d67",
          toTokenId: "964:evm-native",
          fromAmount: AMOUNT,
          fromAddress: FROM,
          toAddress: FROM,
          selectedSubProtocol: undefined,
          selectedQuote,
          approvalCounter,
        }),
      {
        wrapper: ({ children }: PropsWithChildren) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      }
    )

  it("reads the allowance again when a lagging node still reports the previous one after approval", async () => {
    readContract.mockResolvedValueOnce(0n).mockResolvedValue(AMOUNT)

    const { result } = render(1)

    await waitFor(() => expect(result.current.data).not.toBeNull())
    await waitFor(() => expect(result.current.data).toBeNull(), { timeout: 5_000 })
    expect(result.current.approveTx).toBeNull()
  })

  it("does not poll before any approval was confirmed", async () => {
    readContract.mockResolvedValue(0n)

    const { result } = render(0)

    await waitFor(() => expect(result.current.data).not.toBeNull())
    await new Promise((r) => setTimeout(r, 3_500))
    expect(readContract).toHaveBeenCalledTimes(1)
  })
})
