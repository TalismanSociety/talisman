import BigNumber from "bignumber.js"
import { encodeFunctionData } from "viem"
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
vi.mock("../evm-gas-check", () => ({
  prepareTransactionRequestWithGasCheck: vi.fn(
    async (_client: unknown, _feeTokenId: string, request: unknown) => request
  ),
}))

const { bittensorEvmSwapModule } = await import("../bittensor-evm-swap-module")
const { abiBittensorBalanceTransfer } = await import("@core/util/abi")
const { BITTENSOR_BALANCE_TRANSFER_PRECOMPILE } = await import("@core/domains/bittensor/constants")
const { frontierH160ToSs58Mirror } = await import("@talismn/crypto")
const { confirmSwap } = await import("./confirmSwap")

// --- Test helpers ---

const SUB_ADDRESS = "5GW7UHZ9tLocJUaMXFWkr48QHgVoq5tVR1az62mknFacM3cu"
const SUB_PUBKEY = "0xc4518fa0ed143e016e4a1410193704924b890de8f854b94c7a6037651ec65dd0"
const EVM_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
const OTHER_EVM_ADDRESS = "0x70045A9F59A354550EC0272f73AAe03B01Fb8a7a"

const ED = 500n
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

describe("bittensorEvmSwapModule assets", () => {
  it("lists both sides of both networks as sources", async () => {
    const assets = await bittensorEvmSwapModule.getFromAssets(signal)

    expect(assets).toEqual(
      expect.arrayContaining([
        "bittensor:substrate-native",
        "964:evm-native",
        "bittensor-testnet:substrate-native",
        "945:evm-native",
      ])
    )
  })

  it("pairs each source with its sibling only", async () => {
    expect(await bittensorEvmSwapModule.getToAssets("bittensor:substrate-native", signal)).toEqual([
      "964:evm-native",
    ])
    expect(await bittensorEvmSwapModule.getToAssets("945:evm-native", signal)).toEqual([
      "bittensor-testnet:substrate-native",
    ])
    expect(await bittensorEvmSwapModule.getToAssets("1:evm-native", signal)).toEqual([])
  })
})

describe("bittensorEvmSwapModule getQuote substrate -> evm", () => {
  it("returns null for an unsupported pair", async () => {
    const quote = await bittensorEvmSwapModule.getQuote(
      {
        fromTokenId: SUB_TOKEN.id,
        toTokenId: "1:evm-native",
        fromAmount: ONE_TAO_RAO,
        fromAddress: SUB_ADDRESS,
        toAddress: null,
        input: "exact",
      },
      signal
    )

    expect(quote).toBeNull()
  })

  it("retains the existential deposit for a fresh mirror and scales to wei", async () => {
    const quote = single(await quoteSubToEvm(ONE_TAO_RAO))

    expect(quote?.protocol).toBe("bittensor-evm")
    expect(quote?.inputAmountBN).toBe(ONE_TAO_RAO)
    expect(quote?.outputAmountBN).toBe((ONE_TAO_RAO - ED) * WEI_PER_RAO)
    expect(quote?.note).toContain("existential deposit")
    expect(quote?.fees).toEqual([
      expect.objectContaining({ tokenId: SUB_TOKEN.id, name: "Est. Gas Fees" }),
    ])
    expect(quote?.fees[0]?.amount.toString()).toBe("0.0001")
    expect(mockGetStorage).toHaveBeenCalledWith("System", "Account", [
      frontierH160ToSs58Mirror(EVM_ADDRESS, 42),
    ])
  })

  it("does not retain the existential deposit for a funded mirror", async () => {
    mockGetStorage.mockResolvedValue({ data: { free: ED } })

    const quote = single(await quoteSubToEvm(ONE_TAO_RAO))

    expect(quote?.outputAmountBN).toBe(ONE_TAO_RAO * WEI_PER_RAO)
    expect(quote?.note).toBeUndefined()
  })

  it("assumes a fresh mirror when the recipient is not known yet", async () => {
    const quote = single(await quoteSubToEvm(ONE_TAO_RAO, null))

    expect(quote?.outputAmountBN).toBe((ONE_TAO_RAO - ED) * WEI_PER_RAO)
    expect(mockGetStorage).not.toHaveBeenCalled()
  })

  it("assumes a fresh mirror when the balance read fails", async () => {
    mockGetStorage.mockRejectedValue(new Error("rpc down"))

    const quote = single(await quoteSubToEvm(ONE_TAO_RAO))

    expect(quote?.outputAmountBN).toBe((ONE_TAO_RAO - ED) * WEI_PER_RAO)
  })

  it("requires a fresh mirror to receive at least the existential deposit on top of the retained one", async () => {
    await expect(quoteSubToEvm(2n * ED - 1n)).rejects.toThrow(/minimum is 0.000001 TAO/)

    const quote = single(await quoteSubToEvm(2n * ED))
    expect(quote?.outputAmountBN).toBe(ED * WEI_PER_RAO)
  })

  it("requires a funded mirror to receive at least the existential deposit", async () => {
    mockGetStorage.mockResolvedValue({ data: { free: ED } })

    await expect(quoteSubToEvm(ED - 1n)).rejects.toThrow(/minimum is 0.0000005 TAO/)
    await expect(quoteSubToEvm(ED)).resolves.toBeTruthy()
  })

  it("quotes one leg from the sender to the recipient", async () => {
    const quote = single(await quoteSubToEvm(ONE_TAO_RAO))

    expect(quote?.legs).toEqual([
      {
        protocol: "bittensor-evm",
        fromTokenId: SUB_TOKEN.id,
        toTokenId: EVM_TOKEN.id,
        signer: SUB_ADDRESS,
        recipient: EVM_ADDRESS,
        inputAmount: ONE_TAO_RAO,
        outputAmount: (ONE_TAO_RAO - ED) * WEI_PER_RAO,
        fees: [{ name: "Est. Gas Fees", tokenId: SUB_TOKEN.id, amount: BigNumber("0.0001") }],
        timeInSec: 12,
      },
    ])
  })
})

