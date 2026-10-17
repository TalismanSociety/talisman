import BigNumber from "bignumber.js"
import { describe, expect, it, vi } from "vitest"
import { buildSwapTransaction } from "../buildSwapTransaction"
import {
  type BuildLegParams,
  type BuiltLeg,
  quoteFromLegs,
  type SwapModule,
} from "../swap-modules/common.swap-module"

const SOL = "solana-mainnet:sol-native"
const USDC = "solana-mainnet:sol-spl:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
const SENDER = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
const RECIPIENT = "HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH"

const BUILT: BuiltLeg = {
  transaction: {
    platform: "ethereum",
    transaction: { to: "0x0000000000000000000000000000000000000001" },
  },
  fees: [{ name: "Talisman Fee", tokenId: SOL, amount: BigNumber("0.001") }],
  expectedOutput: 990n,
  txInfo: {
    type: "swap-simpleswap",
    exchangeId: "exchange-1",
    fromTokenId: SOL,
    toTokenId: USDC,
    fromAmount: "1000",
    toAmount: "990",
    to: RECIPIENT,
  },
}

const fakeModule = () => {
  const createExchange = vi.fn(async () => ({
    protocol: "simpleswap" as const,
    data: { id: "exchange-1" } as never,
  }))
  const buildLeg = vi.fn(async (_params: BuildLegParams) => BUILT)
  const module: SwapModule = {
    protocol: "simpleswap",
    decentralisationScore: 1,
    getFromAssets: async () => [],
    getToAssets: async () => [],
    getQuote: async () => null,
    createExchange,
    buildLeg,
  }
  return { module, createExchange, buildLeg }
}

const quote = (recipient: string) =>
  quoteFromLegs(
    [
      {
        protocol: "simpleswap",
        fromTokenId: SOL,
        toTokenId: USDC,
        signer: SENDER,
        recipient,
        inputAmount: 1000n,
        outputAmount: 990n,
        fees: BUILT.fees,
        timeInSec: 300,
      },
    ],
    {
      protocol: "simpleswap",
      decentralisationScore: 1,
      providerLogo: "",
      providerName: "SimpleSwap",
    }
  )

const params = {
  fromTokenId: SOL,
  toTokenId: USDC,
  fromAddress: SENDER,
  toAddress: RECIPIENT,
  fromAmount: 1000n,
}

describe("buildSwapTransaction", () => {
  it("opens one exchange and builds the first leg with it", async () => {
    const { module, createExchange, buildLeg } = fakeModule()
    const q = quote(RECIPIENT)

    expect(
      await buildSwapTransaction({
        ...params,
        module,
        quote: q,
        context: { platform: "ethereum" },
        slippage: 0.005,
      })
    ).toBe(BUILT)
    expect(createExchange).toHaveBeenCalledTimes(1)
    expect(createExchange).toHaveBeenCalledWith(params)
    expect(buildLeg).toHaveBeenCalledWith({
      leg: q.legs[0],
      input: 1000n,
      context: { platform: "ethereum" },
      exchange: { protocol: "simpleswap", data: { id: "exchange-1" } },
      slippage: 0.005,
    })
  })

  it("rejects a quote built for another recipient before opening an exchange", async () => {
    const { module, createExchange } = fakeModule()

    await expect(
      buildSwapTransaction({
        ...params,
        module,
        quote: quote(SENDER),
        context: { platform: "ethereum" },
        slippage: 0.005,
      })
    ).rejects.toThrow("Please select the quote again")
    expect(createExchange).not.toHaveBeenCalled()
  })

  it("rejects a quote for another token", async () => {
    const { module, createExchange } = fakeModule()

    await expect(
      buildSwapTransaction({
        ...params,
        fromTokenId: USDC,
        module,
        quote: quote(RECIPIENT),
        context: { platform: "ethereum" },
        slippage: 0.005,
      })
    ).rejects.toThrow("Please select the quote again")
    expect(createExchange).not.toHaveBeenCalled()
  })
})
