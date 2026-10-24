import type { SwapEnv } from "@core/domains/swaps/env"
import type { SentLeg } from "@core/domains/swaps/types"
import type { Network } from "@talismn/chaindata-provider"
import BigNumber from "bignumber.js"
import {
  decodeFunctionData,
  encodeFunctionData,
  keccak256,
  type PublicClient,
  parseTransaction,
  serializeTransaction,
  type TransactionSerializable,
} from "viem"
import { beforeEach, describe, expect, it, vi } from "vitest"

// --- Mocks ---

const {
  mockReadContract,
  mockEstimateGas,
  mockGetGasPrice,
  mockGetBlockNumber,
  mockGetBlock,
  mockEstimateFeesPerGas,
  mockGetTransactionReceipt,
  mockGetTransactionCount,
  mockGetTransaction,
  mockPrepareTransactionRequest,
  forevermoneyConfig,
} = vi.hoisted(() => ({
  mockReadContract: vi.fn(),
  mockEstimateGas: vi.fn(),
  mockGetGasPrice: vi.fn(),
  mockGetBlockNumber: vi.fn(),
  mockGetBlock: vi.fn(),
  mockEstimateFeesPerGas: vi.fn(),
  mockGetTransactionReceipt: vi.fn(),
  mockGetTransactionCount: vi.fn(),
  mockGetTransaction: vi.fn(),
  mockPrepareTransactionRequest: vi.fn(),
  forevermoneyConfig: { feeRecipients: {} as Record<string, string>, feeBps: 0 },
}))

vi.mock("@core/domains/app/store.remoteConfig", () => ({
  remoteConfigStore: { get: vi.fn(async () => ({ forevermoney: forevermoneyConfig })) },
}))

const NETWORKS: Record<string, unknown> = {
  "8453": { id: "8453", platform: "ethereum", nativeTokenId: "8453:evm-native", name: "Base" },
  "4663": { id: "4663", platform: "ethereum", nativeTokenId: "4663:evm-native", name: "Robinhood" },
  "964": {
    id: "964",
    platform: "ethereum",
    nativeTokenId: "964:evm-native",
    name: "Bittensor EVM",
  },
}

vi.mock("../forevermoney-logo.svg?url", () => ({ default: "forevermoney-logo.svg" }))

const { forevermoneySwapModule } = await import("../forevermoney")
const { abiForevermoneyAlphaGateway, abiForevermoneySpokeGateway } = await import(
  "@core/domains/forevermoney/abi"
)
const { frontierH160ToSs58Mirror, frontierSs58ToPublicKeyHex } = await import("@talismn/crypto")

// --- Fixtures ---

const BASE_WTAO = "8453:evm-erc20:0xf3081494b87e8d5fb7960f066e931d1d0e6e3d67"
const ROBINHOOD_WTAO = "4663:evm-erc20:0xf3081494b87e8d5fb7960f066e931d1d0e6e3d67"
const SUB_TAO = "bittensor:substrate-native"
const EVM_TAO = "964:evm-native"

const BASE_GATEWAY = "0x1da2415229b614C787e145D1D7346eb496319C52"
const OUTBOUND_ALPHA_GATEWAY = "0xd5Fa238aa4177f6c1341491969d9cBeec94EEd69"
const INBOUND_ALPHA_GATEWAY = "0xcd0C6d98D0A126B1c113d15b4c28F38321437787"
const INBOUND_DESTINATION_GAS_LIMIT = 3_500_000n
const BASE_SELECTOR = 15971525489660198786n

const SUB_ADDRESS = "5GW7UHZ9tLocJUaMXFWkr48QHgVoq5tVR1az62mknFacM3cu"
const EVM_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
const OTHER_EVM_ADDRESS = "0x70045A9F59A354550EC0272f73AAe03B01Fb8a7a"

const WEI_PER_RAO = 1_000_000_000n
const ONE_TAO_WEI = 10n ** 18n
const CCIP_FEE = 1_000_000_000_000_000n // 0.001
const FEE_WITH_BUFFER = (CCIP_FEE * 102n) / 100n

const signal = new AbortController().signal

// prepareTransactionRequest returns the request unchanged so we can observe what was built
const evmClient = (networkId: string) => ({
  readContract: (args: unknown) => mockReadContract(networkId, args),
  estimateGas: mockEstimateGas,
  getGasPrice: mockGetGasPrice,
  getBlockNumber: () => mockGetBlockNumber(networkId),
  getBlock: mockGetBlock,
  estimateFeesPerGas: mockEstimateFeesPerGas,
  getTransactionReceipt: mockGetTransactionReceipt,
  getTransactionCount: mockGetTransactionCount,
  getTransaction: mockGetTransaction,
  prepareTransactionRequest: mockPrepareTransactionRequest,
})

const env: SwapEnv = {
  getNetwork: async (id) => (NETWORKS[id] as Network | undefined) ?? null,
  getToken: async () => null,
  evmClient: async (networkId) => evmClient(networkId) as unknown as PublicClient,
  substrateApi: async () => {
    throw new Error("ForeverMoney reads no substrate network")
  },
  substrateSend: async () => {
    throw new Error("ForeverMoney reads no substrate network")
  },
  decodeExtrinsicEvents: async () => {
    throw new Error("ForeverMoney reads no substrate network")
  },
}

type ChainState = {
  bucketTokens: bigint
  bucketEnabled: boolean
  paused: boolean
  migrationTarget: string
  laneAllowed: boolean
  fee: bigint
}

const state: ChainState = {
  bucketTokens: 0n,
  bucketEnabled: true,
  paused: false,
  migrationTarget: "0x0000000000000000000000000000000000000000",
  laneAllowed: true,
  fee: CCIP_FEE,
}

const PARTNER = "0x90F79bf6EB2c4f870365E785982E1f101E93b906"
const RAO_ROUND_UP = (wei: bigint) => ((wei + WEI_PER_RAO - 1n) / WEI_PER_RAO) * WEI_PER_RAO

