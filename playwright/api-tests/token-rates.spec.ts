/// <reference types="node" />

import { type APIRequestContext, expect, test } from "@playwright/test"

import {
  attachJson,
  attachRaw,
  expectFiniteNumber,
  expectNonNegativeNumber,
  expectNoServerError,
  expectPositiveNumber,
} from "./helpers"

const COINS_API_URL = "https://coins.talisman.xyz"

/**
 * To save bandwidth the API returns values positionally, without property names:
 * `[[[price, marketCap, change24h], ...perCurrency], ...perCoingeckoId]`.
 * See `RawTokenRates` / `parseTokenRatesFromApi` in packages/token-rates/src/TokenRates.ts.
 */
type RawTokenRates = ([number | null, number | null, number | null] | null)[][]

/**
 * Mirrors SUPPORTED_CURRENCIES in packages/token-rates/src/types.ts, minus `tao`:
 * coingecko has no TAO vs-currency, so the wallet derives it from usd and never asks for it
 * (see the `hasVsTao` branch in TokenRates.ts).
 */
const API_CURRENCY_IDS = [
  "btc",
  "eth",
  "dot",
  "usd",
  "cny",
  "eur",
  "gbp",
  "cad",
  "aud",
  "nzd",
  "jpy",
  "rub",
  "krw",
  "idr",
  "php",
  "thb",
  "vnd",
  "inr",
  "try",
  "sgd",
] as const

const fetchRates = (
  request: APIRequestContext,
  coingeckoIds: string[],
  currencyIds: readonly string[]
) =>
  request.post(`${COINS_API_URL}/token-rates`, {
    data: { coingeckoIds, currencyIds },
    failOnStatusCode: false,
  })

