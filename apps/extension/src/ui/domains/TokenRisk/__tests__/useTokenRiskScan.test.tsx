import type { Token } from "@talismn/chaindata-provider"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockGandalfFetch = vi.fn()
const mockGenericEvent = vi.fn()

vi.mock("@ui/util/gandalfFetch", () => ({
  gandalfFetch: (...args: unknown[]) => mockGandalfFetch(...args),
}))

vi.mock("@ui/hooks/useAnalytics", () => ({
  useAnalytics: () => ({ genericEvent: mockGenericEvent }),
}))

vi.mock("@ui/state/remoteConfig", () => ({ useFeatureFlag: () => true }))
vi.mock("@ui/state/settings", () => ({ useSettingValue: () => true }))

import { useTokenRiskScan } from "../useTokenRiskScan"

const TOKEN = {
  id: "1:evm-erc20:0x1111111111111111111111111111111111111111",
  type: "evm-erc20",
  networkId: "1",
  symbol: "BAD",
  contractAddress: "0x1111111111111111111111111111111111111111",
} as unknown as Token

const createWrapper = () => {
  const queryClient = new QueryClient()
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe("useTokenRiskScan", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGandalfFetch.mockResolvedValue(
      Response.json({
        results: {
          "1:0x1111111111111111111111111111111111111111": {
            status: "hit",
            resultType: "Malicious",
          },
        },
      })
    )
  })

  it("reports a verdict once when the token object identity changes", async () => {
    const { rerender } = renderHook(({ token }) => useTokenRiskScan(token, "token-settings"), {
      wrapper: createWrapper(),
      initialProps: { token: TOKEN },
    })

    await waitFor(() => expect(mockGenericEvent).toHaveBeenCalledTimes(1))

    rerender({ token: { ...TOKEN } })

    expect(mockGenericEvent).toHaveBeenCalledTimes(1)
    expect(mockGenericEvent).toHaveBeenCalledWith("token risk scan", {
      surface: "token-settings",
      verdict: "Malicious",
      chainId: "1",
    })
  })
})
