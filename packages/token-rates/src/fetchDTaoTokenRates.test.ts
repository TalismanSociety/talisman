import type { IChainConnectorDot } from "@talismn/chain-connectors"
import type { SubDTaoToken, Token, TokenList } from "@talismn/chaindata-provider"
import { subNativeTokenId } from "@talismn/chaindata-provider"
import { Struct, u16, u64, Vector } from "scale-ts"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { fetchDTaoTokenRates } from "./fetchDTaoTokenRates"
import { newTokenRates, type TokenRatesList } from "./types"

const NETWORK_ID = "bittensor"
const TAO_TOKEN_ID = subNativeTokenId(NETWORK_ID)

const alphaPricesCodec = Vector(Struct({ netuid: u16, price: u64 }))
const encodePrices = (prices: Array<{ netuid: number; price: bigint }>): string =>
  `0x${Buffer.from(alphaPricesCodec.enc(prices)).toString("hex")}`

const mockSend = vi.fn()
const connector = { send: mockSend } as unknown as IChainConnectorDot

const mockFetch = vi.fn()

const makeDTaoToken = (netuid: number): SubDTaoToken =>
  ({
    id: `${NETWORK_ID}:substrate-dtao:${netuid}`,
    networkId: NETWORK_ID,
    type: "substrate-dtao",
    platform: "polkadot",
    netuid,
    decimals: 9,
    symbol: `α${netuid}`,
    isTransferable: true,
  }) as SubDTaoToken

const makeTokens = (...netuids: number[]): TokenList =>
  Object.fromEntries([
    [TAO_TOKEN_ID, { id: TAO_TOKEN_ID, type: "substrate-native", networkId: NETWORK_ID } as Token],
    ...netuids.map((netuid) => {
      const token = makeDTaoToken(netuid)
      return [token.id, token] as const
    }),
  ])

const makeCoingeckoRates = (): TokenRatesList => {
  const taoRates = newTokenRates()
  taoRates.usd = { price: 400, marketCap: undefined, change24h: 2 }
  return { [TAO_TOKEN_ID]: taoRates }
}

beforeEach(() => {
  mockSend.mockReset()
  mockFetch.mockReset()
  mockFetch.mockRejectedValue(new Error("no tao-data in this test"))
})

describe("fetchDTaoTokenRates", () => {
  it("makes no chain call when there are no dtao tokens", async () => {
    const tokens: TokenList = {
      [TAO_TOKEN_ID]: { id: TAO_TOKEN_ID, type: "substrate-native" } as Token,
    }

    const result = await fetchDTaoTokenRates({
      connector,
      tokens,
      tokenRates: makeCoingeckoRates(),
      previousRates: {},
      customFetch: mockFetch,
    })

    expect(result).toEqual({})
    expect(mockSend).not.toHaveBeenCalled()
  })

  it("computes rates for dtao tokens from the fetched pool prices", async () => {
    // 0.5 TAO per alpha
    mockSend.mockResolvedValue(encodePrices([{ netuid: 1, price: 500_000_000n }]))

    const result = await fetchDTaoTokenRates({
      connector,
      tokens: makeTokens(1),
      tokenRates: makeCoingeckoRates(),
      previousRates: {},
      customFetch: mockFetch,
    })

    expect(result[`${NETWORK_ID}:substrate-dtao:1`]?.usd?.price).toBe(200)
    expect(mockSend).toHaveBeenCalledWith(NETWORK_ID, "state_call", [
      "SwapRuntimeApi_current_alpha_price_all",
      "0x",
    ])
  })

  it("keeps previous rates when the chain call fails", async () => {
    mockSend.mockRejectedValue(new Error("rpc down"))
    const previousAlphaRates = newTokenRates()
    previousAlphaRates.usd = { price: 123 }
    const previousRates: TokenRatesList = {
      [`${NETWORK_ID}:substrate-dtao:1`]: previousAlphaRates,
    }

    const result = await fetchDTaoTokenRates({
      connector,
      tokens: makeTokens(1),
      tokenRates: makeCoingeckoRates(),
      previousRates,
      customFetch: mockFetch,
    })

    expect(result[`${NETWORK_ID}:substrate-dtao:1`]).toBe(previousAlphaRates)
  })

  it("keeps previous rates for a netuid missing from the result instead of fabricating a zero price", async () => {
    mockSend.mockResolvedValue(encodePrices([{ netuid: 1, price: 500_000_000n }]))
    const previousAlphaRates = newTokenRates()
    previousAlphaRates.usd = { price: 123 }
    const previousRates: TokenRatesList = {
      [`${NETWORK_ID}:substrate-dtao:2`]: previousAlphaRates,
    }

    const result = await fetchDTaoTokenRates({
      connector,
      tokens: makeTokens(1, 2),
      tokenRates: makeCoingeckoRates(),
      previousRates,
      customFetch: mockFetch,
    })

    expect(result[`${NETWORK_ID}:substrate-dtao:1`]?.usd?.price).toBe(200)
    expect(result[`${NETWORK_ID}:substrate-dtao:2`]).toBe(previousAlphaRates)
  })

  it("omits entries with neither a price nor previous rates", async () => {
    mockSend.mockResolvedValue(encodePrices([]))

    const result = await fetchDTaoTokenRates({
      connector,
      tokens: makeTokens(1),
      tokenRates: makeCoingeckoRates(),
      previousRates: {},
      customFetch: mockFetch,
    })

    expect(result).toEqual({})
  })

  it("applies 24h pool changes fetched through the injected fetch", async () => {
    mockSend.mockResolvedValue(encodePrices([{ netuid: 1, price: 1_000_000_000n }]))
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify([{ netuid: 1, price_change_1_day: 10 }]), { status: 200 })
    )

    const result = await fetchDTaoTokenRates({
      connector,
      tokens: makeTokens(1),
      tokenRates: makeCoingeckoRates(),
      previousRates: {},
      customFetch: mockFetch,
      // bypass the module-level 5-min cache shared across tests
      taoDataApiUrl: "https://tao-data.test/changes",
    })

    // pool +10% compounded with TAO/usd +2%
    expect(result[`${NETWORK_ID}:substrate-dtao:1`]?.usd?.change24h).toBeCloseTo(
      (1.1 * 1.02 - 1) * 100
    )
    expect(mockFetch).toHaveBeenCalledWith(
      "https://tao-data.test/changes/pools",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
  })

  it("keeps previous rates when the chain call hangs past the timeout", async () => {
    vi.useFakeTimers()
    try {
      mockSend.mockReturnValue(new Promise(() => {})) // never settles
      const previousAlphaRates = newTokenRates()
      previousAlphaRates.usd = { price: 123 }
      const previousRates: TokenRatesList = {
        [`${NETWORK_ID}:substrate-dtao:1`]: previousAlphaRates,
      }

      const resultPromise = fetchDTaoTokenRates({
        connector,
        tokens: makeTokens(1),
        tokenRates: makeCoingeckoRates(),
        previousRates,
        customFetch: mockFetch,
        timeoutMs: 5_000,
      })
      await vi.advanceTimersByTimeAsync(5_000)

      const result = await resultPromise
      expect(result[`${NETWORK_ID}:substrate-dtao:1`]).toBe(previousAlphaRates)
    } finally {
      vi.useRealTimers()
    }
  })
})