test.describe("Token Rates API", () => {
  test.describe.configure({ retries: 2 })

  test("POST /token-rates returns a coingeckoId x currency matrix", async ({ request }) => {
    const coingeckoIds = ["polkadot", "bittensor", "ethereum"]
    const currencyIds = ["usd", "eur", "btc"]

    const response = await fetchRates(request, coingeckoIds, currencyIds)
    const body = (await response.json()) as RawTokenRates
    await attachJson("token-rates-response", body)

    expect(response.ok()).toBeTruthy()
    expect(Array.isArray(body)).toBeTruthy()
    expect(body).toHaveLength(coingeckoIds.length)

    for (const [idx, rates] of body.entries()) {
      expect(
        Array.isArray(rates),
        `row ${idx} (${coingeckoIds[idx]}) must be an array`
      ).toBeTruthy()
      expect(rates, `row ${idx} (${coingeckoIds[idx]})`).toHaveLength(currencyIds.length)

      for (const [curIdx, rate] of rates.entries()) {
        // a cell may legitimately be null, but when present it is always a 3-tuple
        if (rate === null) continue
        expect(rate, `${coingeckoIds[idx]}/${currencyIds[curIdx]} must be a 3-tuple`).toHaveLength(
          3
        )
      }
    }
  })

  /**
   * The single most important guarantee of this API: rows/cells are matched back to ids purely
   * by index (parseTokenRatesFromApi). If the backend ever reorders them, every price in the
   * wallet silently belongs to the wrong token — no error, no failed request.
   */
  test("row order follows the requested coingeckoId order", async ({ request }) => {
    const currencyIds = ["usd"]

    const forward = await fetchRates(request, ["bittensor", "polkadot"], currencyIds)
    const reversed = await fetchRates(request, ["polkadot", "bittensor"], currencyIds)
    expect(forward.ok()).toBeTruthy()
    expect(reversed.ok()).toBeTruthy()

    const forwardBody = (await forward.json()) as RawTokenRates
    const reversedBody = (await reversed.json()) as RawTokenRates
    await attachJson("order-forward", forwardBody)
    await attachJson("order-reversed", reversedBody)

    const taoForward = forwardBody[0]?.[0]?.[0]
    const dotForward = forwardBody[1]?.[0]?.[0]
    const dotReversed = reversedBody[0]?.[0]?.[0]
    const taoReversed = reversedBody[1]?.[0]?.[0]

    expectPositiveNumber(taoForward, "bittensor/usd (first position)")
    expectPositiveNumber(dotForward, "polkadot/usd (second position)")

    // TAO is worth orders of magnitude more than DOT, so a swapped mapping is unmistakable
    expect(Number(taoForward)).toBeGreaterThan(Number(dotForward))

    // same ids, opposite request order -> the values must follow the request, not the response slot
    expect(Number(dotReversed)).toBeCloseTo(Number(dotForward), 1)
    expect(Number(taoReversed)).toBeCloseTo(Number(taoForward), 1)
  })

  test("cell values are valid price / marketCap / change24h triples", async ({ request }) => {
    const response = await fetchRates(request, ["polkadot", "ethereum"], ["usd", "eur"])
    expect(response.ok()).toBeTruthy()
    const body = (await response.json()) as RawTokenRates
    await attachJson("triples-response", body)

    for (const [idx, rates] of body.entries()) {
      for (const [curIdx, rate] of rates.entries()) {
        if (rate === null) continue
        const label = `row ${idx} currency ${curIdx}`
        const [price, marketCap, change24h] = rate

        expectPositiveNumber(price, `${label} price`)
        if (marketCap !== null) expectNonNegativeNumber(marketCap, `${label} marketCap`)
        if (change24h !== null) expectFiniteNumber(change24h, `${label} change24h`)
      }
    }
  })

  /**
   * Guards against a currency silently disappearing upstream: the wallet offers all of these in
   * the currency picker, and a dropped one renders as a blank fiat value everywhere.
   */
  test("every supported currency resolves for a major token", async ({ request }) => {
    const response = await fetchRates(request, ["polkadot"], API_CURRENCY_IDS)
    expect(response.ok()).toBeTruthy()
    const body = (await response.json()) as RawTokenRates
    await attachJson("all-currencies-response", body)

    expect(body).toHaveLength(1)
    const rates = body[0]
    expect(rates).toHaveLength(API_CURRENCY_IDS.length)

    const missing = API_CURRENCY_IDS.filter((_, idx) => {
      const price = rates[idx]?.[0]
      return price === null || price === undefined
    })
    expect(missing, `currencies with no price: ${missing.join(", ")}`).toHaveLength(0)
  })

  /**
   * The wallet's whole TAO-denominated display is computed from bittensor/usd
   * (the `hasVsTao` branch in TokenRates.ts). No bittensor/usd rate -> every TAO balance breaks.
   */
  test("bittensor/usd is resolvable (TAO display depends on it)", async ({ request }) => {
    const response = await fetchRates(request, ["bittensor"], ["usd"])
    expect(response.ok()).toBeTruthy()
    const body = (await response.json()) as RawTokenRates
    await attachJson("bittensor-usd-response", body)

    expect(body).toHaveLength(1)
    expect(body[0]).toHaveLength(1)
    expectPositiveNumber(body[0]?.[0]?.[0], "bittensor/usd price")
  })

  test("unknown coingeckoId keeps the row positions intact", async ({ request }) => {
    const coingeckoIds = ["polkadot", "definitely-not-a-real-coin", "ethereum"]
    const response = await fetchRates(request, coingeckoIds, ["usd"])
    await attachRaw("unknown-id-response", response)

    expectNoServerError(response)
    if (!response.ok()) return

    const body = (await response.json()) as RawTokenRates
    expect(body, "the unknown id must not collapse the array").toHaveLength(coingeckoIds.length)

    // the known ids must still land on their requested indexes
    expectPositiveNumber(body[0]?.[0]?.[0], "polkadot/usd at index 0")
    expectPositiveNumber(body[2]?.[0]?.[0], "ethereum/usd at index 2")
  })

  test("empty and malformed requests do not 5xx", async ({ request }) => {
    const empty = await fetchRates(request, [], [])
    await attachRaw("empty-request-response", empty)
    expectNoServerError(empty)

    const malformed = await request.post(`${COINS_API_URL}/token-rates`, {
      data: { coingeckoIds: "not-an-array", currencyIds: 42 },
      failOnStatusCode: false,
    })
    await attachRaw("malformed-request-response", malformed)
    expectNoServerError(malformed)
  })

  test("non-existent endpoint returns 404, not 5xx", async ({ request }) => {
    const response = await request.get(`${COINS_API_URL}/nonexistent-endpoint`, {
      failOnStatusCode: false,
    })
    await attachRaw("nonexistent-response", response)
    expectNoServerError(response)
  })
})