const readContractImpl = async (
  _networkId: string,
  args: { functionName: string; args?: readonly unknown[] }
) => {
  switch (args.functionName) {
    case "quoteBridgeToFinneyWithFee": {
      const [, amount, , , { bps }] = args.args as [
        unknown,
        bigint,
        unknown,
        unknown,
        { bps: number },
      ]
      return [state.fee, (amount * BigInt(bps)) / 10_000n, amount]
    }
    case "quoteBridgeOutWithFee": {
      const [, , , minted, taoAmount, , { bps }] = args.args as [
        unknown,
        unknown,
        unknown,
        bigint,
        bigint,
        unknown,
        { bps: number },
      ]
      return [state.fee, RAO_ROUND_UP((taoAmount * BigInt(bps)) / 10_000n), 0n, minted]
    }
    case "getCurrentOutboundRateLimiterState":
      return {
        tokens: state.bucketTokens,
        lastUpdated: 0,
        isEnabled: state.bucketEnabled,
        capacity: 5000n * ONE_TAO_WEI,
        rate: 0n,
      }
    case "isPaused":
      return state.paused
    case "migrationTarget":
      return state.migrationTarget
    case "allowedLane":
      return state.laneAllowed
    case "quoteBridgeToFinney":
    case "quoteBridgeOut":
      return state.fee
    default:
      throw new Error(`unexpected read ${args.functionName}`)
  }
}

const quote = (
  fromTokenId: string,
  toTokenId: string,
  fromAmount: bigint,
  toAddress: string | null
) =>
  forevermoneySwapModule.getQuote(
    { fromTokenId, toTokenId, fromAmount, fromAddress: EVM_ADDRESS, toAddress, input: "exact" },
    env,
    signal
  )

const single = <T>(q: T | T[] | null) => (Array.isArray(q) ? q[0] : q)

const quotedLeg = async (
  fromTokenId: string,
  toTokenId: string,
  fromAmount: bigint,
  toAddress: string
) => {
  const q = single(await quote(fromTokenId, toTokenId, fromAmount, toAddress))
  if (!q) throw new Error("expected a quote")
  return q.legs[0]
}

const buildLeg = async (
  fromTokenId: string,
  toTokenId: string,
  fromAmount: bigint,
  toAddress: string
) =>
  forevermoneySwapModule.buildLeg(
    {
      leg: await quotedLeg(fromTokenId, toTokenId, fromAmount, toAddress),
      input: fromAmount,
      context: { platform: "ethereum" },
      slippage: 0,
    },
    env
  )

const buildTx = async (
  fromTokenId: string,
  toTokenId: string,
  fromAmount: bigint,
  toAddress: string
) => {
  const { transaction } = await buildLeg(fromTokenId, toTokenId, fromAmount, toAddress)
  if (transaction.platform !== "ethereum") throw new Error("expected an ethereum tx")
  return transaction.transaction
}

beforeEach(() => {
  vi.clearAllMocks()
  Object.assign(forevermoneyConfig, { feeRecipients: {}, feeBps: 0 })
  Object.assign(state, {
    bucketTokens: 5000n * ONE_TAO_WEI,
    bucketEnabled: true,
    paused: false,
    migrationTarget: "0x0000000000000000000000000000000000000000",
    laneAllowed: true,
    fee: CCIP_FEE,
  })
  mockReadContract.mockImplementation(readContractImpl)
  mockEstimateGas.mockResolvedValue(200_000n)
  mockGetGasPrice.mockResolvedValue(10n)
  mockGetBlockNumber.mockImplementation(async (networkId: string) =>
    networkId === "964" ? 7_000_000n : 50_000_000n
  )
  mockEstimateFeesPerGas.mockResolvedValue({ maxFeePerGas: 10n, maxPriorityFeePerGas: 1n })
  mockPrepareTransactionRequest.mockImplementation(async (request: unknown) => request)
})

describe("forevermoneySwapModule assets", () => {
  it("lists spoke wTAO and Bittensor EVM TAO as sources", async () => {
    expect(await forevermoneySwapModule.getFromAssets(signal)).toEqual([
      BASE_WTAO,
      EVM_TAO,
      ROBINHOOD_WTAO,
    ])
  })

  it("pairs each source with its bridge destinations", async () => {
    expect(await forevermoneySwapModule.getToAssets(BASE_WTAO, signal)).toEqual([SUB_TAO, EVM_TAO])
    expect(await forevermoneySwapModule.getToAssets(EVM_TAO, signal)).toEqual([
      BASE_WTAO,
      ROBINHOOD_WTAO,
    ])
    expect(await forevermoneySwapModule.getToAssets(SUB_TAO, signal)).toEqual([])
  })
})

