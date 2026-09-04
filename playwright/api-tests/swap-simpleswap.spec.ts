/// <reference types="node" />

import { expect, test } from "@playwright/test"

import {
  attachJson,
  attachRaw,
  expectNoServerError,
  expectPositiveNumber,
  skipIfUnavailable,
} from "./helpers"

/**
 * SimpleSwap is the only swap provider Talisman calls directly, without a talisman.xyz proxy
 * (see simpleswap-swap-module.ts), so it is also the only one that needs a credential here.
 * The extension reads the key from the remote config at runtime; the test uses a CI secret so a
 * failure points at the API rather than at a remote-config change.
 */
const SIMPLESWAP_API_URL = "https://api.simpleswap.io"
const SIMPLESWAP_API_KEY = process.env.SIMPLESWAP_API_KEY

/**
 * ETH -> USDC on Ethereum. Both sides are assets the wallet actually holds (they are in
 * `swaps.curatedTokens` in the remote config), so the fixture exercises a route a user can really
 * take — unlike BTC, which the wallet does not support at all.
 */
const FROM = "eth"
const TO = "usdc"

const withKey = (path: string, params: Record<string, string> = {}) =>
  `${SIMPLESWAP_API_URL}/${path}?${new URLSearchParams({
    api_key: SIMPLESWAP_API_KEY ?? "",
    ...params,
  })}`

// The credential travels in the query string and traces record full request URLs, while
// api-health.yml zips playwright-report/ and posts it to Discord on failure. `trace` can only be
// overridden per file (not per describe), so the opt-out lives here.
test.use({ trace: "off" })

