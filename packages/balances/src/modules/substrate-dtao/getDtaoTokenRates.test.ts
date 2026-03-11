import { type SubDTaoToken, subNativeTokenId } from "@talismn/chaindata-provider"
import { newTokenRates, type TokenRatesList } from "@talismn/token-rates"

import { ALPHA_PRICE_SCALE, alphaToTao, TAO_DECIMALS } from "./alphaPrice"
import { getDTaoTokenRates } from "./getDtaoTokenRates"

const NETWORK_ID = "bittensor-0"
const TAO_TOKEN_ID = subNativeTokenId(NETWORK_ID)
const ONE_ALPHA = 10n ** TAO_DECIMALS

const makeToken = (netuid: number): SubDTaoToken => ({
  id: `${NETWORK_ID}:substrate-dtao:${netuid}`,
  networkId: NETWORK_ID,
  type: "substrate-dtao",
  platform: "polkadot",
  netuid,
  decimals: 9,
  symbol: netuid === 0 ? "TAO" : `α${netuid}`,
  isTransferable: true,
})

const makeTaoRates = () => {
  const rates = newTokenRates()
  rates.usd = { price: 400, marketCap: 3_000_000_000, change24h: 2.5 }
  rates.btc = { price: 0.004, marketCap: 30000, change24h: -1.2 }
  return rates
}

const makeTokenRatesList = (taoRates = makeTaoRates()): TokenRatesList => ({
  [TAO_TOKEN_ID]: taoRates,
})

describe("getDTaoTokenRates", () => {
  describe("root subnet (netuid=0)", () => {
    it("returns a deep clone of TAO rates", () => {
      const taoRates = makeTaoRates()
      const tokenRates = makeTokenRatesList(taoRates)
      const token = makeToken(0)

      const result = getDTaoTokenRates(token, tokenRates, ALPHA_PRICE_SCALE.toString())

      expect(result).toEqual(taoRates)
      // Must be a different reference (structuredClone)
      expect(result).not.toBe(taoRates)
    })
  })

  describe("non-root subnet", () => {
    it("computes alpha rates from TAO rates and scaledAlphaPrice", () => {
      const tokenRates = makeTokenRatesList()
      const token = makeToken(1)
      // price ratio = 0.5 TAO per alpha
      const scaledPrice = 500_000_000n

      const result = getDTaoTokenRates(token, tokenRates, scaledPrice)!

      const taoPrice = alphaToTao(ONE_ALPHA, scaledPrice)
      const priceRatio = Number(taoPrice) / Number(ALPHA_PRICE_SCALE)

      expect(result.usd).toEqual({
        price: 400 * priceRatio,
        marketCap: 3_000_000_000 * priceRatio,
        change24h: undefined,
      })
      expect(result.btc).toEqual({
        price: 0.004 * priceRatio,
        marketCap: 30000 * priceRatio,
        change24h: undefined,
      })
    })

    it("sets change24h to undefined in all currency entries", () => {
      const tokenRates = makeTokenRatesList()
      const token = makeToken(2)

      const result = getDTaoTokenRates(token, tokenRates, ALPHA_PRICE_SCALE)!

      expect(result.usd!.change24h).toBeUndefined()
      expect(result.btc!.change24h).toBeUndefined()
    })

    it("sets marketCap to undefined when TAO marketCap is falsy", () => {
      const taoRates = newTokenRates()
      taoRates.usd = { price: 400, marketCap: undefined, change24h: 1.0 }
      const tokenRates = makeTokenRatesList(taoRates)
      const token = makeToken(3)

      const result = getDTaoTokenRates(token, tokenRates, ALPHA_PRICE_SCALE)!

      expect(result.usd!.marketCap).toBeUndefined()
    })

    it("preserves null entries from TAO rates", () => {
      const tokenRates = makeTokenRatesList()
      const token = makeToken(1)

      const result = getDTaoTokenRates(token, tokenRates, ALPHA_PRICE_SCALE)!

      // Currencies not set in makeTaoRates should stay null
      expect(result.eur).toBeNull()
      expect(result.jpy).toBeNull()
    })
  })

  describe("missing TAO rates", () => {
    it("returns null when TAO token rates are not in tokenRates", () => {
      const token = makeToken(1)
      const emptyRates: TokenRatesList = {}

      const result = getDTaoTokenRates(token, emptyRates, ALPHA_PRICE_SCALE)

      expect(result).toBeNull()
    })
  })

  describe("scaledAlphaPrice input types", () => {
    it("accepts scaledAlphaPrice as a string", () => {
      const tokenRates = makeTokenRatesList()
      const token = makeToken(1)

      const result = getDTaoTokenRates(token, tokenRates, "500000000")

      expect(result).not.toBeNull()
      expect(result!.usd!.price).toBeGreaterThan(0)
    })

    it("accepts scaledAlphaPrice as a bigint", () => {
      const tokenRates = makeTokenRatesList()
      const token = makeToken(1)

      const result = getDTaoTokenRates(token, tokenRates, 500_000_000n)

      expect(result).not.toBeNull()
      expect(result!.usd!.price).toBeGreaterThan(0)
    })

    it("produces identical results for string and bigint scaledAlphaPrice", () => {
      const tokenRates = makeTokenRatesList()
      const token = makeToken(1)

      const fromString = getDTaoTokenRates(token, tokenRates, "500000000")
      const fromBigint = getDTaoTokenRates(token, tokenRates, 500_000_000n)

      expect(fromString).toEqual(fromBigint)
    })
  })

  describe("1:1 price ratio", () => {
    it("produces rates equal to TAO rates (minus change24h) when price is ALPHA_PRICE_SCALE", () => {
      const tokenRates = makeTokenRatesList()
      const token = makeToken(5)

      const result = getDTaoTokenRates(token, tokenRates, ALPHA_PRICE_SCALE)!

      expect(result.usd!.price).toBe(400)
      expect(result.usd!.marketCap).toBe(3_000_000_000)
      expect(result.usd!.change24h).toBeUndefined()
    })
  })
})