describe("forevermoneySwapModule getQuote", () => {
  it("returns null for an unsupported pair", async () => {
    expect(await quote(SUB_TAO, BASE_WTAO, ONE_TAO_WEI, EVM_ADDRESS)).toBeNull()
  })

  it("quotes 1:1 in rao for a spoke to substrate bridge with the fee in the spoke gas token", async () => {
    const q = single(await quote(BASE_WTAO, SUB_TAO, ONE_TAO_WEI + 123n, SUB_ADDRESS))

    expect(q?.protocol).toBe("forevermoney")
    expect(q?.providerName).toBe("ForeverMoney")
    expect(q?.inputAmountBN).toBe(ONE_TAO_WEI + 123n)
    expect(q?.outputAmountBN).toBe(ONE_TAO_WEI / WEI_PER_RAO)
    expect(q?.fees.map((f) => [f.name, f.tokenId, f.amount.toFixed()])).toEqual([
      ["Chainlink CCIP Fee", "8453:evm-native", "0.00102"],
      ["Est. Gas Fees", "8453:evm-native", "0.000000000002"],
    ])
    expect(q?.timeInSec).toBe(1800)
    expect(q?.notice).toContain("Experimental")
    expect(q?.maxNativeTokenGasBuffer).toBeUndefined()
  })

  it("quotes the bridge fee even while the allowance is missing and gas cannot be estimated", async () => {
    mockEstimateGas.mockRejectedValue(new Error("transfer amount exceeds allowance"))

    const q = single(await quote(BASE_WTAO, SUB_TAO, ONE_TAO_WEI, SUB_ADDRESS))

    expect(q?.fees.map((f) => f.name)).toEqual(["Chainlink CCIP Fee"])
  })

  it("quotes 1:1 in wei for a spoke to EVM bridge", async () => {
    const q = single(await quote(BASE_WTAO, EVM_TAO, ONE_TAO_WEI, EVM_ADDRESS))

    expect(q?.outputAmountBN).toBe(ONE_TAO_WEI)
  })

  it("adds the buffered fee to the native buffer for an outbound bridge", async () => {
    const q = single(await quote(EVM_TAO, BASE_WTAO, ONE_TAO_WEI, EVM_ADDRESS))

    expect(q?.outputAmountBN).toBe(ONE_TAO_WEI)
    expect(q?.fees[0]).toMatchObject({
      name: "Chainlink CCIP Fee",
      tokenId: "964:evm-native",
      additional: true,
    })
    expect(q?.fees[0]?.amount.toFixed()).toBe("0.00102")
    expect(q?.maxNativeTokenGasBuffer).toBe(FEE_WITH_BUFFER.toString())
    expect(q?.timeInSec).toBe(180)
  })

  it("rejects a liquid inbound amount below 0.01 TAO", async () => {
    await expect(quote(BASE_WTAO, SUB_TAO, 10n ** 15n, SUB_ADDRESS)).rejects.toThrow(
      "minimum is 0.01 TAO"
    )
  })

  it("rejects an outbound amount below 0.002 TAO", async () => {
    await expect(quote(EVM_TAO, BASE_WTAO, 10n ** 14n, EVM_ADDRESS)).rejects.toThrow(
      "minimum is 0.002 TAO"
    )
  })

  it("rejects an amount above the rate limiter bucket", async () => {
    state.bucketTokens = ONE_TAO_WEI / 2n

    await expect(quote(EVM_TAO, BASE_WTAO, ONE_TAO_WEI, EVM_ADDRESS)).rejects.toThrow(
      "rate limit reached, at most 0.5 TAO"
    )
  })

  it("ignores the bucket when the rate limiter is disabled", async () => {
    state.bucketTokens = 0n
    state.bucketEnabled = false

    expect(await quote(EVM_TAO, BASE_WTAO, ONE_TAO_WEI, EVM_ADDRESS)).not.toBeNull()
  })

  it("rejects while the vault is paused, migrating or the lane is closed", async () => {
    state.paused = true
    await expect(quote(BASE_WTAO, SUB_TAO, ONE_TAO_WEI, SUB_ADDRESS)).rejects.toThrow("paused")

    state.paused = false
    state.migrationTarget = OTHER_EVM_ADDRESS
    await expect(quote(BASE_WTAO, SUB_TAO, ONE_TAO_WEI, SUB_ADDRESS)).rejects.toThrow("migrating")

    state.migrationTarget = "0x0000000000000000000000000000000000000000"
    state.laneAllowed = false
    await expect(quote(EVM_TAO, BASE_WTAO, ONE_TAO_WEI, EVM_ADDRESS)).rejects.toThrow(
      "lane to Base is closed"
    )
  })

  it("checks the lane on the hub gateway of each direction", async () => {
    await quote(BASE_WTAO, SUB_TAO, ONE_TAO_WEI, SUB_ADDRESS)
    await quote(EVM_TAO, BASE_WTAO, ONE_TAO_WEI, EVM_ADDRESS)

    const laneChecks = mockReadContract.mock.calls
      .filter(([, args]) => args.functionName === "allowedLane")
      .map(([networkId, args]) => [networkId, args.address, args.args])
    expect(laneChecks).toEqual([
      ["964", INBOUND_ALPHA_GATEWAY, [BASE_SELECTOR]],
      ["964", OUTBOUND_ALPHA_GATEWAY, [BASE_SELECTOR]],
    ])
  })

  it("quotes the inbound bridge fee for the destination gas limit", async () => {
    await quote(BASE_WTAO, SUB_TAO, ONE_TAO_WEI, SUB_ADDRESS)

    const quoteCall = mockReadContract.mock.calls.find(
      ([, args]) => args.functionName === "quoteBridgeToFinney"
    )
    expect(quoteCall?.[1]).toMatchObject({ address: BASE_GATEWAY })
    expect(quoteCall?.[1].args[3]).toBe(INBOUND_DESTINATION_GAS_LIMIT)
  })

  it("rejects an absurd bridge fee", async () => {
    state.fee = ONE_TAO_WEI

    await expect(quote(BASE_WTAO, SUB_TAO, ONE_TAO_WEI, SUB_ADDRESS)).rejects.toThrow(
      "unexpectedly high"
    )
  })
})