test.describe("SimpleSwap API", () => {
  test.describe.configure({ retries: 2 })

  // fork PRs and local runs without the secret skip rather than fail
  test.skip(
    !SIMPLESWAP_API_KEY,
    "SIMPLESWAP_API_KEY is not set — add it to apps/extension/.env or the repo secrets"
  )

  test("GET /get_all_currencies returns the swappable currency list", async ({ request }) => {
    const response = await request.get(withKey("get_all_currencies"), { failOnStatusCode: false })
    skipIfUnavailable(response, "GET /get_all_currencies")

    expect(response.ok()).toBeTruthy()
    const body = await response.json()

    expect(Array.isArray(body)).toBeTruthy()
    expect(body.length, "the currency list must not be empty").toBeGreaterThan(0)
    await attachJson("all-currencies-sample", body.slice(0, 3))

    for (const currency of body.slice(0, 20)) {
      expect(typeof currency.symbol).toBe("string")
      expect(typeof currency.network).toBe("string")
      expect(typeof currency.name).toBe("string")
    }

    const from = body.find((c: { symbol: string }) => c.symbol === FROM)
    expect(from, `${FROM} must be swappable`).toBeDefined()
    // getSwappableAssets keys assets on symbol + network, so both must be present
    expect(from.network).toBeTruthy()
  })

  test("GET /get_pairs returns the symbols routable from the source asset", async ({ request }) => {
    const response = await request.get(withKey("get_pairs", { fixed: "false", symbol: FROM }), {
      failOnStatusCode: false,
    })
    skipIfUnavailable(response, "GET /get_pairs")

    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    await attachJson("pairs-sample", Array.isArray(body) ? body.slice(0, 10) : body)

    // the module treats this as a flat list of destination symbols
    expect(Array.isArray(body)).toBeTruthy()
    expect(body.length, `${FROM} must route to at least one currency`).toBeGreaterThan(0)
    for (const symbol of body.slice(0, 20)) expect(typeof symbol).toBe("string")
    expect(body, `${FROM} -> ${TO} must be routable`).toContain(TO)
  })

  test("GET /get_ranges returns a usable minimum", async ({ request }) => {
    const response = await request.get(
      withKey("get_ranges", { fixed: "false", currency_from: FROM, currency_to: TO }),
      { failOnStatusCode: false }
    )
    skipIfUnavailable(response, "GET /get_ranges")

    const body = await response.json()
    await attachJson("ranges-response", body)

    expect(response.ok()).toBeTruthy()
    // the swap form blocks amounts below `min`, so a missing/zero min would let invalid swaps through
    expectPositiveNumber(body.min, `${FROM} -> ${TO} min`)

    if (body.max !== null && body.max !== undefined) {
      expectPositiveNumber(body.max, `${FROM} -> ${TO} max`)
      expect(Number(body.max)).toBeGreaterThanOrEqual(Number(body.min))
    }
  })

  /**
   * This endpoint answers with a bare JSON string (e.g. `"3.18927951"`), not an object. The module
   * consumes it as such, so a change to an object shape would break quotes with no network error.
   */
  test("GET /get_estimated returns a bare numeric string", async ({ request }) => {
    const response = await request.get(
      withKey("get_estimated", {
        fixed: "false",
        currency_from: FROM,
        currency_to: TO,
        amount: "0.1",
      }),
      { failOnStatusCode: false }
    )
    skipIfUnavailable(response, "GET /get_estimated")

    const body = await response.json()
    await attachJson("estimated-response", body)

    expect(response.ok()).toBeTruthy()
    expect(typeof body, "the estimate must be a bare JSON string, not an object").toBe("string")
    expectPositiveNumber(body, `${FROM} -> ${TO} estimated amount`)
  })

  test.describe("Auth and invalid parameter handling", () => {
    /**
     * A regression to 200 here would mean the endpoint stopped requiring a key — i.e. Talisman's
     * quota is open to anyone who finds the URL.
     */
    test("an invalid api_key is rejected with 401", async ({ request }) => {
      const response = await request.get(
        `${SIMPLESWAP_API_URL}/get_all_currencies?api_key=not-a-real-key`,
        { failOnStatusCode: false }
      )
      await attachRaw("invalid-key-response", response)
      expect(response.status(), "auth must still be enforced").toBe(401)
    })

    test("a missing api_key is rejected", async ({ request }) => {
      const response = await request.get(`${SIMPLESWAP_API_URL}/get_all_currencies`, {
        failOnStatusCode: false,
      })
      await attachRaw("missing-key-response", response)
      expectNoServerError(response)
      expect(response.status()).toBeGreaterThanOrEqual(400)
    })

    /**
     * fetchSimpleswapStatus (core/domains/transactions/watchSwapStatus.ts) throws on a non-ok
     * response, so an unknown exchange id must stay a clean 404.
     */
    test("GET /get_exchange with an unknown id returns 404, not 5xx", async ({ request }) => {
      const response = await request.get(
        withKey("get_exchange", { id: "definitely-not-an-exchange-id" }),
        { failOnStatusCode: false }
      )
      await attachRaw("unknown-exchange-response", response)

      expectNoServerError(response)
      expect(response.status()).toBe(404)
    })

    /**
     * Known upstream issue: SimpleSwap answers an unsupported pair with 500, not 4xx. It matters
     * here because getEstimate in simpleswap-swap-module.ts returns `res.json()` without checking
     * `res.ok`, so the error body flows straight into the quote path. Left as fixme to report if
     * SimpleSwap starts returning a proper client error.
     */
    test.fixme("an unsupported pair on get_estimated does not 5xx", async ({ request }) => {
      const response = await request.get(
        withKey("get_estimated", {
          fixed: "false",
          currency_from: "notacoin",
          currency_to: "alsonotacoin",
          amount: "1",
        }),
        { failOnStatusCode: false }
      )
      await attachRaw("unsupported-pair-response", response)
      expectNoServerError(response)
    })

    /**
     * The property the module actually depends on while the 500 above stands: a failed estimate
     * must not be shaped like a successful one. getEstimate returns the parsed body either way, so
     * if an error ever came back as a bare numeric string it would be quoted as a real rate.
     */
    test("a failed estimate is distinguishable from a successful one", async ({ request }) => {
      const response = await request.get(
        withKey("get_estimated", {
          fixed: "false",
          currency_from: "notacoin",
          currency_to: "alsonotacoin",
          amount: "1",
        }),
        { failOnStatusCode: false }
      )
      await attachRaw("unsupported-pair-response", response)

      expect(response.ok(), "an unsupported pair must not report success").toBeFalsy()

      const body = await response.json()
      expect(
        typeof body,
        "an error body must not be a bare numeric string, which is the success shape"
      ).not.toBe("string")
    })

    test("non-existent endpoint returns 404, not 5xx", async ({ request }) => {
      const response = await request.get(withKey("nonexistent_endpoint"), {
        failOnStatusCode: false,
      })
      await attachRaw("nonexistent-response", response)
      expectNoServerError(response)
    })
  })

  // Out of scope on purpose: POST /create_exchange creates a real exchange record at the provider.
})
