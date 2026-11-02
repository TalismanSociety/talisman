import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { describe, expect, it, vi } from "vitest"
import { useQuoteApproval } from "../hooks/useQuoteApproval"

const FROM = "0x5C9EBa3b10E45BF6db77267B40B95F3f91Fc5f67"
const NONCE_KEY = ["useNonce", FROM, "8453", undefined]

const { receipt } = vi.hoisted(() => ({
  receipt: { status: "success" as "success" | "reverted" },
}))

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock("@ui/api/track", () => ({ track: vi.fn() }))
vi.mock("@ui/components/Notifications", () => ({ notify: vi.fn() }))
vi.mock("@ui/hooks/analytics/flows", () => ({ flows: { swap: { failed: vi.fn() } } }))
vi.mock("@ui/domains/Ethereum/useEthTransaction", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@ui/domains/Ethereum/useEthTransaction")>()),
  useEthTransaction: () => ({ transaction: undefined }),
}))
vi.mock("@ui/domains/Ethereum/usePublicClient", () => ({
  usePublicClient: () => ({ waitForTransactionReceipt: async () => receipt }),
}))
vi.mock("@ui/state/chaindata", () => ({
  useToken: () => ({ networkId: "8453" }),
  useNetworkById: () => ({ id: "8453" }),
}))
vi.mock("../SwapProvider", () => ({
  useSwap: () => ({
    fromTokenId: "8453:evm-erc20:0xf3081494b87e8d5fb7960f066e931d1d0e6e3d67",
    selectedModule: { protocol: "lifi" },
    incrementApprovalCounter: vi.fn(),
    approvalHash: null,
    setApprovalHash: vi.fn(),
    erc20Approval: {
      data: {
        chainId: 8453,
        tokenAddress: "0xf3081494b87e8d5fb7960f066e931d1d0e6e3d67",
        contractAddress: "0x1da2415229b614c787e145d1d7346eb496319c52",
        fromAddress: FROM,
        amount: 1_000n,
        step: "revoke",
      },
      loading: false,
      needsRevoke: true,
    },
  }),
}))

const renderWithCachedNonce = () => {
  const queryClient = new QueryClient()
  queryClient.setQueryData(NONCE_KEY, 377)
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(() => useQuoteApproval(), { wrapper })
  return { queryClient, result }
}

describe("useQuoteApproval", () => {
  it.each(["success", "reverted"] as const)(
    "reads the nonce again once a %s approval spends it, so the next transaction does not reuse it",
    async (status) => {
      receipt.status = status
      const { queryClient, result } = renderWithCachedNonce()

      await act(() => result.current.onSubmit("0x12c5"))

      expect(queryClient.getQueryState(NONCE_KEY)?.isInvalidated).toBe(true)
    }
  )
})