describe("forevermoneySwapModule buildLeg", () => {
  it("re-reads the fee and records the destination start block", async () => {
    const { fees, expectedOutput, txInfo } = await buildLeg(
      BASE_WTAO,
      SUB_TAO,
      ONE_TAO_WEI + 5n,
      SUB_ADDRESS
    )

    expect(fees).toEqual([
      {
        name: "Chainlink CCIP Fee",
        tokenId: "8453:evm-native",
        amount: BigNumber("0.00102"),
        additional: true,
      },
    ])
    expect(expectedOutput).toBe(ONE_TAO_WEI / 10n ** 9n)
    expect(txInfo).toMatchObject({ destinationStartBlock: "7000000" })
  })

  it("reads the spoke block for an outbound bridge", async () => {
    const { txInfo } = await buildLeg(EVM_TAO, BASE_WTAO, ONE_TAO_WEI, EVM_ADDRESS)

    expect(txInfo).toMatchObject({ destinationStartBlock: "50000000" })
  })

  it("rejects a recipient of the wrong type", async () => {
    const build = async (fromTokenId: string, toTokenId: string, quotedTo: string, to: string) =>
      forevermoneySwapModule.buildLeg(
        {
          leg: {
            ...(await quotedLeg(fromTokenId, toTokenId, ONE_TAO_WEI, quotedTo)),
            recipient: to,
          },
          input: ONE_TAO_WEI,
          context: { platform: "ethereum" },
          slippage: 0,
        },
        env
      )

    await expect(build(BASE_WTAO, SUB_TAO, SUB_ADDRESS, EVM_ADDRESS)).rejects.toThrow(
      "Invalid recipient"
    )
    await expect(build(EVM_TAO, BASE_WTAO, EVM_ADDRESS, SUB_ADDRESS)).rejects.toThrow(
      "Invalid recipient"
    )
  })

  it("bridges spoke wTAO to a substrate address through bridgeToFinney", async () => {
    const tx = await buildTx(BASE_WTAO, SUB_TAO, ONE_TAO_WEI + 7n, SUB_ADDRESS)

    expect(tx.to).toBe(BASE_GATEWAY)
    expect(tx.value).toBe(FEE_WITH_BUFFER)
    expect(decodeFunctionData({ abi: abiForevermoneySpokeGateway, data: tx.data! })).toEqual({
      functionName: "bridgeToFinney",
      args: [
        "0xf3081494B87e8D5fb7960f066E931D1D0e6E3d67",
        ONE_TAO_WEI,
        {
          ss58: frontierSs58ToPublicKeyHex(SUB_ADDRESS),
          evmFallback: EVM_ADDRESS,
          wantLiquid: true,
          minTaoOut: ONE_TAO_WEI,
        },
        INBOUND_DESTINATION_GAS_LIMIT,
      ],
    })
  })

  it("targets the mirror of an EVM recipient for a spoke to EVM bridge", async () => {
    const tx = await buildTx(BASE_WTAO, EVM_TAO, ONE_TAO_WEI, OTHER_EVM_ADDRESS)

    const { args } = decodeFunctionData({ abi: abiForevermoneySpokeGateway, data: tx.data! })
    expect((args[2] as { ss58: string }).ss58).toBe(
      frontierSs58ToPublicKeyHex(frontierH160ToSs58Mirror(OTHER_EVM_ADDRESS, 42))
    )
  })

  it("bridges Bittensor EVM TAO to a spoke through bridgeOut with the fee on top", async () => {
    const tx = await buildTx(EVM_TAO, BASE_WTAO, ONE_TAO_WEI + 9n, OTHER_EVM_ADDRESS)

    expect(tx.to).toBe(OUTBOUND_ALPHA_GATEWAY)
    expect(tx.value).toBe(ONE_TAO_WEI + FEE_WITH_BUFFER)
    expect(decodeFunctionData({ abi: abiForevermoneyAlphaGateway, data: tx.data! })).toEqual({
      functionName: "bridgeOut",
      args: [
        BASE_SELECTOR,
        "0xC5b6C1632d34901239396F5E1BDe54B342900256",
        OTHER_EVM_ADDRESS,
        ONE_TAO_WEI,
        0n,
        ONE_TAO_WEI,
      ],
    })
  })

  it("rejects an absurd fresh fee", async () => {
    const leg = await quotedLeg(EVM_TAO, BASE_WTAO, ONE_TAO_WEI, EVM_ADDRESS)
    state.fee = ONE_TAO_WEI

    await expect(
      forevermoneySwapModule.buildLeg(
        {
          leg,
          input: ONE_TAO_WEI,
          context: { platform: "ethereum" },
          slippage: 0,
        },
        env
      )
    ).rejects.toThrow("unexpectedly high")
  })

  it("requires an EVM signing context", async () => {
    await expect(
      forevermoneySwapModule.buildLeg(
        {
          leg: await quotedLeg(BASE_WTAO, SUB_TAO, ONE_TAO_WEI, SUB_ADDRESS),
          input: ONE_TAO_WEI,
          context: { platform: "polkadot", sapi: {} as never },
          slippage: 0,
        },
        env
      )
    ).rejects.toThrow("Missing EVM context")
  })
})

describe("forevermoneySwapModule getApprovalInfo", () => {
  it("approves the exact input amount to the spoke gateway", () => {
    expect(
      forevermoneySwapModule.getApprovalInfo?.({
        fromTokenId: BASE_WTAO,
        toTokenId: SUB_TAO,
        fromAmount: ONE_TAO_WEI + 1n,
        fromAddress: EVM_ADDRESS,
        toAddress: SUB_ADDRESS,
        quoteData: null,
      })
    ).toEqual({
      contractAddress: BASE_GATEWAY,
      amount: ONE_TAO_WEI + 1n,
      tokenAddress: "0xf3081494B87e8D5fb7960f066E931D1D0e6E3d67",
      chainId: 8453,
      fromAddress: EVM_ADDRESS,
      protocolName: "ForeverMoney",
    })
  })

  it("needs no approval for the native outbound leg", () => {
    expect(
      forevermoneySwapModule.getApprovalInfo?.({
        fromTokenId: EVM_TAO,
        toTokenId: BASE_WTAO,
        fromAmount: ONE_TAO_WEI,
        fromAddress: EVM_ADDRESS,
        toAddress: EVM_ADDRESS,
        quoteData: null,
      })
    ).toBeNull()
  })
})

