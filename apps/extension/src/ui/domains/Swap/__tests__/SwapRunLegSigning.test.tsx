import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, render, screen, waitFor } from "@testing-library/react"
import { useState } from "react"
import { of } from "rxjs"
import { encodeFunctionData, erc20Abi } from "viem"
import { beforeEach, describe, expect, it, vi } from "vitest"

const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7"
const USDT_ID = `1:evm-erc20:${USDT.toLowerCase()}`
const SPENDER = "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE"
const GATEWAY = "0xd5Fa238aa4177f6c1341491969d9cBeec94EEd69"
const APPROVAL_HASH = `0x${"ab".repeat(32)}`
const LEG_HASH = `0x${"cd".repeat(32)}`

const {
  ethGetTransactionsCount,
  priced,
  pricing,
  submitted,
  payloadLock,
  button,
  client,
  signer,
  legSent,
} = vi.hoisted(() => {
  const pricing = { setCustomSettings: vi.fn(), setPriority: vi.fn() }
  return {
    ethGetTransactionsCount: vi.fn(),
    pricing,
    priced: vi.fn(
      (
        request: object | undefined,
        _networkId?: string,
        _isLocked?: boolean,
        _isReplacement?: boolean
      ) => ({
        transaction: request && { ...request, nonce: 99 },
        error: undefined,
        ...pricing,
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
      allowance: vi.fn<(blockNumber?: bigint) => Promise<bigint>>(),
      waitForTransactionReceipt: vi.fn(),
    },
    signer: { type: "ledger-ethereum" },
    legSent: vi.fn(),
  }
})

const { lifiBuildLeg } = vi.hoisted(() => ({ lifiBuildLeg: vi.fn() }))

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      key.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(options?.[name])),
  }),
}))
vi.mock("@ui/api", () => ({ api: { ethGetTransactionsCount } }))
vi.mock("@ui/state/accounts", () => ({ useAccountByAddress: () => signer }))
vi.mock("@ui/state/balances", () => ({ useBalance: () => undefined }))
vi.mock("@ui/domains/Ethereum/useEthTransaction", () => ({ useEthTransaction: priced }))
vi.mock("@ui/state/chaindata", () => ({
  getToken$: () => of({ symbol: "USDT" }),
  useToken: () => ({ symbol: "ETH", decimals: 18 }),
}))
vi.mock("@ui/domains/Sign/TxSubmitButton/TxSubmitButton", () => ({
  TxSubmitButton: ({
    tx,
    label,
    isProcessing,
    onSubmit,
    onPayloadLockChange,
    onError,
    disabled,
  }: {
    tx?: unknown
    label?: string
    disabled?: boolean
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
      <button type="button" aria-busy={isSigning || !!isProcessing} disabled={disabled}>
        {label}
      </button>
    )
  },
}))
vi.mock("../swap-modules/evm-network", () => ({
  getEvmPublicClient: async () => ({
    getBalance: async () => 10n ** 21n,
    getTransactionCount: async () => 7,
    readContract: async ({
      functionName,
      blockNumber,
    }: {
      functionName: string
      blockNumber?: bigint
    }) => (functionName === "allowance" ? client.allowance(blockNumber) : 10n ** 21n),
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
      buildLeg: lifiBuildLeg,
    },
  ],
}))

import { LegSignButton, useLegSigning } from "../components/SwapRunLegSigning"
import { SwapRateDropNotice } from "../components/SwapTxDetails"
import type { BuiltLeg, QuoteLeg } from "../swap-modules/common.swap-module"
import { quoteFromLegs } from "../swap-modules/helpers"
import type { SwapRun } from "../swap-modules/swap-run"

const SUB_ADDRESS = "5GW7UHZ9tLocJUaMXFWkr48QHgVoq5tVR1az62mknFacM3cu"
const EVM_ADDRESS = "0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A"
const RECIPIENT = "0x70045A9F59A354550EC0272f73AAe03B01Fb8a7a"
const LEG0_OUTPUT = 999_999_500_000_000_000n

const LEG0: QuoteLeg = {
  protocol: "bittensor-evm",
  fromTokenId: "bittensor:substrate-native",
  toTokenId: "964:evm-native",
  signer: SUB_ADDRESS,
  recipient: EVM_ADDRESS,
  inputAmount: 1_000_000_000n,
  outputAmount: LEG0_OUTPUT,
  fees: [],
  timeInSec: 12,
}

