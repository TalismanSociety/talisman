import BigNumber from "bignumber.js"
import { beforeEach, describe, expect, it, vi } from "vitest"

// --- Mocks ---

const { mockGetStorage, mockGetFeeEstimate } = vi.hoisted(() => ({
  mockGetStorage: vi.fn(),
  mockGetFeeEstimate: vi.fn(),
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

const { BACKGROUND_SWAP_MODULES } = await import("@core/domains/swaps/registry")
const { uiSwapEnv, withSwapEnv } = await import("../../swapEnv.ui")
const { confirmSwap } = await import("./confirmSwap")

const bittensorEvmSwapModule = withSwapEnv(BACKGROUND_SWAP_MODULES["bittensor-evm"], uiSwapEnv)

// --- Test helpers ---

const SUB_ADDRESS = "5GW7UHZ9tLocJUaMXFWkr48QHgVoq5tVR1az62mknFacM3cu"
const EVM_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

const ONE_TAO_RAO = 1_000_000_000n
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

const single = <T>(quote: T | T[] | null) => (Array.isArray(quote) ? quote[0] : quote)

const fakeSapi = { getExtrinsicPayload: vi.fn() }

beforeEach(() => {
  vi.clearAllMocks()
  mockGetStorage.mockResolvedValue({ data: { free: 0n } })
  mockGetFeeEstimate.mockResolvedValue(FEE_RAO)
  fakeSapi.getExtrinsicPayload.mockImplementation(
    async (pallet: string, method: string, args: unknown) => ({
      payload: { pallet, method, args },
      txMetadata: new Uint8Array([1]),
    })
  )
})

describe("bittensorEvmSwapModule confirm screen", () => {
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
      fees: [
        { name: "Est. Gas Fees", gas: true, tokenId: SUB_TOKEN.id, amount: BigNumber("0.0001") },
      ],
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
})