describe("forevermoneySwapModule partner fee", () => {
  const ONE_PERCENT_ABOVE = ONE_TAO_WEI + ONE_TAO_WEI / 100n

  const enableFee = (networkIds: string[]) =>
    Object.assign(forevermoneyConfig, {
      feeRecipients: Object.fromEntries(networkIds.map((id) => [id, PARTNER])),
      feeBps: 100,
    })

  it("carves the fee out of an inbound input and bridges through bridgeToFinneyWithFee", async () => {
    enableFee(["8453"])

    const q = single(await quote(BASE_WTAO, SUB_TAO, ONE_PERCENT_ABOVE, SUB_ADDRESS))
    expect(q?.outputAmountBN).toBe(ONE_TAO_WEI / WEI_PER_RAO)
    expect(q?.talismanFee).toBe(0.01)
    expect(q?.fees[0]).toEqual({
      name: "Talisman Fee",
      tokenId: BASE_WTAO,
      amount: BigNumber("0.01"),
    })

    const tx = await buildTx(BASE_WTAO, SUB_TAO, ONE_PERCENT_ABOVE, SUB_ADDRESS)
    expect(tx.value).toBe(FEE_WITH_BUFFER)
    const { functionName, args } = decodeFunctionData({
      abi: abiForevermoneySpokeGateway,
      data: tx.data!,
    })
    expect(functionName).toBe("bridgeToFinneyWithFee")
    expect(args[1]).toBe(ONE_TAO_WEI)
    expect(args[4]).toEqual({ recipient: PARTNER, bps: 100 })
  })

  it("carves the fee out of an outbound input and bridges through bridgeOutWithFee", async () => {
    enableFee(["964"])

    const q = single(await quote(EVM_TAO, BASE_WTAO, ONE_PERCENT_ABOVE, EVM_ADDRESS))
    expect(q?.outputAmountBN).toBe(ONE_TAO_WEI)
    expect(q?.fees[0]?.amount.toFixed()).toBe("0.01")

    const tx = await buildTx(EVM_TAO, BASE_WTAO, ONE_PERCENT_ABOVE, OTHER_EVM_ADDRESS)
    expect(tx.value).toBe(ONE_PERCENT_ABOVE + FEE_WITH_BUFFER)
    expect(decodeFunctionData({ abi: abiForevermoneyAlphaGateway, data: tx.data! })).toEqual({
      functionName: "bridgeOutWithFee",
      args: [
        BASE_SELECTOR,
        "0xC5b6C1632d34901239396F5E1BDe54B342900256",
        OTHER_EVM_ADDRESS,
        ONE_TAO_WEI,
        0n,
        ONE_TAO_WEI,
        { recipient: PARTNER, bps: 100 },
      ],
    })
  })

  it("skips the fee when the outbound top-up is below the minimum stake", async () => {
    enableFee(["964"])

    const tx = await buildTx(EVM_TAO, BASE_WTAO, ONE_TAO_WEI / 10n, OTHER_EVM_ADDRESS)
    expect(decodeFunctionData({ abi: abiForevermoneyAlphaGateway, data: tx.data! })).toMatchObject({
      functionName: "bridgeOut",
    })
  })

  it("takes no fee on a source chain without a recipient", async () => {
    enableFee(["964"])

    const q = single(await quote(BASE_WTAO, SUB_TAO, ONE_TAO_WEI, SUB_ADDRESS))
    expect(q?.fees.map((f) => f.name)).not.toContain("Talisman Fee")
    expect(q?.talismanFee).toBeUndefined()
  })

  it("never spends more than the input", async () => {
    enableFee(["8453", "964"])

    for (const fromAmount of [
      ONE_TAO_WEI + 1n,
      3n * ONE_TAO_WEI + 999_999_999n,
      202_020_202_020_202_021n,
    ]) {
      for (const [fromTokenId, toTokenId, to] of [
        [BASE_WTAO, EVM_TAO, EVM_ADDRESS],
        [EVM_TAO, BASE_WTAO, EVM_ADDRESS],
      ]) {
        const { fees, expectedOutput: amountWei } = await buildLeg(
          fromTokenId!,
          toTokenId!,
          fromAmount,
          to!
        )
        const partnerFee = fees.find((fee) => fee.name === "Talisman Fee")
        const partnerFeeWei = BigInt(partnerFee?.amount.times(10 ** 18).toFixed() ?? "0")
        expect(partnerFeeWei).toBeGreaterThan(0n)
        expect(amountWei % WEI_PER_RAO).toBe(0n)
        expect(amountWei + partnerFeeWei).toBeLessThanOrEqual(fromAmount)
      }
    }
  })

  it("states the minimum input including the fee", async () => {
    enableFee(["8453"])

    await expect(quote(BASE_WTAO, SUB_TAO, 10n ** 16n, SUB_ADDRESS)).rejects.toThrow(
      "minimum is 0.0101 TAO"
    )
  })

  it("rejects the leg when the fee was enabled after the quote", async () => {
    const leg = await quotedLeg(BASE_WTAO, SUB_TAO, ONE_PERCENT_ABOVE, SUB_ADDRESS)

    enableFee(["8453"])

    await expect(
      forevermoneySwapModule.buildLeg(
        {
          leg,
          input: ONE_PERCENT_ABOVE,
          context: { platform: "ethereum" },
          slippage: 0,
        },
        env
      )
    ).rejects.toThrow("Please select the quote again")
  })

  it("rejects a gateway fee quote that disagrees with the fee settings", async () => {
    enableFee(["8453"])
    mockReadContract.mockImplementation(
      async (networkId: string, args: { functionName: string }) =>
        args.functionName === "quoteBridgeToFinneyWithFee"
          ? [CCIP_FEE, 0n, ONE_TAO_WEI]
          : readContractImpl(networkId, args)
    )

    await expect(quote(BASE_WTAO, SUB_TAO, ONE_PERCENT_ABOVE, SUB_ADDRESS)).rejects.toThrow(
      "Unexpected ForeverMoney fee quote"
    )
  })

  it("ignores invalid fee settings", async () => {
    Object.assign(forevermoneyConfig, { feeRecipients: { "8453": "0x1234" }, feeBps: 100 })
    expect(
      single(await quote(BASE_WTAO, SUB_TAO, ONE_TAO_WEI, SUB_ADDRESS))?.talismanFee
    ).toBeUndefined()

    Object.assign(forevermoneyConfig, { feeRecipients: { "8453": PARTNER }, feeBps: 101 })
    expect(
      single(await quote(BASE_WTAO, SUB_TAO, ONE_TAO_WEI, SUB_ADDRESS))?.talismanFee
    ).toBeUndefined()
  })
})

const ALPHA_TOKEN = "0xC5b6C1632d34901239396F5E1BDe54B342900256"
const BRIDGE_OUT_GAS_RESERVE = 700_000n * 10n
const UPTO_OUTPUT = 998_979_999_000_000_000n

const quoteUpTo = (fromAmount: bigint) =>
  forevermoneySwapModule.getQuote(
    {
      fromTokenId: EVM_TAO,
      toTokenId: BASE_WTAO,
      fromAmount,
      fromAddress: EVM_ADDRESS,
      toAddress: OTHER_EVM_ADDRESS,
      input: "upTo",
    },
    env,
    signal
  )

