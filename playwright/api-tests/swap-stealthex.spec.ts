/// <reference types="node" />

import { expect, test } from "@playwright/test"

import {
  attachJson,
  attachRaw,
  expectNoServerError,
  expectPositiveNumber,
  skipIfUnavailable,
} from "./helpers"

const STEALTHEX_API_URL = "https://stealthex.talisman.xyz"

/**
 * getAllCurrencies in stealthex-swap-module.ts pages with limit=250 and stops as soon as a page
 * returns fewer than 250 items. If the provider ever changes its page size, the asset list is
 * silently truncated at the first page — hence the exact assertion below.
 */
const PAGE_SIZE = 250

/**
 * ETH on Ethereum -> USDC on Ethereum. Both sides are assets the wallet actually holds (they are in
 * `swaps.curatedTokens` in the remote config), so the fixture exercises a route a user can really
 * take — unlike BTC, which the wallet does not support at all. Note StealthEX names Ethereum
 * `mainnet` for the native coin but `eth` for tokens on it.
 */
const ROUTE = {
  from: { network: "mainnet", symbol: "eth" },
  to: { network: "eth", symbol: "usdc" },
}

test.describe("StealthEX Swap API", () => {
  test.describe.configure({ retries: 2 })

  test("GET /v4/currencies returns a full page of 250 currencies", async ({ request }) => {
    const response = await request.get(
      `${STEALTHEX_API_URL}/v4/currencies?limit=${PAGE_SIZE}&offset=0`,
      { failOnStatusCode: false }
    )
    skipIfUnavailable(response, "GET /v4/currencies")

    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    await attachJson("currencies-sample", Array.isArray(body) ? body.slice(0, 3) : body)

    expect(Array.isArray(body)).toBeTruthy()
    expect(body, `the pagination loop assumes a page size of ${PAGE_SIZE}`).toHaveLength(PAGE_SIZE)

    for (const currency of body.slice(0, 20)) {
      expect(typeof currency.symbol).toBe("string")
      expect(typeof currency.network).toBe("string")
      expect(Array.isArray(currency.rates), "rates drives fixed/floating support").toBeTruthy()
      expect(Array.isArray(currency.features)).toBeTruthy()
    }
  })

  test("GET /v4/currencies honours offset", async ({ request }) => {
    const [first, second] = await Promise.all([
      request.get(`${STEALTHEX_API_URL}/v4/currencies?limit=${PAGE_SIZE}&offset=0`, {
        failOnStatusCode: false,
      }),
      request.get(`${STEALTHEX_API_URL}/v4/currencies?limit=${PAGE_SIZE}&offset=${PAGE_SIZE}`, {
        failOnStatusCode: false,
      }),
    ])
    skipIfUnavailable(first, "GET /v4/currencies (page 1)")
    skipIfUnavailable(second, "GET /v4/currencies (page 2)")

    expect(first.ok()).toBeTruthy()
    expect(second.ok()).toBeTruthy()

    const page1 = await first.json()
    const page2 = await second.json()
    expect(page2.length, "a second page must exist").toBeGreaterThan(0)
    await attachJson("pagination-boundary", { page1End: page1.at(-1), page2Start: page2[0] })

    const key = (c: { symbol: string; network: string }) => `${c.symbol}:${c.network}`
    const page1Keys = new Set(page1.map(key))
    const overlap = page2.filter((c: { symbol: string; network: string }) => page1Keys.has(key(c)))

    // a broken offset would replay page 1 and make the loop drop every currency past the first page
    expect(overlap, `offset=${PAGE_SIZE} must not repeat page 1`).toHaveLength(0)
  })

  test("GET /v4/currencies/:symbol/:network returns available routes on demand", async ({
    request,
  }) => {
    const response = await request.get(
      `${STEALTHEX_API_URL}/v4/currencies/${ROUTE.from.symbol}/${ROUTE.from.network}?include_available_routes=true`,
      { failOnStatusCode: false }
    )
    skipIfUnavailable(response, "GET /v4/currencies/:symbol/:network")

    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    await attachJson("currency-detail", {
      ...body,
      available_routes: body.available_routes?.slice(0, 5),
    })

    expect(body.symbol).toBe(ROUTE.from.symbol)
    expect(body.network).toBe(ROUTE.from.network)
    expect(Array.isArray(body.available_routes)).toBeTruthy()
    expect(
      body.available_routes.length,
      `${ROUTE.from.symbol} must have destinations`
    ).toBeGreaterThan(0)

    for (const route of body.available_routes.slice(0, 20)) {
      expect(typeof route.symbol).toBe("string")
      expect(typeof route.network).toBe("string")
      expect(Array.isArray(route.rates)).toBeTruthy()
    }

    const target = body.available_routes.find(
      (route: { symbol: string; network: string }) =>
        route.symbol === ROUTE.to.symbol && route.network === ROUTE.to.network
    )
    expect(target, `${ROUTE.from.symbol} -> ${ROUTE.to.symbol} must be routable`).toBeDefined()
  })

  test("available_routes is omitted unless requested", async ({ request }) => {
    const response = await request.get(
      `${STEALTHEX_API_URL}/v4/currencies/${ROUTE.from.symbol}/${ROUTE.from.network}`,
      { failOnStatusCode: false }
    )
    skipIfUnavailable(response, "GET /v4/currencies/:symbol/:network (no flag)")

    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    await attachJson("currency-detail-no-routes", body)

    // getPairs passes include_available_routes explicitly; the payload would be huge by default
    expect(body.available_routes, "routes must be opt-in").toBeUndefined()
  })

  test("POST /v4/rates/range returns the swappable range", async ({ request }) => {
    const response = await request.post(`${STEALTHEX_API_URL}/v4/rates/range`, {
      data: { route: ROUTE, estimation: "direct", rate: "floating" },
      failOnStatusCode: false,
    })
    skipIfUnavailable(response, "POST /v4/rates/range")

    const body = await response.json()
    await attachJson("range-response", body)

    expect(response.ok()).toBeTruthy()
    // getRange feeds the swap form's minimum; a zero/missing min lets invalid swaps through
    expectPositiveNumber(body.min_amount, `${ROUTE.from.symbol} -> ${ROUTE.to.symbol} min_amount`)

    if (body.max_amount !== null && body.max_amount !== undefined) {
      expectPositiveNumber(body.max_amount, "max_amount")
      expect(Number(body.max_amount)).toBeGreaterThanOrEqual(Number(body.min_amount))
    }
  })

  test("POST /v4/rates/estimated-amount returns a quote", async ({ request }) => {
    const response = await request.post(`${STEALTHEX_API_URL}/v4/rates/estimated-amount`, {
      data: { route: ROUTE, amount: 0.1, estimation: "direct", rate: "floating" },
      failOnStatusCode: false,
    })
    skipIfUnavailable(response, "POST /v4/rates/estimated-amount")

    const body = await response.json()
    await attachJson("estimate-response", body)

    expect(response.ok()).toBeTruthy()
    expectPositiveNumber(body.estimated_amount, "estimated_amount")
  })

  test.describe("Error handling", () => {
    /**
     * The module surfaces errors as `${error.err.kind}: ${error.err.details}`. If the envelope is
     * ever renamed, every swap error message in the UI becomes "undefined: undefined".
     */
    test("errors use the { err: { kind, details } } envelope", async ({ request }) => {
      const response = await request.post(`${STEALTHEX_API_URL}/v4/rates/range`, {
        data: {
          route: { from: { network: "mainnet", symbol: "notacoin" }, to: ROUTE.to },
          estimation: "direct",
          rate: "floating",
        },
        failOnStatusCode: false,
      })
      await attachRaw("error-envelope-response", response)

      expectNoServerError(response)
      expect(response.status(), "an unknown symbol is a client error").toBeGreaterThanOrEqual(400)

      const body = await response.json()
      expect(body.err, "the error envelope must carry `err`").toBeDefined()
      expect(typeof body.err.kind, "err.kind is rendered in the UI").toBe("string")
      expect(body.err).toHaveProperty("details")
    })

    /**
     * fetchStealthexStatus (core/domains/transactions/watchSwapStatus.ts) throws on a non-ok
     * response, so an unknown exchange id must stay a clean 404.
     */
    test("GET /v4/exchanges/:id with an unknown id returns 404, not 5xx", async ({ request }) => {
      const response = await request.get(
        `${STEALTHEX_API_URL}/v4/exchanges/definitely-not-an-exchange-id`,
        { failOnStatusCode: false }
      )
      await attachRaw("unknown-exchange-response", response)

      expectNoServerError(response)
      expect(response.status()).toBe(404)
    })

    /**
     * Known issue: any unrouted path makes the proxy worker throw (Cloudflare "Error 1101:
     * Worker threw exception") instead of returning 404. Same root cause as the openapi.json
     * failure below. Routed paths behave correctly — see the 404 assertion above.
     */
    test.fixme("non-existent endpoint returns 404, not 5xx", async ({ request }) => {
      const response = await request.get(`${STEALTHEX_API_URL}/v4/nonexistent-endpoint`, {
        failOnStatusCode: false,
      })
      await attachRaw("nonexistent-response", response)
      expectNoServerError(response)
    })
  })

  /**
   * Known issue: both /openapi.json and /docs/openapi.json return 500 (the proxy worker throws on
   * unrouted paths — see the fixme above), which breaks `pnpm chore:codegen:stealthex-swaps`: the
   * types in apps/extension/src/ui/domains/Swap/swap-modules/stealthex.api.d.ts cannot be
   * regenerated. Left as fixme so it reports as soon as the proxy serves the spec again.
   */
  test.fixme("OpenAPI spec is accessible for client codegen", async ({ request }) => {
    const response = await request.get(`${STEALTHEX_API_URL}/openapi.json`, {
      failOnStatusCode: false,
    })
    await attachRaw("openapi-response", response)

    expect(response.ok()).toBeTruthy()
    const spec = await response.json()
    expect(spec).toHaveProperty("paths")
    expect(spec.paths).toHaveProperty("/v4/currencies")
    expect(spec.paths).toHaveProperty("/v4/rates/range")
    expect(spec.paths).toHaveProperty("/v4/rates/estimated-amount")
  })

  // Out of scope on purpose: POST /v4/exchanges creates a real exchange record at the provider.
})
