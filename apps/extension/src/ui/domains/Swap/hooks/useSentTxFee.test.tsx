import { db } from "@core/db"
import type { WalletTransactionEth } from "@core/domains/transactions/types"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const HASH = "0xaaaa000000000000000000000000000000000000000000000000000000000001"

vi.mock("../swap-modules/evm-network", () => ({
  getEvmPublicClient: async () => ({
    getTransactionReceipt: async () => ({
      gasUsed: 21_000n,
      effectiveGasPrice: 2n,
      l1Fee: "0x64",
    }),
  }),
}))

import { useSentTxFee } from "./useSentTxFee"

const row = (status: WalletTransactionEth["status"]): WalletTransactionEth => ({
  id: HASH,
  platform: "ethereum",
  networkId: "10",
  account: "0x1111111111111111111111111111111111111111",
  status,
  confirmed: status !== "pending",
  payload: {},
  hash: HASH,
  nonce: 4,
  timestamp: 0,
  txInfo: {
    type: "approve-erc20",
    tokenId: "10:evm-native",
    contractAddress: "0x9999999999999999999999999999999999999999",
    amount: "1",
    pricing: { priority: "high", estimatedFee: "50000" },
  },
})

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
)

describe("useSentTxFee", () => {
  beforeEach(() => db.transactionsV2.clear())

  it("shows the priority and the estimate a pending transaction was signed with", async () => {
    await db.transactionsV2.put(row("pending"))
    const { result } = renderHook(() => useSentTxFee(HASH, "10"), { wrapper })

    await waitFor(() => expect(result.current.priority).toBe("high"))
    expect(result.current.estimatedFee).toBe(50_000n)
    expect(result.current.paidFee).toBeUndefined()
  })

  it("shows what a mined transaction paid, its rollup data fee included", async () => {
    await db.transactionsV2.put(row("pending"))
    const { result } = renderHook(() => useSentTxFee(HASH, "10"), { wrapper })
    await waitFor(() => expect(result.current.priority).toBe("high"))

    await db.transactionsV2.put(row("success"))
    await waitFor(() => expect(result.current.paidFee).toBe(42_100n))
    expect(result.current.priority).toBe("high")
  })
})