const FOREVERMONEY_LEG: QuoteLeg = {
  protocol: "forevermoney",
  fromTokenId: "964:evm-native",
  toTokenId: "8453:evm-native",
  signer: EVM_ADDRESS,
  recipient: RECIPIENT,
  inputAmount: LEG0_OUTPUT,
  outputAmount: 990_000_000_000_000_000n,
  fees: [],
  timeInSec: 180,
}

const LIFI_LEG: QuoteLeg = { ...FOREVERMONEY_LEG, protocol: "lifi", fromTokenId: USDT_ID }

const runWaitingOn = (leg: QuoteLeg, landed = LEG0_OUTPUT): SwapRun => ({
  id: "run-1",
  quote: quoteFromLegs([{ ...LEG0, toTokenId: leg.fromTokenId }, leg], {
    protocol: leg.protocol,
    decentralisationScore: 2,
    providerLogo: "",
    providerName: "Provider",
  }),
  slippage: 0.005,
  legs: [{ at: "landed", hash: `0x${"11".repeat(32)}`, amount: landed }, { at: "ready" }],
})

const FOREVERMONEY_RUN = runWaitingOn(FOREVERMONEY_LEG)
const LIFI_RUN = runWaitingOn(LIFI_LEG)

const lifiBuilt = (): BuiltLeg =>
  builtLeg(SPENDER, {
    type: "swap-lifi",
    protocolName: "fly",
    fromTokenId: USDT_ID,
    toTokenId: "8453:evm-native",
    fromAmount: "1",
    toAmount: "1",
    to: RECIPIENT,
  })

const approveData = (amount: bigint) =>
  encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [SPENDER, amount] })

const ReadyLeg = ({ run }: { run: SwapRun }) => (
  <LegSignButton button={useLegSigning(run, 1, legSent).button} />
)

const renderSign = (run = FOREVERMONEY_RUN) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ReadyLeg run={run} />
    </QueryClientProvider>
  )

const buttonLabel = () => screen.getByRole("button").textContent

const BuiltAmounts = ({ run }: { run: SwapRun }) => {
  const { built } = useLegSigning(run, 1, legSent)
  return <output>{built ? `${built.inputAmount} -> ${built.outputAmount}` : "building"}</output>
}

const RateDropLeg = ({ run }: { run: SwapRun }) => {
  const { built, button } = useLegSigning(run, 1, legSent)
  return (
    <>
      {built?.acceptedOutput !== undefined ? (
        <SwapRateDropNotice
          tokenId={run.quote.legs[1].toTokenId}
          amount={built.outputAmount}
          accepted={built.acceptedOutput}
        />
      ) : null}
      <LegSignButton button={button} />
    </>
  )
}

