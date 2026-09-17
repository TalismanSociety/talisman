/// <reference types="node" />

import { expect, test } from "@playwright/test"

import {
  attachJson,
  attachRaw,
  expectNonNegativeNumber,
  expectNoServerError,
  expectPositiveNumber,
  skipIfUnavailable,
} from "./helpers"

const RAMP_API_URL = "https://ramp-api.talisman.xyz"
const HOST_API = `${RAMP_API_URL}/api/host-api/v3`

// ETH on Ethereum — Ramp's `<CHAIN>_<SYMBOL>` asset id, used by useRampCryptoAsset
const TEST_ASSET = "ETH_ETH"
const TEST_CURRENCY = "USD"
const TEST_ADDRESS = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

type QuoteForMethod = {
  fiatCurrency: string
  cryptoAmount: string
  fiatValue: number
  baseRampFee: number
  appliedFee: number
}

/** The quote endpoints return one entry per payment/payout method, plus a shared `asset` key. */
const quoteMethodEntries = (body: Record<string, unknown>) =>
  Object.entries(body).filter(
    (entry): entry is [string, QuoteForMethod] =>
      entry[0] !== "asset" &&
      typeof entry[1] === "object" &&
      entry[1] !== null &&
      "cryptoAmount" in (entry[1] as Record<string, unknown>)
  )

