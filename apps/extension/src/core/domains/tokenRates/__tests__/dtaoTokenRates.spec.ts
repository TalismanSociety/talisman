import type { SubDTaoToken, Token, TokenList } from "@talismn/chaindata-provider"
import { subNativeTokenId } from "@talismn/chaindata-provider"
import { newTokenRates, type TokenRatesList } from "@talismn/token-rates"
import { Struct, u16, u64, Vector } from "scale-ts"
import { beforeEach, describe, expect, it, vi } from "vitest"

// ── Module mocks ────────────────────────────────────────────────────────────

const mockSend = vi.fn()
vi.mock("../../../rpcs/chain-connector", () => ({
  chainConnector: { send: (...args: unknown[]) => mockSend(...args) },
}))

const mockListPools = vi.fn()
vi.mock("../../bittensor/tao-data/exports", () => ({
  getTaoDataApi: () => ({ pools: { listPools: (...args: unknown[]) => mockListPools(...args) } }),
}))

vi.mock("../../gandalf/fetch", () => ({ gandalfFetch: vi.fn() }))

const mockGetNetworkById = vi.fn()
vi.mock("../../../rpcs/chaindata", () => ({
  chaindataProvider: { getNetworkById: (...args: unknown[]) => mockGetNetworkById(...args) },
}))

const mockGetActiveNetworks = vi.fn()
vi.mock("../../balances/store.activeNetworks", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  activeNetworksStore: { get: () => mockGetActiveNetworks() },
}))

vi.mock("@common/log", () => ({
  log: { debug: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

import { fetchDTaoTokenRates } from "../dtaoTokenRates"

// ── Fixtures ────────────────────────────────────────────────────────────────

const TAO_TOKEN_ID = subNativeTokenId("bittensor")

const alphaPricesCodec = Vector(Struct({ netuid: u16, price: u64 }))
const encodePrices = (prices: Array<{ netuid: number; price: bigint }>): string =>
  `0x${Buffer.from(alphaPricesCodec.enc(prices)).toString("hex")}`

const makeDTaoToken = (netuid: number): SubDTaoToken =>
  ({
    id: `bittensor:substrate-dtao:${netuid}`,
    networkId: "bittensor",
    type: "substrate-dtao",
    platform: "polkadot",
    netuid,
    decimals: 9,
    symbol: `α${netuid}`,
    isTransferable: true,
  }) as SubDTaoToken

const makeTokens = (...netuids: number[]): TokenList =>
  Object.fromEntries([
    [TAO_TOKEN_ID, { id: TAO_TOKEN_ID, type: "substrate-native", networkId: "bittensor" } as Token],
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
  mockListPools.mockReset()
  mockListPools.mockRejectedValue(new Error("no pools in this test"))
  mockGetNetworkById.mockReset()
  mockGetNetworkById.mockResolvedValue({ id: "bittensor", isDefault: true, isTestnet: false })
  mockGetActiveNetworks.mockReset()
  mockGetActiveNetworks.mockResolvedValue({})
})

// ── Tests ───────────────────────────────────────────────────────────────────

describe("fetchDTaoTokenRates", () => {
  it("makes no chain call when there are no dtao tokens", async () => {
    const tokens: TokenList = {
      [TAO_TOKEN_ID]: { id: TAO_TOKEN_ID, type: "substrate-native" } as Token,
    }

    const result = await fetchDTaoTokenRates(tokens, makeCoingeckoRates(), {})

    expect(result).toEqual({})
    expect(mockSend).not.toHaveBeenCalled()
  })

  it("makes no chain call when the bittensor network is disabled", async () => {
    mockGetActiveNetworks.mockResolvedValue({ bittensor: false })

    const result = await fetchDTaoTokenRates(makeTokens(1), makeCoingeckoRates(), {})

    expect(result).toEqual({})
    expect(mockSend).not.toHaveBeenCalled()
  })

  it("computes rates for dtao tokens from the fetched pool prices", async () => {
    // 0.5 TAO per alpha
    mockSend.mockResolvedValue(encodePrices([{ netuid: 1, price: 500_000_000n }]))

    const result = await fetchDTaoTokenRates(makeTokens(1), makeCoingeckoRates(), {})

    const alphaRates = result["bittensor:substrate-dtao:1"]
    expect(alphaRates?.usd?.price).toBe(200)
    expect(mockSend).toHaveBeenCalledWith("bittensor", "state_call", [
      "SwapRuntimeApi_current_alpha_price_all",
      "0x",
    ])
  })

  it("keeps previous rates when the chain call fails", async () => {
    mockSend.mockRejectedValue(new Error("rpc down"))
    const previousAlphaRates = newTokenRates()
    previousAlphaRates.usd = { price: 123 }
    const previousRates: TokenRatesList = {
      "bittensor:substrate-dtao:1": previousAlphaRates,
    }

    const result = await fetchDTaoTokenRates(makeTokens(1), makeCoingeckoRates(), previousRates)

    expect(result["bittensor:substrate-dtao:1"]).toBe(previousAlphaRates)
  })

  it("keeps previous rates for a netuid missing from the result instead of fabricating a zero price", async () => {
    mockSend.mockResolvedValue(encodePrices([{ netuid: 1, price: 500_000_000n }]))
    const previousAlphaRates = newTokenRates()
    previousAlphaRates.usd = { price: 123 }
    const previousRates: TokenRatesList = {
      "bittensor:substrate-dtao:2": previousAlphaRates,
    }

    const result = await fetchDTaoTokenRates(makeTokens(1, 2), makeCoingeckoRates(), previousRates)

    expect(result["bittensor:substrate-dtao:1"]?.usd?.price).toBe(200)
    expect(result["bittensor:substrate-dtao:2"]).toBe(previousAlphaRates)
  })

  it("omits entries with neither a price nor previous rates", async () => {
    mockSend.mockResolvedValue(encodePrices([]))

    const result = await fetchDTaoTokenRates(makeTokens(1), makeCoingeckoRates(), {})

    expect(result).toEqual({})
  })
})