describe("forevermoneySwapModule getQuote upTo", () => {
  it("fits the bridged amount, the buffered fee and the gas ceiling inside the input, without estimating gas", async () => {
    await quote(EVM_TAO, BASE_WTAO, ONE_TAO_WEI, OTHER_EVM_ADDRESS)
    expect(mockEstimateGas).toHaveBeenCalledTimes(1)
    mockEstimateGas.mockClear()

    const q = single(await quoteUpTo(ONE_TAO_WEI))

    expect(q?.legs).toEqual([
      {
        protocol: "forevermoney",
        fromTokenId: EVM_TAO,
        toTokenId: BASE_WTAO,
        signer: EVM_ADDRESS,
        recipient: OTHER_EVM_ADDRESS,
        inputAmount: ONE_TAO_WEI,
        outputAmount: UPTO_OUTPUT,
        fees: [
          { name: "Chainlink CCIP Fee", tokenId: "964:evm-native", amount: BigNumber("0.00102") },
          { name: "Est. Gas Fees", tokenId: "964:evm-native", amount: BigNumber("0.000000000007") },
        ],
        timeInSec: 180,
        data: { input: "upTo" },
      },
    ])
    expect(q?.maxNativeTokenGasBuffer).toBeUndefined()
    expect(mockEstimateGas).not.toHaveBeenCalled()
    expect(UPTO_OUTPUT + FEE_WITH_BUFFER + BRIDGE_OUT_GAS_RESERVE <= ONE_TAO_WEI).toBe(true)
  })

  it("reserves the bridgeOutWithFee gas ceiling and carves the partner fee out", async () => {
    Object.assign(forevermoneyConfig, { feeRecipients: { "964": PARTNER }, feeBps: 50 })

    const q = single(await quoteUpTo(ONE_TAO_WEI))

    expect(q?.legs[0].outputAmount).toBe(994_009_949_000_000_000n)
    expect(q?.fees.map((f) => [f.name, f.amount.toFixed()])).toEqual([
      ["Talisman Fee", "0.00497005"],
      ["Chainlink CCIP Fee", "0.00102"],
      ["Est. Gas Fees", "0.0000000000085"],
    ])
  })

  it("rejects an input that cannot cover the fees and the minimum", async () => {
    await expect(quoteUpTo(2n * 10n ** 15n)).rejects.toThrow("minimum is 0.002 TAO")
  })

  it("quotes nothing for an inbound direction", async () => {
    expect(
      await forevermoneySwapModule.getQuote(
        {
          fromTokenId: BASE_WTAO,
          toTokenId: SUB_TAO,
          fromAmount: ONE_TAO_WEI,
          fromAddress: EVM_ADDRESS,
          toAddress: SUB_ADDRESS,
          input: "upTo",
        },
        env,
        signal
      )
    ).toBeNull()
  })
})

describe("forevermoneySwapModule buildLeg upTo", () => {
  it("spends what landed: the fee and the gas reserve fit inside the input", async () => {
    const q = single(await quoteUpTo(ONE_TAO_WEI))
    if (!q) throw new Error("expected a quote")

    const built = await forevermoneySwapModule.buildLeg(
      { leg: q.legs[0], input: UPTO_OUTPUT, context: { platform: "ethereum" }, slippage: 0.005 },
      env
    )
    if (built.transaction.platform !== "ethereum") throw new Error("expected an ethereum tx")

    const amount = 997_959_998_000_000_000n
    expect(built.expectedOutput).toBe(amount)
    expect(built.transaction.transaction.value).toBe(amount + FEE_WITH_BUFFER)
    expect(
      decodeFunctionData({
        abi: abiForevermoneyAlphaGateway,
        data: built.transaction.transaction.data!,
      })
    ).toEqual({
      functionName: "bridgeOut",
      args: [BASE_SELECTOR, ALPHA_TOKEN, OTHER_EVM_ADDRESS, amount, 0n, amount],
    })
    expect(built.fees).toEqual([
      { name: "Chainlink CCIP Fee", tokenId: "964:evm-native", amount: BigNumber("0.00102") },
    ])
    expect(built.txInfo).toMatchObject({
      fromAmount: UPTO_OUTPUT.toString(),
      toAmount: amount.toString(),
    })
  })
  it("never spends past the input when the fees rose since the fit", async () => {
    const q = single(await quoteUpTo(ONE_TAO_WEI))
    if (!q) throw new Error("expected a quote")
    mockPrepareTransactionRequest.mockImplementation(async (request: object) => ({
      gas: 800_000n,
      maxFeePerGas: 10_000n,
      maxPriorityFeePerGas: 1_000n,
      ...request,
    }))

    const built = await forevermoneySwapModule.buildLeg(
      { leg: q.legs[0], input: UPTO_OUTPUT, context: { platform: "ethereum" }, slippage: 0.005 },
      env
    )
    if (built.transaction.platform !== "ethereum") throw new Error("expected an ethereum tx")

    const { value = 0n, gas = 0n, maxFeePerGas = 0n } = built.transaction.transaction
    expect(value + gas * maxFeePerGas <= UPTO_OUTPUT).toBe(true)
  })
})

describe("forevermoneySwapModule boundLeg", () => {
  const bound = async (slippage: number) => {
    const leg = await quotedLeg(EVM_TAO, BASE_WTAO, ONE_TAO_WEI, OTHER_EVM_ADDRESS)
    return forevermoneySwapModule.boundLeg({ leg, slippage, maxSpend: ONE_TAO_WEI }, env)
  }

  it("pins bridgeOut to the recipient with the two amount words free", async () => {
    expect(await bound(0.005)).toEqual({
      platform: "ethereum",
      chainId: 964,
      signer: EVM_ADDRESS,
      to: OUTBOUND_ALPHA_GATEWAY,
      calls: [
        {
          template: encodeFunctionData({
            abi: abiForevermoneyAlphaGateway,
            functionName: "bridgeOut",
            args: [BASE_SELECTOR, ALPHA_TOKEN, OTHER_EVM_ADDRESS, 0n, 0n, 0n],
          }),
          amountSlots: [3, 5],
          maxNetworkFee: "21000000",
        },
      ],
      floor: "990000000000000000",
      maxSpend: "1000000000000000000",
    })
  })

  it("uses the user's slippage for the floor when it is above 1%", async () => {
    expect((await bound(0.02))?.floor).toBe("980000000000000000")
  })

  it("also allows bridgeOutWithFee with the partner tuple pinned when a fee is configured", async () => {
    Object.assign(forevermoneyConfig, { feeRecipients: { "964": PARTNER }, feeBps: 50 })

    expect((await bound(0.005))?.calls).toEqual([
      {
        template: encodeFunctionData({
          abi: abiForevermoneyAlphaGateway,
          functionName: "bridgeOut",
          args: [BASE_SELECTOR, ALPHA_TOKEN, OTHER_EVM_ADDRESS, 0n, 0n, 0n],
        }),
        amountSlots: [3, 5],
        maxNetworkFee: "21000000",
      },
      {
        template: encodeFunctionData({
          abi: abiForevermoneyAlphaGateway,
          functionName: "bridgeOutWithFee",
          args: [
            BASE_SELECTOR,
            ALPHA_TOKEN,
            OTHER_EVM_ADDRESS,
            0n,
            0n,
            0n,
            { recipient: PARTNER, bps: 50 },
          ],
        }),
        amountSlots: [3, 5],
        maxNetworkFee: "25500000",
      },
    ])
  })

  it("binds no inbound leg", async () => {
    const leg = await quotedLeg(BASE_WTAO, SUB_TAO, ONE_TAO_WEI, SUB_ADDRESS)
    expect(
      await forevermoneySwapModule.boundLeg({ leg, slippage: 0.005, maxSpend: ONE_TAO_WEI }, env)
    ).toBeNull()
  })
})

