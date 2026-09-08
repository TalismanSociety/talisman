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

vi.mock("./bittensor-logo.svg?url", () => ({ default: "bittensor-logo.svg" }))

const { bittensorEvmSwapModule } = await import("../bittensor-evm-swap-module")
const { abiBittensorBalanceTransfer } = await import("@core/util/abi")
const { BITTENSOR_BALANCE_TRANSFER_PRECOMPILE } = await import("@core/domains/bittensor/constants")
const { frontierH160ToSs58Mirror } = await import("@talismn/crypto")

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

  it("rejects amounts below the existential deposit plus fee", async () => {
    await expect(quoteSubToEvm(ED + FEE_RAO - 1n)).rejects.toThrow(/minimum is 0.0001005 TAO/)
  })

  it("carries the recipient in the quote data", async () => {
    const quote = single(await quoteSubToEvm(ONE_TAO_RAO))

    expect(quote?.data).toMatchObject({
      direction: "sub-to-evm",
      toAddress: EVM_ADDRESS,
      edHeldRao: ED,
    })
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

  it("rejects amounts below the existential deposit plus fee", async () => {
    const feeRao = (21_000n * 10_000_000_000n) / WEI_PER_RAO
    const minimum = (ED + feeRao) * WEI_PER_RAO

    await expect(quoteEvmToSub(minimum - 1n)).rejects.toThrow(/minimum is/)
    await expect(quoteEvmToSub(minimum)).resolves.toBeTruthy()
  })

  it("still quotes when gas estimation fails", async () => {
    mockEstimateGas.mockRejectedValue(new Error("boom"))

    const quote = single(await quoteEvmToSub(ONE_TAO_WEI))

    expect(quote?.outputAmountBN).toBe(ONE_TAO_RAO)
    expect(quote?.fees).toEqual([])
  })
})

describe("bittensorEvmSwapModule getTransaction substrate -> evm", () => {
  const getSubTransaction = async (allowReap?: boolean, toAddress = EVM_ADDRESS) => {
    const quote = single(await quoteSubToEvm(ONE_TAO_RAO))
    return bittensorEvmSwapModule.getTransaction({
      fromTokenId: SUB_TOKEN.id,
      fromAddress: SUB_ADDRESS,
      fromAmount: ONE_TAO_RAO,
      exchange: quote,
      context: { platform: "polkadot", sapi: fakeSapi as never, allowReap },
      toAddress,
    })
  }

  it("builds a keep-alive transfer to the mirror account", async () => {
    const tx = await getSubTransaction()

    expect(tx?.platform).toBe("polkadot")
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
    await getSubTransaction(true)

    expect(fakeSapi.getExtrinsicPayload).toHaveBeenCalledWith(
      "Balances",
      "transfer_allow_death",
      expect.anything(),
      expect.anything()
    )
  })

  it("rejects a quote built for another recipient", async () => {
    await expect(getSubTransaction(false, OTHER_EVM_ADDRESS)).rejects.toThrow(
      "Please select the quote again"
    )
  })

  it("rejects a quote without a recipient", async () => {
    const quote = single(await quoteSubToEvm(ONE_TAO_RAO, null))

    await expect(
      bittensorEvmSwapModule.getTransaction({
        fromTokenId: SUB_TOKEN.id,
        fromAddress: SUB_ADDRESS,
        fromAmount: ONE_TAO_RAO,
        exchange: quote,
        context: { platform: "polkadot", sapi: fakeSapi as never },
      })
    ).rejects.toThrow("Please select the quote again")
  })

  it("rejects a mismatched context", async () => {
    const quote = single(await quoteSubToEvm(ONE_TAO_RAO))

    await expect(
      bittensorEvmSwapModule.getTransaction({
        fromTokenId: SUB_TOKEN.id,
        fromAddress: SUB_ADDRESS,
        fromAmount: ONE_TAO_RAO,
        exchange: quote,
        context: { platform: "ethereum" },
      })
    ).rejects.toThrow("Missing substrate context")
  })
})

describe("bittensorEvmSwapModule getTransaction evm -> substrate", () => {
  const getEvmTransaction = async (fromAmount: bigint) => {
    const quote = single(await quoteEvmToSub(fromAmount))
    return bittensorEvmSwapModule.getTransaction({
      fromTokenId: EVM_TOKEN.id,
      fromAddress: EVM_ADDRESS,
      fromAmount,
      exchange: quote,
      context: { platform: "ethereum" },
      toAddress: SUB_ADDRESS,
    })
  }

  it("calls the precompile with the recipient public key and the value in wei", async () => {
    const tx = await getEvmTransaction(ONE_TAO_WEI)

    expect(tx?.platform).toBe("ethereum")
    if (tx?.platform !== "ethereum") throw new Error("unexpected platform")
    expect(tx.transaction.to).toBe(BITTENSOR_BALANCE_TRANSFER_PRECOMPILE)
    expect(tx.transaction.value).toBe(ONE_TAO_WEI)
    expect(tx.transaction.data).toBe(
      encodeFunctionData({
        abi: abiBittensorBalanceTransfer,
        functionName: "transfer",
        args: [SUB_PUBKEY],
      })
    )
    expect(tx.transaction.data?.startsWith("0xcd6f4eb1")).toBe(true)
  })

  it("strips sub-rao dust from the value", async () => {
    const tx = await getEvmTransaction(ONE_TAO_WEI + 999n)

    if (tx?.platform !== "ethereum") throw new Error("unexpected platform")
    expect(tx.transaction.value).toBe(ONE_TAO_WEI)
  })

  it("rejects a missing quote", async () => {
    await expect(
      bittensorEvmSwapModule.getTransaction({
        fromTokenId: EVM_TOKEN.id,
        fromAddress: EVM_ADDRESS,
        fromAmount: ONE_TAO_WEI,
        exchange: undefined,
        context: { platform: "ethereum" },
      })
    ).rejects.toThrow("Please select the quote again")
  })
})
