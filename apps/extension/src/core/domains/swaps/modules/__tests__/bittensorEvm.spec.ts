import { BITTENSOR_BALANCE_TRANSFER_PRECOMPILE } from "@core/domains/bittensor/constants"
import type { SwapEnv } from "@core/domains/swaps/env"
import { abiBittensorBalanceTransfer } from "@core/util/abi"
import type { Network, Token } from "@talismn/chaindata-provider"
import { frontierH160ToSs58Mirror } from "@talismn/crypto"
import type { ScaleApi } from "@talismn/sapi"
import BigNumber from "bignumber.js"
import { encodeFunctionData, type PublicClient } from "viem"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { bittensorEvmSwapModule } from "../bittensorEvm"

// --- Fake env ---

const mockGetStorage = vi.fn()
const mockGetFeeEstimate = vi.fn()
const mockEstimateGas = vi.fn()
const mockGetGasPrice = vi.fn()

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

const quoteSapi = {
  getStorage: mockGetStorage,
  getFeeEstimate: mockGetFeeEstimate,
  getExtrinsicPayload: vi.fn(async (pallet: string, method: string, args: unknown) => ({
    payload: { pallet, method, args },
    txMetadata: undefined,
  })),
}

// prepareTransactionRequest returns the request unchanged so we can observe what was built
const evmClient = {
  estimateGas: mockEstimateGas,
  getGasPrice: mockGetGasPrice,
  prepareTransactionRequest: async (request: unknown) => request,
}

const env: SwapEnv = {
  getNetwork: async (id) => (id === EVM_NETWORK.id ? (EVM_NETWORK as Network) : null),
  getToken: async (id) =>
    ([SUB_TOKEN, EVM_TOKEN].find((token) => token.id === id) as Token | undefined) ?? null,
  evmClient: async () => evmClient as unknown as PublicClient,
  substrateApi: async () => quoteSapi as unknown as ScaleApi,
}

// --- Test helpers ---

const SUB_ADDRESS = "5GW7UHZ9tLocJUaMXFWkr48QHgVoq5tVR1az62mknFacM3cu"
const SUB_PUBKEY = "0xc4518fa0ed143e016e4a1410193704924b890de8f854b94c7a6037651ec65dd0"
const EVM_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

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
    env,
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
    env,
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
      env,
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
    return bittensorEvmSwapModule.buildLeg(
      {
        leg: quote.legs[0],
        input: ONE_TAO_RAO,
        context: { platform: "polkadot", sapi: fakeSapi as never, allowReap },
        slippage: 0,
      },
      env
    )
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
      bittensorEvmSwapModule.buildLeg(
        {
          leg: quote.legs[0],
          input: ONE_TAO_RAO,
          context: { platform: "ethereum" },
          slippage: 0,
        },
        env
      )
    ).rejects.toThrow("Missing substrate context")
  })
})

describe("bittensorEvmSwapModule buildLeg evm -> substrate", () => {
  const buildEvmLeg = async (fromAmount: bigint) => {
    const quote = single(await quoteEvmToSub(fromAmount))
    if (!quote) throw new Error("expected a quote")
    const { transaction } = await bittensorEvmSwapModule.buildLeg(
      {
        leg: quote.legs[0],
        input: fromAmount,
        context: { platform: "ethereum" },
        slippage: 0,
      },
      env
    )
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