describe("bittensorEvmSwapModule getQuote evm -> substrate", () => {
  it("floors wei to whole rao", async () => {
    const dust = 123_456_789n
    const quote = single(await quoteEvmToSub(ONE_TAO_WEI + dust))

    expect(quote?.inputAmountBN).toBe(ONE_TAO_WEI + dust)
    expect(quote?.outputAmountBN).toBe(ONE_TAO_RAO)
    expect(quote?.note).toBeUndefined()
  })

  it("estimates gas against the precompile and reports it in EVM TAO", async () => {
    const quote = single(await quoteEvmToSub(ONE_TAO_WEI))

    expect(mockEstimateGas).toHaveBeenCalledWith(
      expect.objectContaining({
        account: EVM_ADDRESS,
        to: BITTENSOR_BALANCE_TRANSFER_PRECOMPILE,
        value: ONE_TAO_WEI,
      })
    )
    expect(quote?.fees).toEqual([
      expect.objectContaining({ tokenId: EVM_TOKEN.id, name: "Est. Gas Fees" }),
    ])
    // 21000 gas * 10 gwei = 0.00021 TAO
    expect(quote?.fees[0]?.amount.toString()).toBe("0.00021")
  })

  it("requires the recipient to receive at least the existential deposit", async () => {
    const minimum = ED * WEI_PER_RAO

    await expect(quoteEvmToSub(minimum - 1n)).rejects.toThrow(/minimum is 0.0000005 TAO/)
    await expect(quoteEvmToSub(minimum)).resolves.toBeTruthy()
  })

  it("still quotes when gas estimation fails", async () => {
    mockEstimateGas.mockRejectedValue(new Error("boom"))

    const quote = single(await quoteEvmToSub(ONE_TAO_WEI))

    expect(quote?.outputAmountBN).toBe(ONE_TAO_RAO)
    expect(quote?.fees).toEqual([])
  })
})

describe("bittensorEvmSwapModule buildLeg substrate -> evm", () => {
  const buildSubLeg = async (allowReap?: boolean, recipient: string | null = EVM_ADDRESS) => {
    const quote = single(await quoteSubToEvm(ONE_TAO_RAO, recipient))
    if (!quote) throw new Error("expected a quote")
    return bittensorEvmSwapModule.buildLeg({
      leg: quote.legs[0],
      input: ONE_TAO_RAO,
      context: { platform: "polkadot", sapi: fakeSapi as never, allowReap },
      exchange: null,
      slippage: 0,
    })
  }

  it("builds a keep-alive transfer to the mirror account", async () => {
    const { transaction } = await buildSubLeg()

    expect(transaction.platform).toBe("polkadot")
    expect(fakeSapi.getExtrinsicPayload).toHaveBeenCalledWith(
      "Balances",
      "transfer_keep_alive",
      {
        dest: { type: "Id", value: frontierH160ToSs58Mirror(EVM_ADDRESS, 42) },
        value: ONE_TAO_RAO,
      },
      { address: SUB_ADDRESS }
    )
  })

  it("allows reaping the sender when the context asks for it", async () => {
    await buildSubLeg(true)

    expect(fakeSapi.getExtrinsicPayload).toHaveBeenCalledWith(
      "Balances",
      "transfer_allow_death",
      expect.anything(),
      expect.anything()
    )
  })

  it("rejects a quote without a recipient", async () => {
    await expect(buildSubLeg(false, null)).rejects.toThrow("Please select the quote again")
  })

  it("rejects a mismatched context", async () => {
    const quote = single(await quoteSubToEvm(ONE_TAO_RAO))
    if (!quote) throw new Error("expected a quote")

    await expect(
      bittensorEvmSwapModule.buildLeg({
        leg: quote.legs[0],
        input: ONE_TAO_RAO,
        context: { platform: "ethereum" },
        exchange: null,
        slippage: 0,
      })
    ).rejects.toThrow("Missing substrate context")
  })
})

describe("bittensorEvmSwapModule buildLeg evm -> substrate", () => {
  const buildEvmLeg = async (fromAmount: bigint) => {
    const quote = single(await quoteEvmToSub(fromAmount))
    if (!quote) throw new Error("expected a quote")
    const { transaction } = await bittensorEvmSwapModule.buildLeg({
      leg: quote.legs[0],
      input: fromAmount,
      context: { platform: "ethereum" },
      exchange: null,
      slippage: 0,
    })
    if (transaction.platform !== "ethereum") throw new Error("unexpected platform")
    return transaction.transaction
  }

  it("calls the precompile with the recipient public key and the value in wei", async () => {
    const transaction = await buildEvmLeg(ONE_TAO_WEI)

    expect(transaction.to).toBe(BITTENSOR_BALANCE_TRANSFER_PRECOMPILE)
    expect(transaction.value).toBe(ONE_TAO_WEI)
    expect(transaction.data).toBe(
      encodeFunctionData({
        abi: abiBittensorBalanceTransfer,
        functionName: "transfer",
        args: [SUB_PUBKEY],
      })
    )
    expect(transaction.data?.startsWith("0xcd6f4eb1")).toBe(true)
  })

  it("strips sub-rao dust from the value", async () => {
    const transaction = await buildEvmLeg(ONE_TAO_WEI + 999n)

    expect(transaction.value).toBe(ONE_TAO_WEI)
  })
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