test.describe("Ramp API", () => {
  test.describe.configure({ retries: 2 })

  test("GET /currencies returns fiat currencies with availability flags", async ({ request }) => {
    const response = await request.get(`${HOST_API}/currencies`, { failOnStatusCode: false })
    skipIfUnavailable(response, "GET /currencies")

    const body = await response.json()
    await attachJson("currencies-response", body)

    expect(response.ok()).toBeTruthy()
    expect(Array.isArray(body)).toBeTruthy()
    expect(body.length).toBeGreaterThan(0)

    for (const currency of body) {
      expect(typeof currency.fiatCurrency).toBe("string")
      expect(typeof currency.name).toBe("string")
      // useRampCurrencies feeds the currency picker, which filters on these two booleans
      expect(typeof currency.onrampAvailable).toBe("boolean")
      expect(typeof currency.offrampAvailable).toBe("boolean")
    }

    const usd = body.find((c: { fiatCurrency: string }) => c.fiatCurrency === TEST_CURRENCY)
    expect(usd, "USD must be offered").toBeDefined()
    expect(usd.onrampAvailable).toBe(true)
  })

  /**
   * `PARTNER_NAME: Talisman` is the proof that the proxy is applying Talisman's host config.
   * If it drops, users get an unbranded widget and Talisman stops earning its host fee cut.
   */
  test("GET /assets returns Talisman's host config and buyable assets", async ({ request }) => {
    const response = await request.get(`${HOST_API}/assets?currencyCode=${TEST_CURRENCY}`, {
      failOnStatusCode: false,
    })
    skipIfUnavailable(response, "GET /assets")

    const body = await response.json()
    await attachJson("buy-assets-response", body)

    expect(response.ok()).toBeTruthy()
    expect(body.currencyCode).toBe(TEST_CURRENCY)
    expect(Array.isArray(body.assets)).toBeTruthy()
    expect(body.assets.length).toBeGreaterThan(0)

    const partnerName = body.enabledFeatures?.find(
      (feature: { name: string }) => feature.name === "PARTNER_NAME"
    )
    expect(partnerName, "PARTNER_NAME feature must be enabled").toBeDefined()
    expect(partnerName.params?.partnerName).toBe("Talisman")

    expectPositiveNumber(body.minPurchaseAmount, "minPurchaseAmount")
    expectPositiveNumber(body.maxPurchaseAmount, "maxPurchaseAmount")
    expect(Number(body.maxPurchaseAmount)).toBeGreaterThan(Number(body.minPurchaseAmount))
    expectNonNegativeNumber(body.minFeePercent, "minFeePercent")
    expectNonNegativeNumber(body.maxFeePercent, "maxFeePercent")

    const eth = body.assets.find(
      (asset: { symbol: string; chain: string }) => asset.symbol === "ETH" && asset.chain === "ETH"
    )
    expect(eth, "ETH on Ethereum must be buyable").toBeDefined()
    expect(eth.decimals).toBe(18)
    expect(eth.type).toBe("NATIVE")
    expectPositiveNumber(eth.price?.[TEST_CURRENCY], "ETH price in USD")
  })

  test("GET /offramp/assets returns sellable assets", async ({ request }) => {
    const response = await request.get(`${HOST_API}/offramp/assets?currencyCode=${TEST_CURRENCY}`, {
      failOnStatusCode: false,
    })
    skipIfUnavailable(response, "GET /offramp/assets")

    const body = await response.json()
    await attachJson("sell-assets-response", body)

    expect(response.ok()).toBeTruthy()
    expect(body.currencyCode).toBe(TEST_CURRENCY)
    expect(Array.isArray(body.assets)).toBeTruthy()
    expect(body.assets.length).toBeGreaterThan(0)
  })

  test("POST /onramp/quote/all returns a quote per payment method", async ({ request }) => {
    const response = await request.post(`${HOST_API}/onramp/quote/all`, {
      data: { fiatCurrency: TEST_CURRENCY, cryptoAssetSymbol: TEST_ASSET, fiatValue: 100 },
      failOnStatusCode: false,
    })
    skipIfUnavailable(response, "POST /onramp/quote/all")

    const body = await response.json()
    await attachJson("buy-quote-response", body)

    expect(response.ok()).toBeTruthy()

    const methods = quoteMethodEntries(body)
    expect(methods.length, "at least one payment method must be quoted").toBeGreaterThan(0)

    for (const [method, quote] of methods) {
      expect(quote.fiatCurrency, `${method} fiatCurrency`).toBe(TEST_CURRENCY)
      expect(quote.fiatValue, `${method} fiatValue`).toBe(100)

      // cryptoAmount is a plancks string, consumed as-is by the buy form
      expect(quote.cryptoAmount, `${method} cryptoAmount must be a string`).toEqual(
        expect.any(String)
      )
      expect(quote.cryptoAmount, `${method} cryptoAmount must be an integer string`).toMatch(
        /^\d+$/
      )
      expect(BigInt(quote.cryptoAmount), `${method} cryptoAmount`).toBeGreaterThan(0n)

      expectPositiveNumber(quote.baseRampFee, `${method} baseRampFee`)
      expectPositiveNumber(quote.appliedFee, `${method} appliedFee`)
      // appliedFee includes Talisman's host cut on top of Ramp's base fee
      expect(
        quote.appliedFee,
        `${method} appliedFee must cover baseRampFee`
      ).toBeGreaterThanOrEqual(quote.baseRampFee)
      expect(quote.appliedFee, `${method} appliedFee must be below the purchase`).toBeLessThan(100)
    }
  })

  test("POST /offramp/quote/all returns a quote per payout method", async ({ request }) => {
    const response = await request.post(`${HOST_API}/offramp/quote/all`, {
      data: {
        fiatCurrency: TEST_CURRENCY,
        cryptoAssetSymbol: TEST_ASSET,
        cryptoAmount: "100000000000000000", // 0.1 ETH
      },
      failOnStatusCode: false,
    })
    skipIfUnavailable(response, "POST /offramp/quote/all")

    const body = await response.json()
    await attachJson("sell-quote-response", body)

    expect(response.ok()).toBeTruthy()

    expect(body.asset, "the quote must describe the asset").toBeDefined()
    expect(body.asset.symbol).toBe("ETH")
    expect(body.asset.decimals).toBe(18)
    expectPositiveNumber(body.asset.price?.[TEST_CURRENCY], "ETH price in USD")

    const methods = quoteMethodEntries(body)
    expect(methods.length, "at least one payout method must be quoted").toBeGreaterThan(0)

    for (const [method, quote] of methods) {
      expect(quote.fiatCurrency, `${method} fiatCurrency`).toBe(TEST_CURRENCY)
      expect(quote.cryptoAmount, `${method} cryptoAmount`).toBe("100000000000000000")
      expectPositiveNumber(quote.fiatValue, `${method} fiatValue`)
      expectNonNegativeNumber(quote.baseRampFee, `${method} baseRampFee`)
      expectNonNegativeNumber(quote.appliedFee, `${method} appliedFee`)
    }
  })

  /**
   * Covers getRampBuyUrl / getRampSellUrl (src/ui/domains/Ramps/ramp/helpers.ts) without opening
   * the widget: the proxy must sign the URL and keep Talisman's host branding on it.
   */
  test("GET /talisman/getSignedBuySellUrl returns a signed Ramp widget URL", async ({
    request,
  }) => {
    const params = new URLSearchParams({
      defaultFlow: "ONRAMP",
      hideExitButton: "true",
      selectedCountryCode: "US",
      swapAsset: TEST_ASSET,
      userAddress: TEST_ADDRESS,
      fiatCurrency: TEST_CURRENCY,
      fiatValue: "100",
    })

    const response = await request.get(`${RAMP_API_URL}/talisman/getSignedBuySellUrl?${params}`, {
      failOnStatusCode: false,
    })
    skipIfUnavailable(response, "GET /talisman/getSignedBuySellUrl")

    const body = await response.json()
    await attachJson("signed-url-response", body)

    expect(response.ok()).toBeTruthy()
    expect(typeof body.url, "the response must carry a url").toBe("string")

    const url = new URL(body.url)
    expect(url.host).toBe("app.ramp.network")

    // the proxy's own host config must survive
    expect(url.searchParams.get("hostAppName")).toBe("Talisman")
    expect(url.searchParams.get("hostLogoUrl")).toBeTruthy()

    // and our parameters must be echoed unchanged
    expect(url.searchParams.get("swapAsset")).toBe(TEST_ASSET)
    expect(url.searchParams.get("fiatCurrency")).toBe(TEST_CURRENCY)
    expect(url.searchParams.get("userAddress")).toBe(TEST_ADDRESS)
    expect(url.searchParams.get("defaultFlow")).toBe("ONRAMP")
  })

  test.describe("Invalid parameter handling", () => {
    test("unknown currencyCode does not 5xx", async ({ request }) => {
      const response = await request.get(`${HOST_API}/assets?currencyCode=NOTACURRENCY`, {
        failOnStatusCode: false,
      })
      await attachRaw("invalid-currency-response", response)
      expectNoServerError(response)
    })

    test("unknown cryptoAssetSymbol on a quote does not 5xx", async ({ request }) => {
      const response = await request.post(`${HOST_API}/onramp/quote/all`, {
        data: {
          fiatCurrency: TEST_CURRENCY,
          cryptoAssetSymbol: "NOPE_NOPE",
          fiatValue: 100,
        },
        failOnStatusCode: false,
      })
      await attachRaw("invalid-asset-response", response)
      expectNoServerError(response)
    })

    test("non-existent endpoint returns 404, not 5xx", async ({ request }) => {
      const response = await request.get(`${RAMP_API_URL}/nonexistent-endpoint`, {
        failOnStatusCode: false,
      })
      await attachRaw("nonexistent-response", response)
      expectNoServerError(response)
    })
  })
})