describe("forevermoneySwapModule observeLeg", () => {
  const TX_HASH = `0x${"dd".repeat(32)}` as const
  const BRIDGE_DATA = encodeFunctionData({
    abi: abiForevermoneyAlphaGateway,
    functionName: "bridgeOut",
    args: [BASE_SELECTOR, ALPHA_TOKEN, OTHER_EVM_ADDRESS, ONE_TAO_WEI, 0n, ONE_TAO_WEI],
  })
  const RAW = serializeTransaction({
    type: "eip1559",
    chainId: 964,
    nonce: 12,
    to: OUTBOUND_ALPHA_GATEWAY,
    data: BRIDGE_DATA,
    value: ONE_TAO_WEI + FEE_WITH_BUFFER,
    gas: 700_000n,
    maxFeePerGas: 10n,
    maxPriorityFeePerGas: 1n,
  })

  const sent = (raw?: `0x${string}`): SentLeg => ({
    hash: TX_HASH,
    nonce: 12,
    sentAt: 0,
    evidence: raw ? { platform: "ethereum", raw } : { platform: "ethereum" },
    row: null,
  })

  const observe = async (sentLeg: SentLeg) =>
    forevermoneySwapModule.observeLeg(
      { leg: await quotedLeg(EVM_TAO, BASE_WTAO, ONE_TAO_WEI, OTHER_EVM_ADDRESS), sent: sentLeg },
      env
    )

  const FINALISED = 6_999_990n
  const receipt = (status: "success" | "reverted", blockNumber = FINALISED) => ({
    status,
    blockNumber,
  })

  beforeEach(() => {
    mockGetBlock.mockResolvedValue({ number: FINALISED })
  })

  const noReceipt = () =>
    mockGetTransactionReceipt.mockRejectedValue(
      Object.assign(new Error("not found"), { name: "TransactionReceiptNotFoundError" })
    )

  it("lands with the bridged amount read from the mined transaction", async () => {
    mockGetTransactionReceipt.mockResolvedValue(receipt("success"))
    mockGetTransactionCount.mockResolvedValue(13)
    mockGetTransaction.mockResolvedValue({
      input: BRIDGE_DATA,
      value: ONE_TAO_WEI + FEE_WITH_BUFFER,
    })

    expect(await observe(sent())).toEqual({ status: "landed", hash: TX_HASH, amount: ONE_TAO_WEI })
    expect(mockGetTransactionCount).toHaveBeenCalledWith({
      address: EVM_ADDRESS,
      blockNumber: FINALISED,
    })
    expect(mockGetTransaction).toHaveBeenCalledWith({ hash: TX_HASH })
  })

  it("reads the amount from the signed bytes when it has them", async () => {
    mockGetTransactionReceipt.mockResolvedValue(receipt("success"))
    mockGetTransactionCount.mockResolvedValue(13)

    expect(await observe(sent(RAW))).toEqual({
      status: "landed",
      hash: TX_HASH,
      amount: ONE_TAO_WEI,
    })
    expect(mockGetTransaction).not.toHaveBeenCalled()
  })

  it("fails as reverted on a reverted receipt", async () => {
    mockGetTransactionReceipt.mockResolvedValue(receipt("reverted"))
    mockGetTransactionCount.mockResolvedValue(13)

    expect(await observe(sent(RAW))).toEqual({
      status: "failed",
      reason: "reverted",
      hash: TX_HASH,
    })
  })

  it("stays pending while the receipt's block is not finalised", async () => {
    mockGetTransactionCount.mockResolvedValue(13)

    mockGetTransactionReceipt.mockResolvedValue(receipt("success", FINALISED + 1n))
    expect(await observe(sent(RAW))).toEqual({ status: "pending" })

    mockGetTransactionReceipt.mockResolvedValue(receipt("reverted", FINALISED + 1n))
    expect(await observe(sent(RAW))).toEqual({ status: "pending" })

    expect(mockGetBlock).toHaveBeenCalledWith({ blockTag: "finalized" })
  })

  it("is replaced when the nonce moved past the leg and no node knows the hash", async () => {
    noReceipt()
    mockGetTransactionCount.mockResolvedValue(13)
    mockGetTransaction.mockRejectedValue(
      Object.assign(new Error("not found"), { name: "TransactionNotFoundError" })
    )

    expect(await observe(sent(RAW))).toEqual({ status: "failed", reason: "replaced" })
  })

  it("never calls the leg replaced when the node fails to say whether it knows the hash", async () => {
    noReceipt()
    mockGetTransactionCount.mockResolvedValue(13)
    mockGetTransaction.mockRejectedValue(new Error("503 Service Unavailable"))

    await expect(observe(sent(RAW))).rejects.toThrow("503 Service Unavailable")
  })

  it("stays pending when the node still knows the hash a lagging node had no receipt for", async () => {
    noReceipt()
    mockGetTransactionCount.mockResolvedValue(13)
    mockGetTransaction.mockResolvedValue({ hash: TX_HASH, blockNumber: 6_999_999n })

    expect(await observe(sent(RAW))).toEqual({ status: "pending" })
  })

  it("stays pending while only an unfinalised block consumed the nonce", async () => {
    noReceipt()
    mockGetTransactionCount.mockImplementation(async ({ blockNumber }: { blockNumber: bigint }) =>
      blockNumber === FINALISED ? 12 : 13
    )
    mockGetTransaction.mockRejectedValue(
      Object.assign(new Error("not found"), { name: "TransactionNotFoundError" })
    )

    expect(await observe(sent(RAW))).toEqual({ status: "pending" })
  })

  it("stays pending without a receipt while the nonce is not consumed", async () => {
    noReceipt()
    mockGetTransactionCount.mockResolvedValue(12)

    expect(await observe(sent(RAW))).toEqual({ status: "pending" })
  })

  describe("with the user's speed-up and cancel on the leg's nonce", () => {
    const SPEED_UP_RAW = serializeTransaction({
      ...parseTransaction(RAW),
      maxFeePerGas: 20n,
      maxPriorityFeePerGas: 2n,
    } as TransactionSerializable)
    const CANCEL_RAW = serializeTransaction({
      type: "eip1559",
      chainId: 964,
      nonce: 12,
      to: EVM_ADDRESS,
      value: 0n,
      gas: 21_000n,
      maxFeePerGas: 30n,
      maxPriorityFeePerGas: 3n,
    })
    const SPEED_UP_HASH = keccak256(SPEED_UP_RAW)
    const CANCEL_HASH = keccak256(CANCEL_RAW)

    const replaced = (): SentLeg => ({
      ...sent(RAW),
      evidence: {
        platform: "ethereum",
        raw: RAW,
        replacements: [
          { kind: "speed-up", hash: SPEED_UP_HASH, raw: SPEED_UP_RAW, sentAt: 1 },
          { kind: "cancel", hash: CANCEL_HASH, raw: CANCEL_RAW, sentAt: 2 },
        ],
      },
    })

    const minedOnly = (mined: `0x${string}`, status: "success" | "reverted" = "success") => {
      mockGetTransactionCount.mockResolvedValue(13)
      mockGetTransactionReceipt.mockImplementation(async ({ hash }: { hash: `0x${string}` }) => {
        if (hash === mined) return receipt(status)
        throw Object.assign(new Error("not found"), { name: "TransactionReceiptNotFoundError" })
      })
    }

    const knownOnly = (known: `0x${string}` | null) =>
      mockGetTransaction.mockImplementation(async ({ hash }: { hash: `0x${string}` }) => {
        if (hash === known) return { hash, blockNumber: null }
        throw Object.assign(new Error("not found"), { name: "TransactionNotFoundError" })
      })

    it("lands with the speed-up that executed", async () => {
      minedOnly(SPEED_UP_HASH)

      expect(await observe(replaced())).toEqual({
        status: "landed",
        hash: SPEED_UP_HASH,
        amount: ONE_TAO_WEI,
      })
    })

    it("lands with the leg's own transaction when it executed after a speed-up was sent", async () => {
      minedOnly(TX_HASH)

      expect(await observe(replaced())).toEqual({
        status: "landed",
        hash: TX_HASH,
        amount: ONE_TAO_WEI,
      })
    })

    it("fails as cancelled when the user's cancel executed", async () => {
      minedOnly(CANCEL_HASH)

      expect(await observe(replaced())).toEqual({
        status: "failed",
        reason: "cancelled",
        hash: CANCEL_HASH,
      })
    })

    it("fails as reverted with the speed-up that reverted", async () => {
      minedOnly(SPEED_UP_HASH, "reverted")

      expect(await observe(replaced())).toEqual({
        status: "failed",
        reason: "reverted",
        hash: SPEED_UP_HASH,
      })
    })

    it("lands with a finalised speed-up while the node fails to answer for the leg's own transaction", async () => {
      mockGetTransactionCount.mockResolvedValue(13)
      mockGetTransactionReceipt.mockImplementation(async ({ hash }: { hash: `0x${string}` }) => {
        if (hash === SPEED_UP_HASH) return receipt("success", FINALISED - 1n)
        if (hash === TX_HASH) throw new Error("503 Service Unavailable")
        throw Object.assign(new Error("not found"), { name: "TransactionReceiptNotFoundError" })
      })

      expect(await observe(replaced())).toEqual({
        status: "landed",
        hash: SPEED_UP_HASH,
        amount: ONE_TAO_WEI,
      })
    })

    it("lands with a finalised speed-up over a lagging node's unfinalised receipt for the leg's own", async () => {
      mockGetTransactionCount.mockResolvedValue(13)
      mockGetTransactionReceipt.mockImplementation(async ({ hash }: { hash: `0x${string}` }) => {
        if (hash === SPEED_UP_HASH) return receipt("success", FINALISED - 1n)
        if (hash === TX_HASH) return receipt("success", FINALISED + 1n)
        throw Object.assign(new Error("not found"), { name: "TransactionReceiptNotFoundError" })
      })

      expect(await observe(replaced())).toEqual({
        status: "landed",
        hash: SPEED_UP_HASH,
        amount: ONE_TAO_WEI,
      })
    })

    it("waits for every receipt lookup before settling on an unfinalised receipt", async () => {
      mockGetTransactionCount.mockResolvedValue(13)
      mockGetTransactionReceipt.mockImplementation(async ({ hash }: { hash: `0x${string}` }) => {
        if (hash === SPEED_UP_HASH) return receipt("success", FINALISED + 1n)
        if (hash === TX_HASH) throw new Error("503 Service Unavailable")
        throw Object.assign(new Error("not found"), { name: "TransactionReceiptNotFoundError" })
      })

      await expect(observe(replaced())).rejects.toThrow("503 Service Unavailable")
    })

    it("stays pending while a node still knows one of the leg's transactions", async () => {
      minedOnly(`0x${"00".repeat(32)}`)
      knownOnly(CANCEL_HASH)

      expect(await observe(replaced())).toEqual({ status: "pending" })
    })

    it("is replaced only when the node knows none of the leg's transactions", async () => {
      minedOnly(`0x${"00".repeat(32)}`)
      knownOnly(null)

      expect(await observe(replaced())).toEqual({ status: "failed", reason: "replaced" })
      expect(mockGetTransaction.mock.calls.map(([{ hash }]) => hash).sort()).toEqual(
        [TX_HASH, SPEED_UP_HASH, CANCEL_HASH].sort()
      )
    })

    it("never calls the leg replaced when a lagging node fails to answer for one of them", async () => {
      minedOnly(`0x${"00".repeat(32)}`)
      mockGetTransaction.mockImplementation(async ({ hash }: { hash: `0x${string}` }) => {
        if (hash === SPEED_UP_HASH) throw new Error("503 Service Unavailable")
        throw Object.assign(new Error("not found"), { name: "TransactionNotFoundError" })
      })

      await expect(observe(replaced())).rejects.toThrow("503 Service Unavailable")
    })
  })
})
