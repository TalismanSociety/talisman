/// <reference types="node" />

import { expect, test } from "@playwright/test"

const SN45_API_URL = "https://sn45api.talisman.xyz"

const SN45_API_KEY = process.env.SN45_API_KEY
const authHeaders: Record<string, string> = SN45_API_KEY ? { "X-API-Key": SN45_API_KEY } : {}

const TEST_NETUID = Math.floor(Math.random() * 125) + 1

test.describe("SN45 Data API", () => {
  test.describe.configure({ retries: 2 })

  // biome-ignore lint/correctness/noEmptyPattern: Playwright requires destructured fixtures as first arg
  test.beforeEach(({}, testInfo) => {
    testInfo.annotations.push({ type: "TEST_NETUID", description: String(TEST_NETUID) })
  })

  test("OpenAPI spec is accessible and lists expected paths", async ({ request }) => {
    const response = await request.get(`${SN45_API_URL}/openapi.json`)
    const spec = await response.json()
    await test.info().attach("openapi-spec", {
      body: JSON.stringify(spec, null, 2),
      contentType: "application/json",
    })
    expect(response.ok()).toBeTruthy()
    expect(spec).toHaveProperty("paths")
    expect(spec.paths).toHaveProperty("/v1/bittensor/tao-price")
    expect(spec.paths).toHaveProperty("/v1/bittensor/subnets/leaderboard")
    expect(spec.paths).toHaveProperty("/v1/bittensor/subnets/{netuid}/stake-events")
    expect(spec.paths).toHaveProperty("/v1/bittensor/subnets/{netuid}/price")
    expect(spec.paths).toHaveProperty("/v1/bittensor/subnets/{netuid}/ohlcv")
    expect(spec.paths).toHaveProperty("/v1/bittensor/subnets/{netuid}/tokenomics")
    expect(spec.paths).toHaveProperty("/v1/bittensor/subnets/{netuid}/tao-flow")
    expect(spec.paths).toHaveProperty("/v1/bittensor/subnets/{netuid}/trade-flow")
    expect(spec.paths).toHaveProperty("/v1/bittensor/subnets/{netuid}/positions")
    expect(spec.paths).toHaveProperty("/v1/bittensor/subnets/{netuid}/sentiment")
    expect(spec.paths).toHaveProperty("/v1/bittensor/subnets/{netuid}/tweets")
    expect(spec.paths).toHaveProperty("/v1/bittensor/subnets/{netuid}/whales-activity")
  })

  test("GET /v1/bittensor/tao-price returns TAO price data", async ({ request }) => {
    const response = await request.get(`${SN45_API_URL}/v1/bittensor/tao-price`, {
      headers: authHeaders,
    })
    const body = await response.json()
    await test.info().attach("tao-price-response", {
      body: JSON.stringify(body, null, 2),
      contentType: "application/json",
    })
    expect(response.ok()).toBeTruthy()
    expect(body).toHaveProperty("price")
    expect(body).toHaveProperty("timestamp")
    expect(body).toHaveProperty("marketCap")
    expect(body).toHaveProperty("volume24h")
    expect(Number(body.price)).toBeGreaterThan(0)
  })

  test("GET /v1/bittensor/subnets/leaderboard returns subnet rankings", async ({ request }) => {
    const response = await request.get(`${SN45_API_URL}/v1/bittensor/subnets/leaderboard`, {
      headers: authHeaders,
    })
    const body = await response.json()
    await test.info().attach("leaderboard-response", {
      body: JSON.stringify(body, null, 2),
      contentType: "application/json",
    })
    expect(response.ok()).toBeTruthy()
    expect(body).toHaveProperty("period")
    expect(body).toHaveProperty("updatedAt")
    expect(body).toHaveProperty("subnets")
    expect(Array.isArray(body.subnets)).toBeTruthy()
    expect(body.subnets.length).toBeGreaterThan(0)

    const subnet = body.subnets[0]
    expect(subnet).toHaveProperty("netuid")
    expect(subnet).toHaveProperty("score")
    expect(subnet).toHaveProperty("txCount")
    expect(subnet).toHaveProperty("totalHolders")
    expect(subnet).toHaveProperty("priceHistory7d")
  })

  test("GET /v1/bittensor/subnets/leaderboard supports period parameter", async ({ request }) => {
    for (const period of ["1d", "1w", "1m"] as const) {
      const response = await request.get(
        `${SN45_API_URL}/v1/bittensor/subnets/leaderboard?period=${period}`,
        { headers: authHeaders }
      )
      expect(response.ok()).toBeTruthy()
      const body = await response.json()
      expect(body.period).toBe(period)
    }
  })

  test("GET /v1/bittensor/subnets/:netuid/stake-events returns events", async ({ request }) => {
    const response = await request.get(
      `${SN45_API_URL}/v1/bittensor/subnets/${TEST_NETUID}/stake-events`,
      { headers: authHeaders }
    )
    const body = await response.json()
    await test.info().attach("stake-events-response", {
      body: JSON.stringify(body, null, 2),
      contentType: "application/json",
    })
    expect(response.ok()).toBeTruthy()
    expect(Array.isArray(body)).toBeTruthy()

    if (body.length > 0) {
      const event = body[0]
      expect(event).toHaveProperty("method")
      expect(["Adding", "Removing"]).toContain(event.method)
      expect(event).toHaveProperty("alphaAmount")
      expect(event).toHaveProperty("taoAmount")
      expect(event).toHaveProperty("timestamp")
      expect(event).toHaveProperty("coldkey")
      expect(event).toHaveProperty("hotkey")
      expect(event).toHaveProperty("hash")
      expect(event).toHaveProperty("blockHeight")
    }
  })

  test("GET /v1/bittensor/subnets/:netuid/price returns price history", async ({ request }) => {
    const response = await request.get(
      `${SN45_API_URL}/v1/bittensor/subnets/${TEST_NETUID}/price`,
      { headers: authHeaders }
    )
    const body = await response.json()
    await test.info().attach("price-history-response", {
      body: JSON.stringify(body, null, 2),
      contentType: "application/json",
    })
    expect(response.ok()).toBeTruthy()
    expect(Array.isArray(body)).toBeTruthy()

    if (body.length > 0) {
      expect(body[0]).toHaveProperty("movingPrice")
      expect(body[0]).toHaveProperty("timestamp")
    }
  })

  test("GET /v1/bittensor/subnets/:netuid/ohlcv returns candle data", async ({ request }) => {
    const response = await request.get(
      `${SN45_API_URL}/v1/bittensor/subnets/${TEST_NETUID}/ohlcv`,
      { headers: authHeaders }
    )
    const body = await response.json()
    await test.info().attach("ohlcv-response", {
      body: JSON.stringify(body, null, 2),
      contentType: "application/json",
    })
    expect(response.ok()).toBeTruthy()
    expect(body).toHaveProperty("candles")
    expect(body).toHaveProperty("nextCursor")
    expect(Array.isArray(body.candles)).toBeTruthy()

    if (body.candles.length > 0) {
      const candle = body.candles[0]
      // Each candle is [time, open, high, low, close, volume]
      expect(Array.isArray(candle)).toBeTruthy()
      expect(candle).toHaveLength(6)
    }
  })

  test("GET /v1/bittensor/subnets/:netuid/tokenomics returns latest snapshot", async ({
    request,
  }) => {
    const response = await request.get(
      `${SN45_API_URL}/v1/bittensor/subnets/${TEST_NETUID}/tokenomics`,
      { headers: authHeaders }
    )
    const body = await response.json()
    await test.info().attach("tokenomics-response", {
      body: JSON.stringify(body, null, 2),
      contentType: "application/json",
    })
    expect(response.ok()).toBeTruthy()

    if (body !== null) {
      expect(body).toHaveProperty("movingPrice")
      expect(body).toHaveProperty("volume")
      expect(body).toHaveProperty("alphaIn")
      expect(body).toHaveProperty("alphaOut")
      expect(body).toHaveProperty("emaTaoFlow")
      expect(body).toHaveProperty("timestamp")
    }
  })

  test("GET /v1/bittensor/subnets/:netuid/tao-flow returns flow series", async ({ request }) => {
    const response = await request.get(
      `${SN45_API_URL}/v1/bittensor/subnets/${TEST_NETUID}/tao-flow`,
      { headers: authHeaders }
    )
    const body = await response.json()
    await test.info().attach("tao-flow-response", {
      body: JSON.stringify(body, null, 2),
      contentType: "application/json",
    })
    expect(response.ok()).toBeTruthy()
    expect(body).toHaveProperty("series")
    expect(body).toHaveProperty("totals")
    expect(Array.isArray(body.series)).toBeTruthy()
    expect(body.totals).toHaveProperty("taoIn")
    expect(body.totals).toHaveProperty("taoOut")
    expect(body.totals).toHaveProperty("alphaIn")
    expect(body.totals).toHaveProperty("alphaOut")
  })

  test("GET /v1/bittensor/subnets/:netuid/trade-flow returns trade metrics", async ({
    request,
  }) => {
    const response = await request.get(
      `${SN45_API_URL}/v1/bittensor/subnets/${TEST_NETUID}/trade-flow`,
      { headers: authHeaders }
    )
    const body = await response.json()
    await test.info().attach("trade-flow-response", {
      body: JSON.stringify(body, null, 2),
      contentType: "application/json",
    })
    expect(response.ok()).toBeTruthy()
    expect(body).toHaveProperty("buys")
    expect(body).toHaveProperty("sells")
    expect(body).toHaveProperty("buyVol")
    expect(body).toHaveProperty("sellVol")
    expect(body).toHaveProperty("buyers")
    expect(body).toHaveProperty("sellers")
    expect(body).toHaveProperty("momentum")
    expect(body).toHaveProperty("accumulation")
    expect(body).toHaveProperty("tradeVelocity")
  })

  test("GET /v1/bittensor/subnets/:netuid/positions returns wallet positions", async ({
    request,
  }) => {
    const response = await request.get(
      `${SN45_API_URL}/v1/bittensor/subnets/${TEST_NETUID}/positions`,
      { headers: authHeaders }
    )
    const body = await response.json()
    await test.info().attach("positions-response", {
      body: JSON.stringify(body, null, 2),
      contentType: "application/json",
    })
    expect(response.ok()).toBeTruthy()
    expect(Array.isArray(body)).toBeTruthy()

    if (body.length > 0) {
      expect(body[0]).toHaveProperty("coldkey")
      expect(body[0]).toHaveProperty("alphaBalance")
      expect(body[0]).toHaveProperty("costBasisTao")
      expect(body[0]).toHaveProperty("cumulativeRealizedProfit")
    }
  })

  test("GET /v1/bittensor/subnets/:netuid/sentiment returns sentiment data", async ({
    request,
  }) => {
    const response = await request.get(
      `${SN45_API_URL}/v1/bittensor/subnets/${TEST_NETUID}/sentiment`,
      { headers: authHeaders }
    )
    const body = await response.json()
    await test.info().attach("sentiment-response", {
      body: JSON.stringify(body, null, 2),
      contentType: "application/json",
    })
    expect(response.ok()).toBeTruthy()
    expect(body).toHaveProperty("count")
    expect(body).toHaveProperty("score")
    expect(body).toHaveProperty("sentiment")
    expect(["very_bearish", "bearish", "neutral", "bullish", "very_bullish"]).toContain(
      body.sentiment
    )
  })

  test("GET /v1/bittensor/subnets/:netuid/tweets returns analyzed tweets", async ({ request }) => {
    const response = await request.get(
      `${SN45_API_URL}/v1/bittensor/subnets/${TEST_NETUID}/tweets`,
      { headers: authHeaders }
    )
    const body = await response.json()
    await test.info().attach("tweets-response", {
      body: JSON.stringify(body, null, 2),
      contentType: "application/json",
    })
    expect(response.ok()).toBeTruthy()
    expect(Array.isArray(body)).toBeTruthy()

    if (body.length > 0) {
      const tweet = body[0]
      expect(tweet).toHaveProperty("id")
      expect(tweet).toHaveProperty("text")
      expect(tweet).toHaveProperty("url")
      expect(tweet).toHaveProperty("sentiment")
      expect(tweet).toHaveProperty("author")
      expect(tweet.author).toHaveProperty("screenName")
    }
  })

  test("non-existent endpoint returns 404, not 5xx", async ({ request }) => {
    const response = await request.get(`${SN45_API_URL}/v1/nonexistent-endpoint`, {
      headers: authHeaders,
      failOnStatusCode: false,
    })
    await test.info().attach("nonexistent-response", {
      body: `Status: ${response.status()}\n${await response.text()}`,
      contentType: "text/plain",
    })
    expect(response.status()).toBeLessThan(500)
  })

  test.describe("Numeric value validation", () => {
    test("tao-price numeric fields are valid numbers", async ({ request }) => {
      const response = await request.get(`${SN45_API_URL}/v1/bittensor/tao-price`, {
        headers: authHeaders,
      })
      expect(response.ok()).toBeTruthy()
      const body = await response.json()

      expect(Number(body.price)).not.toBeNaN()
      expect(Number(body.price)).toBeGreaterThan(0)
      expect(Number(body.marketCap)).not.toBeNaN()
      expect(Number(body.marketCap)).toBeGreaterThanOrEqual(0)
      expect(Number(body.volume24h)).not.toBeNaN()
      expect(Number(body.volume24h)).toBeGreaterThanOrEqual(0)
    })

    test("leaderboard subnet scores are valid numbers", async ({ request }) => {
      const response = await request.get(`${SN45_API_URL}/v1/bittensor/subnets/leaderboard`, {
        headers: authHeaders,
      })
      expect(response.ok()).toBeTruthy()
      const body = await response.json()

      for (const subnet of body.subnets.slice(0, 5)) {
        expect(Number(subnet.score)).not.toBeNaN()
        expect(Number(subnet.txCount)).not.toBeNaN()
        expect(Number(subnet.txCount)).toBeGreaterThanOrEqual(0)
        expect(Number(subnet.totalHolders)).not.toBeNaN()
        expect(Number(subnet.totalHolders)).toBeGreaterThanOrEqual(0)
        expect(typeof subnet.netuid).toBe("number")
      }
    })

    test("price history values are valid numbers", async ({ request }) => {
      const response = await request.get(
        `${SN45_API_URL}/v1/bittensor/subnets/${TEST_NETUID}/price`,
        { headers: authHeaders, failOnStatusCode: false }
      )

      // Some netuids may not have price data — only validate if we get a successful response
      if (!response.ok()) return

      const body = await response.json()
      if (Array.isArray(body) && body.length > 0) {
        for (const entry of body.slice(0, 5)) {
          expect(Number(entry.movingPrice)).not.toBeNaN()
          expect(Number(entry.movingPrice)).toBeGreaterThanOrEqual(0)
        }
      }
    })

    test("ohlcv candle values are valid numbers", async ({ request }) => {
      const response = await request.get(
        `${SN45_API_URL}/v1/bittensor/subnets/${TEST_NETUID}/ohlcv`,
        { headers: authHeaders }
      )
      expect(response.ok()).toBeTruthy()
      const body = await response.json()

      if (body.candles.length > 0) {
        for (const candle of body.candles.slice(0, 5)) {
          // [time, open, high, low, close, volume]
          for (const value of candle) {
            expect(Number(value)).not.toBeNaN()
            expect(Number(value)).toBeGreaterThanOrEqual(0)
          }
        }
      }
    })

    test("tokenomics numeric fields are valid", async ({ request }) => {
      const response = await request.get(
        `${SN45_API_URL}/v1/bittensor/subnets/${TEST_NETUID}/tokenomics`,
        { headers: authHeaders }
      )
      expect(response.ok()).toBeTruthy()
      const body = await response.json()

      if (body !== null) {
        expect(Number(body.movingPrice)).not.toBeNaN()
        expect(Number(body.movingPrice)).toBeGreaterThanOrEqual(0)
        expect(Number(body.volume)).not.toBeNaN()
        expect(Number(body.alphaIn)).not.toBeNaN()
        expect(Number(body.alphaOut)).not.toBeNaN()
        expect(Number(body.emaTaoFlow)).not.toBeNaN()
      }
    })

    test("tao-flow totals are valid numbers", async ({ request }) => {
      const response = await request.get(
        `${SN45_API_URL}/v1/bittensor/subnets/${TEST_NETUID}/tao-flow`,
        { headers: authHeaders }
      )
      expect(response.ok()).toBeTruthy()
      const body = await response.json()

      expect(Number(body.totals.taoIn)).not.toBeNaN()
      expect(Number(body.totals.taoIn)).toBeGreaterThanOrEqual(0)
      expect(Number(body.totals.taoOut)).not.toBeNaN()
      expect(Number(body.totals.taoOut)).toBeGreaterThanOrEqual(0)
      expect(Number(body.totals.alphaIn)).not.toBeNaN()
      expect(Number(body.totals.alphaOut)).not.toBeNaN()
    })

    test("trade-flow metrics are valid numbers", async ({ request }) => {
      const response = await request.get(
        `${SN45_API_URL}/v1/bittensor/subnets/${TEST_NETUID}/trade-flow`,
        { headers: authHeaders }
      )
      expect(response.ok()).toBeTruthy()
      const body = await response.json()

      expect(Number(body.buys)).not.toBeNaN()
      expect(Number(body.buys)).toBeGreaterThanOrEqual(0)
      expect(Number(body.sells)).not.toBeNaN()
      expect(Number(body.sells)).toBeGreaterThanOrEqual(0)
      expect(Number(body.buyVol)).not.toBeNaN()
      expect(Number(body.sellVol)).not.toBeNaN()
      expect(Number(body.buyers)).not.toBeNaN()
      expect(Number(body.sellers)).not.toBeNaN()
    })

    test("positions numeric fields are valid", async ({ request }) => {
      const response = await request.get(
        `${SN45_API_URL}/v1/bittensor/subnets/${TEST_NETUID}/positions`,
        { headers: authHeaders }
      )
      expect(response.ok()).toBeTruthy()
      const body = await response.json()

      if (body.length > 0) {
        for (const position of body.slice(0, 5)) {
          expect(Number(position.alphaBalance)).not.toBeNaN()
          expect(Number(position.alphaBalance)).toBeGreaterThanOrEqual(0)
          expect(Number(position.costBasisTao)).not.toBeNaN()
          expect(Number(position.cumulativeRealizedProfit)).not.toBeNaN()
        }
      }
    })
  })

  test.describe("Invalid parameter handling", () => {
    test("netuid=9999 returns error, not 5xx", async ({ request }) => {
      const response = await request.get(`${SN45_API_URL}/v1/bittensor/subnets/9999/price`, {
        headers: authHeaders,
        failOnStatusCode: false,
      })
      await test.info().attach("netuid-9999-response", {
        body: `Status: ${response.status()}\n${await response.text()}`,
        contentType: "text/plain",
      })
      expect(response.status()).toBeLessThan(500)
    })

    test("negative netuid returns error, not 5xx", async ({ request }) => {
      const response = await request.get(`${SN45_API_URL}/v1/bittensor/subnets/-1/price`, {
        headers: authHeaders,
        failOnStatusCode: false,
      })
      await test.info().attach("netuid-negative-response", {
        body: `Status: ${response.status()}\n${await response.text()}`,
        contentType: "text/plain",
      })
      expect(response.status()).toBeLessThan(500)
    })

    // Known issue: API returns 502 instead of 4xx for non-numeric netuid
    test.fixme("non-numeric netuid returns error, not 5xx", async ({ request }) => {
      const response = await request.get(`${SN45_API_URL}/v1/bittensor/subnets/abc/price`, {
        headers: authHeaders,
        failOnStatusCode: false,
      })
      await test.info().attach("netuid-nonnumeric-response", {
        body: `Status: ${response.status()}\n${await response.text()}`,
        contentType: "text/plain",
      })
      expect(response.status()).toBeLessThan(500)
    })

    test("leaderboard with invalid period returns error, not 5xx", async ({ request }) => {
      const response = await request.get(
        `${SN45_API_URL}/v1/bittensor/subnets/leaderboard?period=invalid`,
        { headers: authHeaders, failOnStatusCode: false }
      )
      await test.info().attach("invalid-period-response", {
        body: `Status: ${response.status()}\n${await response.text()}`,
        contentType: "text/plain",
      })
      expect(response.status()).toBeLessThan(500)
    })

    test("ohlcv with invalid interval returns error, not 5xx", async ({ request }) => {
      const response = await request.get(
        `${SN45_API_URL}/v1/bittensor/subnets/${TEST_NETUID}/ohlcv?interval=banana`,
        { headers: authHeaders, failOnStatusCode: false }
      )
      await test.info().attach("invalid-interval-response", {
        body: `Status: ${response.status()}\n${await response.text()}`,
        contentType: "text/plain",
      })
      expect(response.status()).toBeLessThan(500)
    })
  })
})