describe("useLegSigning", () => {
  beforeEach(() => {
    signer.type = "ledger-ethereum"
    legSent.mockClear()
    lifiBuildLeg.mockClear()
    lifiBuildLeg.mockImplementation(async () => lifiBuilt())
  })

  it("shows a processing button until it knows what the user signs", () => {
    ethGetTransactionsCount.mockReturnValue(new Promise(() => {}))
    renderSign()
    expect(buttonLabel()).toBe("Processing")
  })

  it("describes the leg by what the previous leg landed, not by its quote", async () => {
    ethGetTransactionsCount.mockResolvedValue(8)
    const landed = LEG0_OUTPUT - 5n
    render(
      <QueryClientProvider client={new QueryClient()}>
        <BuiltAmounts run={runWaitingOn(FOREVERMONEY_LEG, landed)} />
      </QueryClientProvider>
    )
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe(`${landed} -> 1`))
  })

  it("explains a leg that failed to build in the error's short message", async () => {
    ethGetTransactionsCount.mockResolvedValue(8)
    client.allowance.mockResolvedValue(LIFI_LEG.inputAmount)
    lifiBuildLeg.mockRejectedValue(
      Object.assign(new Error("Failed to fetch\n\nRequest body: ...\nVersion: viem@2"), {
        shortMessage: "Failed to fetch",
      })
    )
    const LegFailure = () => {
      const { signing } = useLegSigning(LIFI_RUN, 1, legSent)
      return <output>{signing?.failure}</output>
    }
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <LegFailure />
      </QueryClientProvider>
    )
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Failed to fetch"))
  })

  it("hands the run the input it built the leg on, once the leg is sent", async () => {
    ethGetTransactionsCount.mockResolvedValue(8)
    const landed = LEG0_OUTPUT - 5n
    renderSign(runWaitingOn(FOREVERMONEY_LEG, landed))
    await waitFor(() => expect(submitted).toHaveBeenCalled())

    await act(async () => {
      button.submit?.(LEG_HASH)
    })

    expect(legSent).toHaveBeenCalledWith(1, LEG_HASH, landed)
  })

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

    await waitFor(() => expect(buttonLabel()).toBe("Try again"))
    expect(screen.getByRole("button").getAttribute("aria-busy")).toBe("false")
  })

  it("retries a leg the background failed to send on the same nonce, so a leg the node took anyway cannot run twice", async () => {
    ethGetTransactionsCount.mockResolvedValue(8)
    renderSign()
    await waitFor(() =>
      expect(submitted.mock.lastCall?.[0]).toMatchObject({ payload: { nonce: 8 } })
    )

    ethGetTransactionsCount.mockClear()
    ethGetTransactionsCount.mockResolvedValue(9)
    act(() => button.sign?.())
    act(() => button.reject?.(new Error("request timed out")))

    await waitFor(() => expect(ethGetTransactionsCount).toHaveBeenCalled())
    await waitFor(() => expect(buttonLabel()).toBe("Try again"))
    expect(submitted.mock.lastCall?.[0]).toMatchObject({ payload: { nonce: 8 } })
  })

  it("does not hold the leg to the nonce of an approval that failed to send", async () => {
    signer.type = "keypair"
    ethGetTransactionsCount.mockResolvedValue(8)
    client.allowance.mockResolvedValue(0n)
    client.waitForTransactionReceipt.mockResolvedValue({ blockNumber: 100n, status: "success" })
    renderSign(LIFI_RUN)
    await waitFor(() => expect(buttonLabel()).toBe("Approve USDT"))

    act(() => button.reject?.(new Error("request timed out")))
    await waitFor(() => expect(buttonLabel()).toBe("Try again"))
    expect(submitted.mock.lastCall?.[0]).toMatchObject({ payload: { to: USDT, nonce: 8 } })

    client.allowance.mockResolvedValue(LIFI_LEG.inputAmount)
    await act(async () => {
      button.submit?.(APPROVAL_HASH)
    })

    await waitFor(() => expect(buttonLabel()).toBe("Sign"))
    expect(submitted.mock.lastCall?.[0]).toMatchObject({ payload: { to: SPENDER, nonce: 9 } })
  })

  it("approves again on a fresh nonce once the retried approval mined and reverted", async () => {
    signer.type = "keypair"
    ethGetTransactionsCount.mockResolvedValue(8)
    client.allowance.mockResolvedValue(0n)
    client.waitForTransactionReceipt.mockResolvedValue({ blockNumber: 100n, status: "reverted" })
    renderSign(LIFI_RUN)
    await waitFor(() => expect(buttonLabel()).toBe("Approve USDT"))

    act(() => button.reject?.(new Error("request timed out")))
    await waitFor(() => expect(buttonLabel()).toBe("Try again"))
    expect(submitted.mock.lastCall?.[0]).toMatchObject({ payload: { to: USDT, nonce: 8 } })

    await act(async () => {
      button.submit?.(APPROVAL_HASH)
    })

    await waitFor(() =>
      expect(submitted.mock.lastCall?.[0]).toMatchObject({ payload: { to: USDT, nonce: 9 } })
    )
    expect(buttonLabel()).toBe("Approve USDT")
  })

  it("keeps a leg that failed to send on its nonce after an approval mined, so a leg the node took cannot run twice", async () => {
    signer.type = "keypair"
    ethGetTransactionsCount.mockResolvedValue(8)
    client.allowance.mockResolvedValue(LIFI_LEG.inputAmount)
    client.waitForTransactionReceipt.mockResolvedValue({ blockNumber: 100n, status: "success" })
    renderSign(LIFI_RUN)
    await waitFor(() => expect(buttonLabel()).toBe("Sign"))

    ethGetTransactionsCount.mockResolvedValue(9)
    client.allowance.mockResolvedValue(0n)
    act(() => button.reject?.(new Error("request timed out")))
    await waitFor(() =>
      expect(submitted.mock.lastCall?.[0]).toMatchObject({ payload: { to: USDT, nonce: 9 } })
    )

    ethGetTransactionsCount.mockResolvedValue(10)
    client.allowance.mockResolvedValue(LIFI_LEG.inputAmount)
    await act(async () => {
      button.submit?.(APPROVAL_HASH)
    })

    await waitFor(() => expect(buttonLabel()).toBe("Sign"))
    expect(submitted.mock.lastCall?.[0]).toMatchObject({ payload: { to: SPENDER, nonce: 8 } })
  })

  it("signs the leg with the wallet's next nonce, priced on screen with no fee of its own", async () => {
    ethGetTransactionsCount.mockResolvedValue(8)
    renderSign()

    await waitFor(() => expect(submitted).toHaveBeenCalled())
    expect(ethGetTransactionsCount).toHaveBeenCalledWith(EVM_ADDRESS, "964")
    const [request, networkId, , isReplacement] = priced.mock.lastCall ?? []
    expect(request).toMatchObject({ nonce: 8 })
    expect(request).not.toHaveProperty("maxFeePerGas")
    expect(request).not.toHaveProperty("maxPriorityFeePerGas")
    expect(request).not.toHaveProperty("gasPrice")
    expect(networkId).toBe("964")
    expect(isReplacement).toBeUndefined()
    expect(submitted.mock.lastCall?.[0]).toMatchObject({ payload: { nonce: 8 } })
    expect(buttonLabel()).toBe("Sign on Ledger")
  })

  it("asks a keypair signer to sign, not a Ledger", async () => {
    signer.type = "keypair"
    ethGetTransactionsCount.mockResolvedValue(8)
    client.allowance.mockResolvedValue(LIFI_LEG.inputAmount)
    renderSign(LIFI_RUN)

    await waitFor(() => expect(submitted).toHaveBeenCalled())
    expect(submitted.mock.lastCall?.[0]).toMatchObject({
      payload: { to: SPENDER, nonce: 8 },
      txInfo: {
        type: "swap-lifi",
        swapRun: { firstLegHash: `0x${"11".repeat(32)}`, isLastLeg: true },
      },
    })
    expect(buttonLabel()).toBe("Sign")
  })

  it("asks for the spender's allowance before the leg when it is short, with no leg built", async () => {
    ethGetTransactionsCount.mockResolvedValue(8)
    client.allowance.mockResolvedValue(0n)
    renderSign(LIFI_RUN)

    await waitFor(() => expect(submitted).toHaveBeenCalled())
    expect(submitted.mock.lastCall?.[0]).toMatchObject({
      networkId: "1",
      payload: {
        from: EVM_ADDRESS,
        to: USDT,
        data: approveData(LIFI_LEG.inputAmount),
        value: 0n,
        nonce: 8,
      },
      txInfo: {
        type: "approve-erc20",
        tokenId: USDT_ID,
        contractAddress: SPENDER,
        amount: LIFI_LEG.inputAmount.toString(),
      },
    })
    expect(buttonLabel()).toBe("Approve USDT")
    expect(lifiBuildLeg).not.toHaveBeenCalled()
  })

  it("revokes a short non-zero allowance before it approves the amount the leg needs", async () => {
    ethGetTransactionsCount.mockResolvedValue(8)
    client.allowance.mockResolvedValue(50n)
    client.waitForTransactionReceipt.mockResolvedValue(undefined)
    renderSign(runWaitingOn({ ...LIFI_LEG, inputAmount: 100n }))

    await waitFor(() => expect(submitted).toHaveBeenCalled())
    expect(submitted.mock.lastCall?.[0]).toMatchObject({
      payload: { to: USDT, data: approveData(0n) },
      txInfo: { type: "approve-erc20", amount: "0" },
    })
    expect(buttonLabel()).toBe("Revoke Approval")

    client.allowance.mockResolvedValue(0n)
    await act(async () => {
      button.submit?.(APPROVAL_HASH)
    })

    await waitFor(() =>
      expect(submitted.mock.lastCall?.[0]).toMatchObject({
        payload: { to: USDT, data: approveData(100n) },
        txInfo: { type: "approve-erc20", amount: "100" },
      })
    )
    expect(buttonLabel()).toBe("Approve USDT")
  })

  it("builds the leg once the approval mined, priced afresh", async () => {
    signer.type = "keypair"
    ethGetTransactionsCount.mockResolvedValue(8)
    client.allowance.mockResolvedValue(0n)
    let mined: () => void = () => {}
    client.waitForTransactionReceipt.mockReturnValue(
      new Promise<void>((resolve) => {
        mined = resolve
      })
    )
    renderSign(LIFI_RUN)
    await waitFor(() => expect(buttonLabel()).toBe("Approve USDT"))
    pricing.setCustomSettings.mockClear()
    pricing.setPriority.mockClear()

    act(() => {
      button.submit?.(APPROVAL_HASH)
    })
    expect(screen.getByRole("button").getAttribute("aria-busy")).toBe("true")
    await waitFor(() =>
      expect(client.waitForTransactionReceipt).toHaveBeenCalledWith(
        expect.objectContaining({ hash: APPROVAL_HASH })
      )
    )

    client.allowance.mockResolvedValue(LIFI_LEG.inputAmount)
    ethGetTransactionsCount.mockResolvedValue(9)
    await act(async () => {
      mined()
    })

    await waitFor(() => expect(buttonLabel()).toBe("Sign"))
    expect(submitted.mock.lastCall?.[0]).toMatchObject({ payload: { to: SPENDER, nonce: 9 } })
    expect(screen.getByRole("button").getAttribute("aria-busy")).toBe("false")
    expect(legSent).not.toHaveBeenCalled()
    expect(pricing.setCustomSettings).toHaveBeenCalledWith(undefined)
    expect(pricing.setPriority).toHaveBeenCalledWith(undefined)
  })

  it("builds the leg once the approval mined, even from a node still behind the approval's block", async () => {
    signer.type = "keypair"
    ethGetTransactionsCount.mockResolvedValue(8)
    client.allowance.mockResolvedValue(0n)
    client.waitForTransactionReceipt.mockResolvedValue({ blockNumber: 100n, status: "success" })
    renderSign(LIFI_RUN)
    await waitFor(() => expect(buttonLabel()).toBe("Approve USDT"))

    client.allowance.mockImplementation(async (blockNumber) =>
      blockNumber === undefined ? 0n : LIFI_LEG.inputAmount
    )
    await act(async () => {
      button.submit?.(APPROVAL_HASH)
    })

    await waitFor(() => expect(buttonLabel()).toBe("Sign"))
    expect(client.allowance).toHaveBeenLastCalledWith(100n)
    expect(submitted.mock.lastCall?.[0]).toMatchObject({ payload: { to: SPENDER, nonce: 9 } })
  })

  it("builds the leg once after its approval mined, so the leg on screen is the one the user signs", async () => {
    signer.type = "keypair"
    ethGetTransactionsCount.mockResolvedValue(8)
    client.allowance.mockResolvedValue(0n)
    client.waitForTransactionReceipt.mockResolvedValue({ blockNumber: 100n, status: "success" })
    renderSign(LIFI_RUN)
    await waitFor(() => expect(buttonLabel()).toBe("Approve USDT"))

    client.allowance.mockResolvedValue(LIFI_LEG.inputAmount)
    await act(async () => {
      button.submit?.(APPROVAL_HASH)
    })
    await waitFor(() => expect(buttonLabel()).toBe("Sign"))
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)))

    expect(lifiBuildLeg).toHaveBeenCalledTimes(1)
  })

  it("keeps the approval sent until the leg after it is built, so the leg never opens early", async () => {
    signer.type = "keypair"
    ethGetTransactionsCount.mockResolvedValue(8)
    client.allowance.mockResolvedValue(0n)
    client.waitForTransactionReceipt.mockResolvedValue({ blockNumber: 100n, status: "success" })
    const seen: string[] = []
    const ApprovalProgress = () => {
      const { signing, button } = useLegSigning(LIFI_RUN, 1, legSent)
      seen.push(`${signing?.signs}:${signing?.isApprovalPending}`)
      return <LegSignButton button={button} />
    }
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ApprovalProgress />
      </QueryClientProvider>
    )
    await waitFor(() => expect(buttonLabel()).toBe("Approve USDT"))

    client.allowance.mockResolvedValue(LIFI_LEG.inputAmount)
    seen.length = 0
    await act(async () => {
      button.submit?.(APPROVAL_HASH)
    })

    await waitFor(() => expect(buttonLabel()).toBe("Sign"))
    expect(seen).not.toContain("undefined:false")
    expect(seen.at(-1)).toBe("leg:false")
  })

  it("warns of a rate that dropped since the swap started and still lets the user sign", async () => {
    signer.type = "keypair"
    ethGetTransactionsCount.mockResolvedValue(8)
    client.allowance.mockResolvedValue(LIFI_LEG.inputAmount)
    lifiBuildLeg.mockImplementation(async () => ({
      ...lifiBuilt(),
      expectedOutput: 1_500_000_000_000_000_000n,
      acceptedOutput: 2_000_000_000_000_000_000n,
    }))
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RateDropLeg run={LIFI_RUN} />
      </QueryClientProvider>
    )

    await waitFor(() =>
      expect(screen.getByRole("note").textContent).toBe(
        "The rate for this step dropped since the swap started. You will receive at least 1.5 ETH instead of 2 ETH."
      )
    )
    expect(buttonLabel()).toBe("Sign")
    expect(screen.getByRole("button").hasAttribute("disabled")).toBe(false)
  })
})
