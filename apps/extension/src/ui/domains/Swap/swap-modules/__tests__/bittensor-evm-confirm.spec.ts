import BigNumber from "bignumber.js"
import { beforeEach, describe, expect, it, vi } from "vitest"

// --- Mocks ---

const { mockGetStorage, mockGetFeeEstimate, mockEstimateGas, mockGetGasPrice } = vi.hoisted(() => ({
  mockGetStorage: vi.fn(),
  mockGetFeeEstimate: vi.fn(),
  mockEstimateGas: vi.fn(),
  mockGetGasPrice: vi.fn(),
}))

const SUB_NETWORK = {
  id: "bittensor",
  platform: "polkadot",
  genesisHash: "0x2f0555cc76fc2840a25a6ea3b9637146806f1f44b090c175ffde2a7e5ab36c03",
  nativeTokenId: "bittensor:substrate-native",
  hasCheckMetadataHash: true,
  signedExtensions: undefined,
  registryTypes: undefined,
}
const EVM_NETWORK = {
  id: "964",
  platform: "ethereum",
  nativeTokenId: "964:evm-native",
}
const SUB_TOKEN = {
  id: "bittensor:substrate-native",
  type: "substrate-native",
  decimals: 9,
  symbol: "TAO",
  networkId: "bittensor",
}
const EVM_TOKEN = {
  id: "964:evm-native",
  type: "evm-native",
  decimals: 18,
  symbol: "TAO",
  networkId: "964",
}

vi.mock("@ui/state/chaindata", async () => {
  const { of } = await import("rxjs")
  return {
    getNetworkById$: vi.fn((id: string) =>
      of(id === SUB_NETWORK.id ? SUB_NETWORK : id === EVM_NETWORK.id ? EVM_NETWORK : null)
    ),
    getToken$: vi.fn((id: string) =>
      of(id === SUB_TOKEN.id ? SUB_TOKEN : id === EVM_TOKEN.id ? EVM_TOKEN : null)
    ),
  }
})

vi.mock("@ui/api", () => ({
  api: {
    subChainMetadata: vi.fn(async () => ({ metadataRpc: "0x00" })),
    subSend: vi.fn(),
  },
}))

vi.mock("@core/domains/metadata/helpers", () => ({
  getMetadataRpcFromDef: vi.fn(() => "0x00"),
}))

vi.mock("@talismn/sapi", () => ({
  getScaleApi: vi.fn(() => ({
    base58Prefix: 42,
    getStorage: mockGetStorage,
    getFeeEstimate: mockGetFeeEstimate,
    getExtrinsicPayload: vi.fn(async (pallet: string, method: string, args: unknown) => ({
      payload: { pallet, method, args },
      txMetadata: undefined,
    })),
  })),
}))

vi.mock("@ui/domains/Ethereum/usePublicClient", () => ({
  getExtensionPublicClient: vi.fn(() => ({
    estimateGas: mockEstimateGas,
    getGasPrice: mockGetGasPrice,
  })),
}))

// the gas check talks to a node — return the request unchanged so we can observe what was built
vi.mock("@core/domains/swaps/evm-gas-check", () => ({
  prepareTransactionRequestWithGasCheck: vi.fn(
    async (_client: unknown, _feeTokenId: string, request: unknown) => request
  ),
}))

const { BACKGROUND_SWAP_MODULES } = await import("@core/domains/swaps/registry")
const { uiSwapEnv, withSwapEnv } = await import("../../swapEnv.ui")
const { confirmSwap } = await import("./confirmSwap")

const bittensorEvmSwapModule = withSwapEnv(BACKGROUND_SWAP_MODULES["bittensor-evm"], uiSwapEnv)

// --- Test helpers ---

const SUB_ADDRESS = "5GW7UHZ9tLocJUaMXFWkr48QHgVoq5tVR1az62mknFacM3cu"
const EVM_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
const OTHER_EVM_ADDRESS = "0x70045A9F59A354550EC0272f73AAe03B01Fb8a7a"

const WEI_PER_RAO = 1_000_000_000n
const ONE_TAO_RAO = 1_000_000_000n
const ONE_TAO_WEI = ONE_TAO_RAO * WEI_PER_RAO
const FEE_RAO = 100_000n

const signal = new AbortController().signal

const quoteSubToEvm = (fromAmount: bigint, toAddress: string | null = EVM_ADDRESS) =>
  bittensorEvmSwapModule.getQuote(
    {
      fromTokenId: SUB_TOKEN.id,
      toTokenId: EVM_TOKEN.id,
      fromAmount,
      fromAddress: SUB_ADDRESS,
      toAddress,
      input: "exact",
    },
    signal
  )

