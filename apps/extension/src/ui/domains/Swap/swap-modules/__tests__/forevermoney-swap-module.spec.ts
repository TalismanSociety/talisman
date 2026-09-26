import BigNumber from "bignumber.js"
import { decodeFunctionData } from "viem"
import { beforeEach, describe, expect, it, vi } from "vitest"

// --- Mocks ---

const {
  mockReadContract,
  mockEstimateGas,
  mockGetGasPrice,
  mockGetBlockNumber,
  forevermoneyConfig,
} = vi.hoisted(() => ({
  mockReadContract: vi.fn(),
  mockEstimateGas: vi.fn(),
  mockGetGasPrice: vi.fn(),
  mockGetBlockNumber: vi.fn(),
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

vi.mock("@ui/state/chaindata", async () => {
  const { of } = await import("rxjs")
  return { getNetworkById$: vi.fn((id: string) => of(NETWORKS[id] ?? null)) }
})

vi.mock("@ui/domains/Ethereum/usePublicClient", () => ({
  getExtensionPublicClient: vi.fn((network: { id: string }) => ({
    readContract: (args: unknown) => mockReadContract(network.id, args),
    estimateGas: mockEstimateGas,
    getGasPrice: mockGetGasPrice,
    getBlockNumber: () => mockGetBlockNumber(network.id),
  })),
}))

vi.mock("../evm-gas-check", () => ({
  prepareTransactionRequestWithGasCheck: vi.fn(
    async (_client: unknown, _feeTokenId: string, request: unknown) => request
  ),
}))

vi.mock("../forevermoney-logo.svg?url", () => ({ default: "forevermoney-logo.svg" }))

const { forevermoneySwapModule } = await import("../forevermoney-swap-module")
type ForevermoneyExchange = import("../forevermoney-swap-module").ForevermoneyExchange
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
    { fromTokenId, toTokenId, fromAmount, fromAddress: EVM_ADDRESS, toAddress },
    signal
  )

const single = <T>(q: T | T[] | null) => (Array.isArray(q) ? q[0] : q)

const exchange = (fromTokenId: string, toTokenId: string, fromAmount: bigint, toAddress: string) =>
  forevermoneySwapModule.createExchange({
    fromTokenId,
    toTokenId,
    fromAmount,
    fromAddress: EVM_ADDRESS,
    toAddress,
  })

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
    expect(q?.providerName).toBe("ForeverMoney - Beta")
    expect(q?.inputAmountBN).toBe(ONE_TAO_WEI + 123n)
    expect(q?.outputAmountBN).toBe(ONE_TAO_WEI / WEI_PER_RAO)
    expect(q?.fees.map((f) => [f.name, f.tokenId, f.amount.toFixed()])).toEqual([
      ["Bridge Fee", "8453:evm-native", "0.00102"],
      ["Est. Gas Fees", "8453:evm-native", "0.000000000002"],
    ])
    expect(q?.timeInSec).toBe(1800)
    expect(q?.notice).toContain("Experimental")
    expect(q?.maxNativeTokenGasBuffer).toBeUndefined()
  })

  it("quotes the bridge fee even while the allowance is missing and gas cannot be estimated", async () => {
    mockEstimateGas.mockRejectedValue(new Error("transfer amount exceeds allowance"))

    const q = single(await quote(BASE_WTAO, SUB_TAO, ONE_TAO_WEI, SUB_ADDRESS))

    expect(q?.fees.map((f) => f.name)).toEqual(["Bridge Fee"])
  })

  it("quotes 1:1 in wei for a spoke to EVM bridge", async () => {
    const q = single(await quote(BASE_WTAO, EVM_TAO, ONE_TAO_WEI, EVM_ADDRESS))

    expect(q?.outputAmountBN).toBe(ONE_TAO_WEI)
  })

  it("adds the buffered fee to the native buffer for an outbound bridge", async () => {
    const q = single(await quote(EVM_TAO, BASE_WTAO, ONE_TAO_WEI, EVM_ADDRESS))

    expect(q?.outputAmountBN).toBe(ONE_TAO_WEI)
    expect(q?.fees[0]).toMatchObject({
      name: "Bridge Fee",
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

describe("forevermoneySwapModule createExchange", () => {
  it("re-quotes and records the destination start block", async () => {
    const ex = await exchange(BASE_WTAO, SUB_TAO, ONE_TAO_WEI + 5n, SUB_ADDRESS)

    expect(ex).toEqual({
      protocol: "forevermoney",
      fees: [
        {
          name: "Bridge Fee",
          tokenId: "8453:evm-native",
          amount: BigNumber("0.00102"),
          additional: true,
        },
      ],
      outputAmountBN: ONE_TAO_WEI / 10n ** 9n,
      data: {
        direction: "spoke-to-substrate",
        fromTokenId: BASE_WTAO,
        toTokenId: SUB_TAO,
        toAddress: SUB_ADDRESS,
        amountWei: ONE_TAO_WEI.toString(),
        partnerFeeWei: "0",
        feeWei: CCIP_FEE.toString(),
        destinationStartBlock: "7000000",
      },
    })
  })

  it("reads the spoke block for an outbound bridge", async () => {
    const ex = await exchange(EVM_TAO, BASE_WTAO, ONE_TAO_WEI, EVM_ADDRESS)

    expect(ex?.data).toMatchObject({ direction: "evm-to-spoke", destinationStartBlock: "50000000" })
  })

  it("rejects a recipient of the wrong type", async () => {
    await expect(exchange(BASE_WTAO, SUB_TAO, ONE_TAO_WEI, EVM_ADDRESS)).rejects.toThrow(
      "Invalid recipient"
    )
    await expect(exchange(EVM_TAO, BASE_WTAO, ONE_TAO_WEI, SUB_ADDRESS)).rejects.toThrow(
      "Invalid recipient"
    )
  })
})

describe("forevermoneySwapModule getTransaction", () => {
  const buildTx = async (
    fromTokenId: string,
    toTokenId: string,
    fromAmount: bigint,
    toAddress: string,
    overrides: Record<string, unknown> = {}
  ) => {
    const ex = await exchange(fromTokenId, toTokenId, fromAmount, toAddress)
    return forevermoneySwapModule.getTransaction({
      fromTokenId,
      fromAddress: EVM_ADDRESS,
      fromAmount,
      exchange: { ...ex?.data, ...overrides },
      context: { platform: "ethereum" },
      toAddress,
    })
  }

  it("bridges spoke wTAO to a substrate address through bridgeToFinney", async () => {
    const tx = await buildTx(BASE_WTAO, SUB_TAO, ONE_TAO_WEI + 7n, SUB_ADDRESS)
    if (tx?.platform !== "ethereum") throw new Error("expected an ethereum tx")

    expect(tx.transaction.to).toBe(BASE_GATEWAY)
    expect(tx.transaction.value).toBe(FEE_WITH_BUFFER)
    expect(
      decodeFunctionData({ abi: abiForevermoneySpokeGateway, data: tx.transaction.data! })
    ).toEqual({
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
    if (tx?.platform !== "ethereum") throw new Error("expected an ethereum tx")

    const { args } = decodeFunctionData({
      abi: abiForevermoneySpokeGateway,
      data: tx.transaction.data!,
    })
    expect((args[2] as { ss58: string }).ss58).toBe(
      frontierSs58ToPublicKeyHex(frontierH160ToSs58Mirror(OTHER_EVM_ADDRESS, 42))
    )
  })

  it("bridges Bittensor EVM TAO to a spoke through bridgeOut with the fee on top", async () => {
    const tx = await buildTx(EVM_TAO, BASE_WTAO, ONE_TAO_WEI + 9n, OTHER_EVM_ADDRESS)
    if (tx?.platform !== "ethereum") throw new Error("expected an ethereum tx")

    expect(tx.transaction.to).toBe(OUTBOUND_ALPHA_GATEWAY)
    expect(tx.transaction.value).toBe(ONE_TAO_WEI + FEE_WITH_BUFFER)
    expect(
      decodeFunctionData({ abi: abiForevermoneyAlphaGateway, data: tx.transaction.data! })
    ).toEqual({
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

  it("rejects an exchange built for another recipient or amount", async () => {
    await expect(
      buildTx(BASE_WTAO, SUB_TAO, ONE_TAO_WEI, SUB_ADDRESS, { toAddress: EVM_ADDRESS })
    ).rejects.toThrow("select the quote again")
    await expect(
      buildTx(EVM_TAO, BASE_WTAO, ONE_TAO_WEI, EVM_ADDRESS, {
        amountWei: (2n * ONE_TAO_WEI).toString(),
      })
    ).rejects.toThrow("select the quote again")
  })

  it("rejects a tampered fee", async () => {
    await expect(
      buildTx(EVM_TAO, BASE_WTAO, ONE_TAO_WEI, EVM_ADDRESS, { feeWei: ONE_TAO_WEI.toString() })
    ).rejects.toThrow("unexpectedly high")
  })

  it("requires an EVM signing context", async () => {
    const ex = await exchange(BASE_WTAO, SUB_TAO, ONE_TAO_WEI, SUB_ADDRESS)
    await expect(
      forevermoneySwapModule.getTransaction({
        fromTokenId: BASE_WTAO,
        fromAddress: EVM_ADDRESS,
        fromAmount: ONE_TAO_WEI,
        exchange: ex?.data,
        context: { platform: "polkadot", sapi: {} as never },
        toAddress: SUB_ADDRESS,
      })
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
      protocolName: "ForeverMoney - Beta",
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

  const buildTx = async (
    fromTokenId: string,
    toTokenId: string,
    fromAmount: bigint,
    to: string
  ) => {
    const ex = await exchange(fromTokenId, toTokenId, fromAmount, to)
    const tx = await forevermoneySwapModule.getTransaction({
      fromTokenId,
      fromAddress: EVM_ADDRESS,
      fromAmount,
      exchange: ex?.data,
      context: { platform: "ethereum" },
      toAddress: to,
    })
    if (tx?.platform !== "ethereum") throw new Error("expected an ethereum tx")
    return tx.transaction
  }

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
        const ex = await exchange(fromTokenId!, toTokenId!, fromAmount, to!)
        const data = ex?.data as ForevermoneyExchange
        const amountWei = BigInt(data.amountWei)
        const partnerFeeWei = BigInt(data.partnerFeeWei)
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

  it("reports a lower exchange output when the fee was enabled after the quote", async () => {
    const q = single(await quote(BASE_WTAO, SUB_TAO, ONE_PERCENT_ABOVE, SUB_ADDRESS))

    enableFee(["8453"])
    const ex = await exchange(BASE_WTAO, SUB_TAO, ONE_PERCENT_ABOVE, SUB_ADDRESS)

    expect(ex?.outputAmountBN).toBe(ONE_TAO_WEI / WEI_PER_RAO)
    expect(ex?.outputAmountBN).toBeLessThan(q!.outputAmountBN)
  })

  it("rejects a transaction when the fee settings changed after the exchange", async () => {
    enableFee(["8453"])
    const ex = await exchange(BASE_WTAO, SUB_TAO, ONE_PERCENT_ABOVE, SUB_ADDRESS)

    forevermoneyConfig.feeBps = 50
    await expect(
      forevermoneySwapModule.getTransaction({
        fromTokenId: BASE_WTAO,
        fromAddress: EVM_ADDRESS,
        fromAmount: ONE_PERCENT_ABOVE,
        exchange: ex?.data,
        context: { platform: "ethereum" },
        toAddress: SUB_ADDRESS,
      })
    ).rejects.toThrow("select the quote again")
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
