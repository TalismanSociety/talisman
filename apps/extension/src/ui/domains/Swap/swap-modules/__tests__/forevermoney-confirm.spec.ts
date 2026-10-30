import BigNumber from "bignumber.js"
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

vi.mock("@core/domains/swaps/evm-gas-check", () => ({
  prepareTransactionRequestWithGasCheck: vi.fn(
    async (_client: unknown, _feeTokenId: string, request: unknown) => request
  ),
}))

vi.mock("@core/domains/swaps/modules/forevermoney-logo.svg?url", () => ({
  default: "forevermoney-logo.svg",
}))

const { BACKGROUND_SWAP_MODULES } = await import("@core/domains/swaps/registry")
const { uiSwapEnv, withSwapEnv } = await import("../../swapEnv.ui")
const { confirmSwap } = await import("./confirmSwap")

const forevermoneySwapModule = withSwapEnv(BACKGROUND_SWAP_MODULES.forevermoney, uiSwapEnv)

// --- Fixtures ---

const BASE_WTAO = "8453:evm-erc20:0xf3081494b87e8d5fb7960f066e931d1d0e6e3d67"
const SUB_TAO = "bittensor:substrate-native"

const BASE_GATEWAY = "0x1da2415229b614C787e145D1D7346eb496319C52"

const SUB_ADDRESS = "5GW7UHZ9tLocJUaMXFWkr48QHgVoq5tVR1az62mknFacM3cu"
const EVM_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

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

const readContractImpl = async (
  _networkId: string,
  args: { functionName: string; args?: readonly unknown[] }
) => {
  switch (args.functionName) {
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
    signal
  )

const single = <T>(q: T | T[] | null) => (Array.isArray(q) ? q[0] : q)

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

describe("forevermoneySwapModule confirm screen", () => {
  const confirm = async (
    fromTokenId: string,
    toTokenId: string,
    fromAmount: bigint,
    toAddress: string
  ) => {
    const q = single(await quote(fromTokenId, toTokenId, fromAmount, toAddress))
    if (!q) throw new Error("expected a quote")
    return confirmSwap({
      module: forevermoneySwapModule,
      quote: q,
      fromTokenId,
      toTokenId,
      fromAddress: EVM_ADDRESS,
      toAddress,
      fromAmount,
      context: { platform: "ethereum" },
    })
  }

  it("bridges spoke wTAO to a substrate address with the re-read fee", async () => {
    expect(await confirm(BASE_WTAO, SUB_TAO, ONE_TAO_WEI + 7n, SUB_ADDRESS)).toEqual({
      transaction: {
        platform: "ethereum",
        transaction: {
          chain: null,
          account: EVM_ADDRESS,
          to: BASE_GATEWAY,
          data: "0xb005e4cf000000000000000000000000f3081494b87e8d5fb7960f066e931d1d0e6e3d670000000000000000000000000000000000000000000000000de0b6b3a7640000c4518fa0ed143e016e4a1410193704924b890de8f854b94c7a6037651ec65dd0000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb9226600000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000003567e0",
          value: FEE_WITH_BUFFER,
        },
      },
      fees: [
        {
          name: "Chainlink CCIP Fee",
          tokenId: "8453:evm-native",
          amount: BigNumber("0.00102"),
          additional: true,
        },
      ],
      txInfo: {
        type: "swap-forevermoney",
        fromTokenId: BASE_WTAO,
        toTokenId: SUB_TAO,
        fromAmount: "1000000000000000007",
        toAmount: "1000000000",
        to: SUB_ADDRESS,
        destinationStartBlock: "7000000",
      },
    })
  })
})
