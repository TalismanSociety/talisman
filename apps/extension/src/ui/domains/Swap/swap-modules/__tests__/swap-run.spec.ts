import type { Hex, PublicClient } from "viem"
import { describe, expect, it, vi } from "vitest"
import { bittensorEvmSwapModule } from "../bittensor-evm-swap-module"
import type {
  BaseQuote,
  BuiltLeg,
  LegOutcome,
  QuoteLeg,
  SettledTransaction,
  SwapEnv,
  SwapModule,
} from "../common.swap-module"
import {
  legInput,
  legSent,
  legSettled,
  nextLegStep,
  readLegBalance,
  type SwapRun,
  settleRunLeg,
  settlingLeg,
  startRun,
} from "../swap-run"

const SUB_ADDRESS = "5GW7UHZ9tLocJUaMXFWkr48QHgVoq5tVR1az62mknFacM3cu"
const EVM_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
const RECIPIENT = "0x70045A9F59A354550EC0272f73AAe03B01Fb8a7a"
const USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"
const SPENDER = "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE"
const HASH_0: Hex = `0x${"aa".repeat(32)}`
const HASH_1: Hex = `0x${"bb".repeat(32)}`
const WEI_PER_RAO = 1_000_000_000n

const depositLeg: QuoteLeg = {
  protocol: "bittensor-evm",
  fromTokenId: "bittensor:substrate-native",
  toTokenId: "964:evm-native",
  signer: SUB_ADDRESS,
  recipient: EVM_ADDRESS,
  inputAmount: 2_000_000_000n,
  outputAmount: 1_999_999_500n * WEI_PER_RAO,
  fees: [],
  timeInSec: 12,
  data: { edHeldRao: "500" },
}

const bridgeLeg: QuoteLeg = {
  protocol: "lifi",
  fromTokenId: `8453:evm-erc20:${USDC}`,
  toTokenId: "1:evm-native",
  signer: EVM_ADDRESS,
  recipient: RECIPIENT,
  inputAmount: 1_000_000n,
  outputAmount: 400_000_000_000_000n,
  fees: [],
  timeInSec: 60,
}

const quoteOf = (legs: QuoteLeg[]) =>
  ({
    protocol: legs[0].protocol,
    decentralisationScore: 1,
    providerLogo: "",
    providerName: "",
    legs,
    inputAmountBN: legs[0].inputAmount,
    outputAmountBN: legs[legs.length - 1].outputAmount,
    fees: [],
    timeInSec: 0,
  }) as unknown as BaseQuote

const twoLegs = quoteOf([depositLeg, bridgeLeg])

const landed = (hash: Hex, amount: bigint): LegOutcome => ({ landed: true, hash, amount })

const readyRun = (amount: bigint): SwapRun =>
  legSettled(
    startRun(twoLegs, 0.005, { hash: HASH_0, input: 2_000_000_000n }),
    0,
    landed(HASH_0, amount)
  )

describe("a swap run", () => {
  it("starts with the first leg sent and the others queued", () => {
    const run = startRun(twoLegs, 0.005, { hash: HASH_0, input: 1_500_000_000n })
    expect(run.legs).toEqual([
      { at: "sent", hash: HASH_0, input: 1_500_000_000n },
      { at: "queued" },
    ])
    expect(run.id).not.toBe(startRun(twoLegs, 0.005, { hash: HASH_0, input: 1n }).id)
    expect(settlingLeg(run)).toBe(0)
  })

  it("readies the next leg once a leg landed, and never settles the last one", () => {
    const run = readyRun(900_000n)
    expect(run.legs).toEqual([{ at: "landed", hash: HASH_0, amount: 900_000n }, { at: "ready" }])

    const sent = legSent(run, 1, HASH_1, 900_000n)
    expect(sent.legs[1]).toEqual({ at: "sent", hash: HASH_1, input: 900_000n })
    expect(settlingLeg(sent)).toBeNull()
  })

  it("stops on a leg that did not land and leaves the later legs unstarted", () => {
    const run = startRun(twoLegs, 0.005, { hash: HASH_0, input: 1n })
    const stopped = legSettled(run, 0, { landed: false, hash: HASH_0, stop: "cancelled" })
    expect(stopped.legs).toEqual([
      { at: "stopped", hash: HASH_0, stop: "cancelled" },
      { at: "queued" },
    ])
    expect(settlingLeg(stopped)).toBeNull()
  })

  it("ignores a settle or send for a leg not waiting on it", () => {
    const run = readyRun(900_000n)
    expect(legSettled(run, 0, landed(HASH_0, 1n))).toBe(run)
    expect(legSettled(run, 1, landed(HASH_1, 1n))).toBe(run)
    expect(legSent(run, 0, HASH_1, 1n)).toBe(run)
  })
})

describe("legInput", () => {
  it("spends the least of what landed, what was quoted and what the signer holds", () => {
    expect(legInput(5n, 7n, 9n)).toBe(5n)
    expect(legInput(9n, 5n, 7n)).toBe(5n)
    expect(legInput(9n, 7n, 5n)).toBe(5n)
  })

  it("refuses a leg nothing arrived for", () => {
    expect(() => legInput(5n, 7n, 0n)).toThrow("Nothing arrived from the previous leg")
  })
})

type FakeChain = { usdc?: bigint; allowance?: bigint; native?: bigint }

const fakeClient = ({ usdc = 0n, allowance = 0n, native = 0n }: FakeChain) =>
  ({
    readContract: vi.fn(async ({ functionName }: { functionName: string }) =>
      functionName === "allowance" ? allowance : usdc
    ),
    getBalance: vi.fn(async () => native),
  }) as unknown as PublicClient & { readContract: ReturnType<typeof vi.fn> }

