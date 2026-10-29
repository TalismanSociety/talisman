import type { PlanLeg, SwapPlan } from "@core/domains/swaps/plans/types"
import type { BuiltLeg } from "@core/domains/swaps/types"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, render, screen, waitFor } from "@testing-library/react"
import { useState } from "react"
import { of } from "rxjs"
import { encodeFunctionData, erc20Abi } from "viem"
import { describe, expect, it, vi } from "vitest"

const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7"
const USDT_ID = `1:evm-erc20:${USDT.toLowerCase()}`
const SPENDER = "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE"
const APPROVAL_HASH = `0x${"ab".repeat(32)}`

const { ethGetTransactionsCount, priced, submitted, payloadLock, button, client } = vi.hoisted(
  () => ({
    ethGetTransactionsCount: vi.fn(),
    priced: vi.fn(
      (request: unknown, _networkId?: string, _isLocked?: boolean, _isReplacement?: boolean) => ({
        transaction: request,
        error: undefined,
      })
    ),
    submitted: vi.fn(),
    payloadLock: { current: undefined as ((isLocked: boolean) => void) | undefined },
    button: {
      sign: undefined as (() => void) | undefined,
      submit: undefined as ((hash: string) => void) | undefined,
      reject: undefined as ((cause: unknown) => void) | undefined,
    },
    client: {
      allowance: vi.fn<() => Promise<bigint>>(),
      waitForTransactionReceipt: vi.fn(),
    },
  })
)

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      key.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(options?.[name])),
  }),
}))
vi.mock("@ui/api", () => ({ api: { ethGetTransactionsCount } }))
vi.mock("@ui/domains/Ethereum/useEthTransaction", () => ({ useEthTransaction: priced }))
vi.mock("@ui/state/chaindata", () => ({ getToken$: () => of({ symbol: "USDT" }) }))
vi.mock("@ui/domains/Sign/TxSubmitButton/TxSubmitButton", () => ({
  TxSubmitButton: ({
    tx,
    label,
    isProcessing,
    onSubmit,
    onPayloadLockChange,
    onError,
  }: {
    tx?: unknown
    label?: string
    isProcessing?: boolean
    onSubmit: (hash: string) => void
    onPayloadLockChange?: (isLocked: boolean) => void
    onError?: (cause: unknown) => void
  }) => {
    const [isSigning, setIsSigning] = useState(false)
    payloadLock.current = onPayloadLockChange
    button.sign = () => setIsSigning(true)
    button.submit = onSubmit
    button.reject = onError
    if (tx) submitted(tx)
    return (
      <button type="button" aria-busy={isSigning || !!isProcessing}>
        {label}
      </button>
    )
  },
}))
vi.mock("../swap-modules/evm-network", () => ({
  getEvmPublicClient: async () => ({
    getBalance: async () => 10n ** 21n,
    getTransactionCount: async () => 7,
    readContract: async ({ functionName }: { functionName: string }) =>
      functionName === "allowance" ? client.allowance() : 10n ** 21n,
    prepareTransactionRequest: async (request: object) => ({
      ...request,
      gas: 50_000n,
      maxFeePerGas: 10n,
      maxPriorityFeePerGas: 1n,
    }),
    waitForTransactionReceipt: client.waitForTransactionReceipt,
  }),
}))

const builtLeg = (to: `0x${string}`, txInfo: BuiltLeg["txInfo"]): BuiltLeg => ({
  transaction: {
    platform: "ethereum",
    transaction: {
      to,
      data: "0x",
      value: 1n,
      gas: 21_000n,
      maxFeePerGas: 10n,
      maxPriorityFeePerGas: 1n,
    },
  },
  fees: [],
  expectedOutput: 1n,
  txInfo,
})

