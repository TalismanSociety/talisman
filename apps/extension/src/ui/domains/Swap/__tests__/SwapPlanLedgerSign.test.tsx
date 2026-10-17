import type { SwapPlan } from "@core/domains/swaps/plans/types"
import type { BuiltLeg } from "@core/domains/swaps/types"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, render, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

const { ethGetTransactionsCount, submitted, payloadLock } = vi.hoisted(() => ({
  ethGetTransactionsCount: vi.fn(),
  submitted: vi.fn(),
  payloadLock: { current: undefined as ((isLocked: boolean) => void) | undefined },
}))

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (value: string) => value }) }))
vi.mock("@ui/api", () => ({ api: { ethGetTransactionsCount } }))
vi.mock("@ui/domains/Sign/TxSubmitButton/TxSubmitButton", () => ({
  TxSubmitButton: ({
    tx,
    onPayloadLockChange,
  }: {
    tx?: unknown
    onPayloadLockChange?: (isLocked: boolean) => void
  }) => {
    payloadLock.current = onPayloadLockChange
    if (tx) submitted(tx)
    return null
  },
}))
vi.mock("../swap-modules/evm-network", () => ({
  getEvmPublicClient: async () => ({
    getBalance: async () => 10n ** 21n,
    getTransactionCount: async () => 7,
  }),
}))
vi.mock("../swaps.api", () => ({
  swapModules: [
    {
      protocol: "forevermoney",
      buildLeg: async (): Promise<BuiltLeg> => ({
        transaction: {
          platform: "ethereum",
          transaction: {
            to: GATEWAY,
            data: "0x",
            value: 1n,
            gas: 21_000n,
            maxFeePerGas: 10n,
            maxPriorityFeePerGas: 1n,
          },
        },
        fees: [],
        expectedOutput: 1n,
        txInfo: {
          type: "swap-forevermoney",
          fromTokenId: "964:evm-native",
          toTokenId: "8453:evm-native",
          fromAmount: "1",
          toAmount: "1",
          to: GATEWAY,
          destinationStartBlock: "1",
        },
      }),
    },
  ],
}))

import {
  EVM_ADDRESS,
  GATEWAY,
  LEG0,
  LEG0_OUTPUT,
  LEG1,
  PLAN_ID,
  SUMMARY,
  T0,
} from "@core/domains/swaps/plans/__tests__/fixtures"
import { SwapPlanLedgerSign } from "../components/SwapPlanLedgerSign"

const PLAN: SwapPlan = {
  id: PLAN_ID,
  phase: "paused",
  createdAt: T0,
  updatedAt: T0,
  signUntil: null,
  summary: SUMMARY,
  intermediate: EVM_ADDRESS,
  legs: [
    {
      ...LEG0,
      state: {
        at: "landed",
        hash: `0x${"11".repeat(32)}`,
        amount: LEG0_OUTPUT.toString(),
        landedAt: T0,
      },
    },
    {
      ...LEG1,
      signerType: "ledger-ethereum",
      state: { at: "awaiting-user", why: "hardware", since: T0 },
    },
  ],
}

const renderLedgerSign = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <SwapPlanLedgerSign plan={PLAN} leg={1} />
    </QueryClientProvider>
  )

describe("SwapPlanLedgerSign", () => {
  it("rebuilds the leg on a fresh nonce once a sign attempt ends without the leg sent", async () => {
    ethGetTransactionsCount.mockResolvedValue(8)
    renderLedgerSign()
    await waitFor(() =>
      expect(submitted.mock.lastCall?.[0]).toMatchObject({ payload: { nonce: 8 } })
    )

    ethGetTransactionsCount.mockResolvedValue(9)
    act(() => payloadLock.current?.(true))
    act(() => payloadLock.current?.(false))

    await waitFor(() =>
      expect(submitted.mock.lastCall?.[0]).toMatchObject({ payload: { nonce: 9 } })
    )
  })

  it("signs the leg with the wallet's next nonce, past the transactions it still has pending", async () => {
    ethGetTransactionsCount.mockResolvedValue(8)
    renderLedgerSign()

    await waitFor(() => expect(submitted).toHaveBeenCalled())
    expect(ethGetTransactionsCount).toHaveBeenCalledWith(EVM_ADDRESS, "964")
    expect(submitted.mock.lastCall?.[0]).toMatchObject({ payload: { nonce: 8 } })
  })
})