const BUILT = { expectedOutput: 1n } as BuiltLeg

const fakeModule = (approve: boolean) =>
  ({
    protocol: "lifi",
    getApprovalInfo: () =>
      approve
        ? {
            contractAddress: SPENDER,
            tokenAddress: USDC,
            amount: bridgeLeg.inputAmount,
            chainId: 8453,
            fromAddress: EVM_ADDRESS,
            protocolName: "LI.FI",
          }
        : null,
    buildLeg: vi.fn(async () => BUILT),
  }) as unknown as SwapModule & { buildLeg: ReturnType<typeof vi.fn> }

describe("nextLegStep", () => {
  it("asks for the allowance first and builds nothing", async () => {
    const module = fakeModule(true)
    const client = fakeClient({ usdc: 2_000_000n, allowance: 0n })
    const step = await nextLegStep({ run: readyRun(900_000n), index: 1, module, client })
    expect(step).toMatchObject({ signs: "approval", allowance: "approve" })
    expect(module.buildLeg).not.toHaveBeenCalled()
  })

  it("reads the allowance at the block of the approval the screen saw mine", async () => {
    const client = fakeClient({ usdc: 2_000_000n, allowance: 1_000_000n })
    await nextLegStep({
      run: readyRun(900_000n),
      index: 1,
      module: fakeModule(true),
      client,
      allowanceAt: 42n,
    })
    expect(client.readContract).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: "allowance", blockNumber: 42n })
    )
  })

  it("builds the leg on what landed, with the run's slippage and no exchange", async () => {
    const module = fakeModule(true)
    const client = fakeClient({ usdc: 2_000_000n, allowance: 1_000_000n })
    const step = await nextLegStep({ run: readyRun(900_000n), index: 1, module, client })
    expect(step).toEqual({ signs: "leg", input: 900_000n, built: BUILT })
    expect(module.buildLeg).toHaveBeenCalledWith({
      leg: bridgeLeg,
      input: 900_000n,
      context: { platform: "ethereum" },
      exchange: null,
      slippage: 0.005,
    })
  })

  it("refuses a leg whose previous leg has not landed", async () => {
    const run = startRun(twoLegs, 0.005, { hash: HASH_0, input: 1n })
    await expect(
      nextLegStep({ run, index: 1, module: fakeModule(false), client: fakeClient({}) })
    ).rejects.toThrow("This leg is not ready to sign")
  })
})

describe("readLegBalance", () => {
  it("keeps the existential deposit back on Bittensor EVM", async () => {
    const leg = { ...bridgeLeg, fromTokenId: "964:evm-native" }
    expect(await readLegBalance(fakeClient({ native: 10n ** 18n }), leg)).toBe(
      10n ** 18n - 500n * WEI_PER_RAO
    )
  })

  it("reads an ERC20 balance whole", async () => {
    expect(await readLegBalance(fakeClient({ usdc: 7n }), bridgeLeg)).toBe(7n)
  })
})

describe("settleRunLeg", () => {
  const run = startRun(twoLegs, 0.005, { hash: HASH_0, input: 1_500_000_000n })

  it("settles the sent leg with what it was built to spend", async () => {
    const settleLeg = vi.fn(async () => landed(HASH_0, 3n))
    const signal = new AbortController().signal
    expect(await settleRunLeg(run, 0, [{ protocol: "bittensor-evm", settleLeg }], signal)).toEqual(
      landed(HASH_0, 3n)
    )
    expect(settleLeg).toHaveBeenCalledWith(
      { leg: depositLeg, hash: HASH_0, input: 1_500_000_000n },
      signal
    )
  })

  it("leaves a leg it cannot settle untracked", async () => {
    const settleLeg = vi.fn(async () => {
      throw new Error("rpc down")
    })
    expect(
      await settleRunLeg(
        run,
        0,
        [{ protocol: "bittensor-evm", settleLeg }],
        new AbortController().signal
      )
    ).toEqual({ landed: false, hash: HASH_0, stop: "untracked" })
  })

  it("rejects once the screen closed", async () => {
    const controller = new AbortController()
    const settleLeg = vi.fn(async () => {
      controller.abort()
      throw controller.signal.reason
    })
    await expect(
      settleRunLeg(run, 0, [{ protocol: "bittensor-evm", settleLeg }], controller.signal)
    ).rejects.toThrow()
  })
})

describe("Bittensor EVM settleLeg", () => {
  const settleWith = (settled: SettledTransaction, leg = depositLeg) => {
    const env = { waitForTransaction: vi.fn(async () => settled) } as unknown as SwapEnv
    const settle = bittensorEvmSwapModule.settleLeg
    if (!settle) throw new Error("Bittensor EVM must settle its legs")
    return settle({ leg, hash: HASH_0, input: 1_500_000_000n }, env, new AbortController().signal)
  }

  it("delivers the deposit less the existential deposit an empty EVM account keeps", async () => {
    expect(await settleWith({ landed: true, hash: HASH_0 })).toEqual(
      landed(HASH_0, (1_500_000_000n - 500n) * WEI_PER_RAO)
    )
  })

  it("delivers the whole deposit to a funded EVM account", async () => {
    expect(
      await settleWith({ landed: true, hash: HASH_0 }, { ...depositLeg, data: { edHeldRao: "0" } })
    ).toEqual(landed(HASH_0, 1_500_000_000n * WEI_PER_RAO))
  })

  it("passes a deposit that did not land through", async () => {
    expect(await settleWith({ landed: false, hash: HASH_0, stop: "failed" })).toEqual({
      landed: false,
      hash: HASH_0,
      stop: "failed",
    })
  })
})