vi.mock("../swaps.api", () => ({
  swapModules: [
    {
      protocol: "forevermoney",
      buildLeg: async () =>
        builtLeg(GATEWAY, {
          type: "swap-forevermoney",
          fromTokenId: "964:evm-native",
          toTokenId: "8453:evm-native",
          fromAmount: "1",
          toAmount: "1",
          to: GATEWAY,
          destinationStartBlock: "1",
        }),
    },
    {
      protocol: "lifi",
      getApprovalInfo: ({
        fromAmount,
        fromAddress,
      }: {
        fromAmount: bigint
        fromAddress: string
      }) => ({
        contractAddress: SPENDER,
        amount: fromAmount,
        tokenAddress: USDT,
        chainId: 1,
        fromAddress,
        protocolName: "LI.FI",
      }),
      buildLeg: async () =>
        builtLeg(SPENDER, {
          type: "swap-lifi",
          protocolName: "fly",
          fromTokenId: USDT_ID,
          toTokenId: "8453:evm-native",
          fromAmount: "1",
          toAmount: "1",
          to: RECIPIENT,
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
  RECIPIENT,
  SUMMARY,
  T0,
} from "@core/domains/swaps/plans/__tests__/fixtures"
import { PlanLegSignButton, usePlanLegSigning } from "../components/SwapPlanLedgerSign"

const planWaitingOn = (leg: PlanLeg): SwapPlan => ({
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
    { ...leg, state: { at: "awaiting-user", why: "hardware", since: T0 } },
  ],
})

const LEDGER_PLAN = planWaitingOn({ ...LEG1, signerType: "ledger-ethereum" })

const LIFI_PLAN = planWaitingOn({
  ...LEG1,
  quote: { ...LEG1.quote, protocol: "lifi", fromTokenId: USDT_ID, data: {} },
  bound: null,
})

const approveData = encodeFunctionData({
  abi: erc20Abi,
  functionName: "approve",
  args: [SPENDER, BigInt(LEG1.quote.inputAmount)],
})

const WaitingLeg = ({ plan }: { plan: SwapPlan }) => (
  <PlanLegSignButton button={usePlanLegSigning(plan, 1).button} />
)

const renderSign = (plan = LEDGER_PLAN) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <WaitingLeg plan={plan} />
    </QueryClientProvider>
  )

const buttonLabel = () => screen.getByRole("button").textContent

describe("usePlanLegSigning", () => {
  it("rebuilds the leg on a fresh nonce once a sign attempt ends without the leg sent", async () => {
    ethGetTransactionsCount.mockResolvedValue(8)
    renderSign()
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

  it("offers a fresh sign attempt once the background rejects the signed leg", async () => {
    ethGetTransactionsCount.mockResolvedValue(8)
    renderSign()
    await waitFor(() => expect(submitted).toHaveBeenCalled())

    act(() => button.sign?.())
    expect(screen.getByRole("button").getAttribute("aria-busy")).toBe("true")
    act(() => button.reject?.(new Error("nonce already used")))

    expect(screen.getByRole("button").getAttribute("aria-busy")).toBe("false")
    expect(buttonLabel()).toBe("Try again")
  })

  it("rebuilds the leg on a fresh nonce once the background rejects the signed leg", async () => {
    ethGetTransactionsCount.mockResolvedValue(8)
    renderSign()
    await waitFor(() =>
      expect(submitted.mock.lastCall?.[0]).toMatchObject({ payload: { nonce: 8 } })
    )

    ethGetTransactionsCount.mockResolvedValue(9)
    act(() => button.sign?.())
    act(() => button.reject?.(new Error("nonce already used")))

    await waitFor(() =>
      expect(submitted.mock.lastCall?.[0]).toMatchObject({ payload: { nonce: 9 } })
    )
  })

  it("signs the leg with the wallet's next nonce, past the transactions it still has pending", async () => {
    ethGetTransactionsCount.mockResolvedValue(8)
    renderSign()

    await waitFor(() => expect(submitted).toHaveBeenCalled())
    expect(ethGetTransactionsCount).toHaveBeenCalledWith(EVM_ADDRESS, "964")
    expect(submitted.mock.lastCall?.[0]).toMatchObject({ payload: { nonce: 8 } })
    expect(buttonLabel()).toBe("Sign on Ledger")
  })

  it("prices the leg on screen, on the nonce the plan pinned and with no fee of its own", async () => {
    renderSign({
      ...LEDGER_PLAN,
      legs: [LEDGER_PLAN.legs[0], { ...LEDGER_PLAN.legs[1], nonce: 4 }],
    })

    await waitFor(() => expect(submitted).toHaveBeenCalled())
    const [request, networkId, , isReplacement] = priced.mock.lastCall ?? []
    expect(request).toMatchObject({ nonce: 4 })
    expect(request).not.toHaveProperty("maxFeePerGas")
    expect(request).not.toHaveProperty("maxPriorityFeePerGas")
    expect(request).not.toHaveProperty("gasPrice")
    expect([networkId, isReplacement]).toEqual(["964", true])
  })

  it("asks a keypair signer to sign, not a Ledger", async () => {
    ethGetTransactionsCount.mockResolvedValue(8)
    client.allowance.mockResolvedValue(BigInt(LEG1.quote.inputAmount))
    renderSign(LIFI_PLAN)

    await waitFor(() => expect(submitted).toHaveBeenCalled())
    expect(submitted.mock.lastCall?.[0]).toMatchObject({
      payload: { to: SPENDER, nonce: 8 },
      txInfo: { type: "swap-lifi", plan: { id: PLAN_ID, leg: 1 } },
    })
    expect(buttonLabel()).toBe("Sign")
  })

  it("asks for the spender's allowance before the leg when it is short", async () => {
    ethGetTransactionsCount.mockResolvedValue(8)
    client.allowance.mockResolvedValue(0n)
    renderSign(LIFI_PLAN)

    await waitFor(() => expect(submitted).toHaveBeenCalled())
    const tx = submitted.mock.lastCall?.[0]
    expect(tx).toMatchObject({
      networkId: "1",
      payload: { from: EVM_ADDRESS, to: USDT, data: approveData, value: 0n, nonce: 8 },
      txInfo: {
        type: "approve-erc20",
        tokenId: USDT_ID,
        contractAddress: SPENDER,
        amount: LEG1.quote.inputAmount,
      },
    })
    expect(tx.txInfo.plan).toBeUndefined()
    expect(buttonLabel()).toBe("Approve USDT")
  })

  it("builds the leg once the approval mined", async () => {
    ethGetTransactionsCount.mockResolvedValue(8)
    client.allowance.mockResolvedValue(0n)
    let mined: () => void = () => {}
    client.waitForTransactionReceipt.mockReturnValue(
      new Promise<void>((resolve) => {
        mined = resolve
      })
    )
    renderSign(LIFI_PLAN)
    await waitFor(() => expect(buttonLabel()).toBe("Approve USDT"))

    act(() => {
      button.submit?.(APPROVAL_HASH)
    })
    expect(screen.getByRole("button").getAttribute("aria-busy")).toBe("true")
    await waitFor(() =>
      expect(client.waitForTransactionReceipt).toHaveBeenCalledWith(
        expect.objectContaining({ hash: APPROVAL_HASH })
      )
    )

    client.allowance.mockResolvedValue(BigInt(LEG1.quote.inputAmount))
    ethGetTransactionsCount.mockResolvedValue(9)
    await act(async () => {
      mined()
    })

    await waitFor(() => expect(buttonLabel()).toBe("Sign"))
    expect(submitted.mock.lastCall?.[0]).toMatchObject({
      payload: { to: SPENDER, nonce: 9 },
      txInfo: { plan: { id: PLAN_ID, leg: 1 } },
    })
    expect(screen.getByRole("button").getAttribute("aria-busy")).toBe("false")
  })
})