const quoteEvmToSub = (fromAmount: bigint, toAddress: string | null = SUB_ADDRESS) =>
  bittensorEvmSwapModule.getQuote(
    {
      fromTokenId: EVM_TOKEN.id,
      toTokenId: SUB_TOKEN.id,
      fromAmount,
      fromAddress: EVM_ADDRESS,
      toAddress,
      input: "exact",
    },
    signal
  )

const single = <T>(quote: T | T[] | null) => (Array.isArray(quote) ? quote[0] : quote)

const fakeSapi = { getExtrinsicPayload: vi.fn() }

beforeEach(() => {
  vi.clearAllMocks()
  mockGetStorage.mockResolvedValue({ data: { free: 0n } })
  mockGetFeeEstimate.mockResolvedValue(FEE_RAO)
  mockEstimateGas.mockResolvedValue(21_000n)
  mockGetGasPrice.mockResolvedValue(10_000_000_000n)
  fakeSapi.getExtrinsicPayload.mockImplementation(
    async (pallet: string, method: string, args: unknown) => ({
      payload: { pallet, method, args },
      txMetadata: new Uint8Array([1]),
    })
  )
})

describe("bittensorEvmSwapModule confirm screen", () => {
  it("rejects a quote built for another recipient", async () => {
    const quote = single(await quoteSubToEvm(ONE_TAO_RAO))
    if (!quote) throw new Error("expected a quote")

    await expect(
      confirmSwap({
        module: bittensorEvmSwapModule,
        quote,
        fromTokenId: SUB_TOKEN.id,
        toTokenId: EVM_TOKEN.id,
        fromAddress: SUB_ADDRESS,
        toAddress: OTHER_EVM_ADDRESS,
        fromAmount: ONE_TAO_RAO,
        context: { platform: "polkadot", sapi: fakeSapi as never },
      })
    ).rejects.toThrow("Please select the quote again")
    expect(fakeSapi.getExtrinsicPayload).not.toHaveBeenCalled()
  })

  it("sends the whole input to the recipient's mirror", async () => {
    const quote = single(await quoteSubToEvm(ONE_TAO_RAO))
    if (!quote) throw new Error("expected a quote")

    expect(
      await confirmSwap({
        module: bittensorEvmSwapModule,
        quote,
        fromTokenId: SUB_TOKEN.id,
        toTokenId: EVM_TOKEN.id,
        fromAddress: SUB_ADDRESS,
        toAddress: EVM_ADDRESS,
        fromAmount: ONE_TAO_RAO,
        context: { platform: "polkadot", sapi: fakeSapi as never },
      })
    ).toEqual({
      transaction: {
        platform: "polkadot",
        payload: {
          pallet: "Balances",
          method: "transfer_keep_alive",
          args: {
            dest: { type: "Id", value: "5GW7UHZ9tLocJUaMXFWkr48QHgVoq5tVR1az62mknFacM3cu" },
            value: ONE_TAO_RAO,
          },
        },
        txMetadata: new Uint8Array([1]),
      },
      fees: [{ name: "Est. Gas Fees", tokenId: SUB_TOKEN.id, amount: BigNumber("0.0001") }],
      txInfo: {
        type: "swap-bittensor-evm",
        fromTokenId: SUB_TOKEN.id,
        toTokenId: EVM_TOKEN.id,
        fromAmount: "1000000000",
        toAmount: "999999500000000000",
        to: EVM_ADDRESS,
      },
    })
  })

  it("calls the precompile with the recipient public key", async () => {
    const quote = single(await quoteEvmToSub(ONE_TAO_WEI + 7n))
    if (!quote) throw new Error("expected a quote")

    expect(
      await confirmSwap({
        module: bittensorEvmSwapModule,
        quote,
        fromTokenId: EVM_TOKEN.id,
        toTokenId: SUB_TOKEN.id,
        fromAddress: EVM_ADDRESS,
        toAddress: SUB_ADDRESS,
        fromAmount: ONE_TAO_WEI + 7n,
        context: { platform: "ethereum" },
      })
    ).toEqual({
      transaction: {
        platform: "ethereum",
        transaction: {
          chain: null,
          account: EVM_ADDRESS,
          to: "0x0000000000000000000000000000000000000800",
          data: "0xcd6f4eb1c4518fa0ed143e016e4a1410193704924b890de8f854b94c7a6037651ec65dd0",
          value: ONE_TAO_WEI,
        },
      },
      fees: [{ name: "Est. Gas Fees", tokenId: EVM_TOKEN.id, amount: BigNumber("0.00021") }],
      txInfo: {
        type: "swap-bittensor-evm",
        fromTokenId: EVM_TOKEN.id,
        toTokenId: SUB_TOKEN.id,
        fromAmount: "1000000000000000007",
        toAmount: "1000000000",
        to: SUB_ADDRESS,
      },
    })
  })
})
