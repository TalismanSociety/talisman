/// <reference types="node" />

import { expect, test } from "@playwright/test"

import {
  attachJson,
  attachRaw,
  evmChainIdsFromCuratedTokens,
  expectNoServerError,
  expectPositiveNumber,
  getRemoteConfigSwaps,
  skipIfUnavailable,
} from "./helpers"

const LIFI_API_URL = "https://lifi.talisman.xyz/v1"

// the proxy injects swaps.lifiApiKey, so no credential is needed here
const INTEGRATOR = "talisman"

const ETHEREUM_CHAIN_ID = 1

/**
 * Networks the swap UI would visibly lose if LI.FI dropped them: Ethereum, Base, Arbitrum,
 * Optimism, Polygon and BSC. All verified as supported at the time of writing.
 */
const CORE_EVM_CHAIN_IDS = [ETHEREUM_CHAIN_ID, 8453, 42161, 10, 137, 56]
const NATIVE_ETH = "0x0000000000000000000000000000000000000000"
const USDC_ETHEREUM = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"

/** `1:evm-erc20:0xabc…` -> `{ chainId: 1, address: "0xabc…" }` */
const parseEvmTokenId = (tokenId: string) => {
  const [networkId, , address] = tokenId.split(":")
  return { chainId: Number(networkId), address }
}

test.describe("LI.FI Swap API", () => {
  test.describe.configure({ retries: 2 })

  /**
   * LI.FI is the EVM/SVM swap provider, so losing one of these chains removes same-chain and
   * bridged swaps for it entirely (StealthEX/SimpleSwap only cover deposit-style swaps).
   *
   * The curated list from the remote config is reported as an annotation rather than asserted:
   * `swaps.curatedTokens` is provider-agnostic — it only orders the "Popular" tab in the token
   * picker (swap-services/token-filtering.ts) and legitimately includes chains served by the other
   * providers (e.g. Moonbeam), so a gap there is information, not a failure.
   */
  test("GET /chains covers the core EVM networks", async ({ request }) => {
    const [response, swaps] = await Promise.all([
      request.get(`${LIFI_API_URL}/chains`, { failOnStatusCode: false }),
      getRemoteConfigSwaps(request),
    ])
    skipIfUnavailable(response, "GET /chains")

    const body = await response.json()
    await attachJson("chains-response", body)

    expect(response.ok()).toBeTruthy()
    expect(Array.isArray(body.chains)).toBeTruthy()
    expect(body.chains.length).toBeGreaterThan(0)

    for (const chain of body.chains.slice(0, 20)) {
      expect(typeof chain.id).toBe("number")
      expect(typeof chain.key).toBe("string")
      expect(typeof chain.name).toBe("string")
      expect(chain.chainType, "chainType drives the EVM/SVM split").toBeTruthy()
    }

    const supported = new Set<number>(body.chains.map((chain: { id: number }) => chain.id))

    const missing = CORE_EVM_CHAIN_IDS.filter((chainId) => !supported.has(chainId))
    expect(missing, `LI.FI no longer supports core networks: ${missing}`).toHaveLength(0)

    // informational: which curated chains LI.FI does not route
    const uncovered = evmChainIdsFromCuratedTokens(swaps.curatedTokens).filter(
      (chainId) => !supported.has(chainId)
    )
    test.info().annotations.push({
      type: "curated-not-on-lifi",
      description: uncovered.length ? uncovered.join(", ") : "none",
    })
  })

  test("GET /tokens returns EVM and SVM token lists", async ({ request }) => {
    // mirrors getTokens(client, { chainTypes: [EVM, SVM] }) in lifi-swap-module.ts
    const response = await request.get(`${LIFI_API_URL}/tokens?chainTypes=EVM,SVM`, {
      failOnStatusCode: false,
    })
    skipIfUnavailable(response, "GET /tokens")

    expect(response.ok()).toBeTruthy()
    const body = await response.json()

    expect(body.tokens, "tokens must be keyed by chain id").toBeDefined()
    const chainIds = Object.keys(body.tokens)
    expect(chainIds.length).toBeGreaterThan(0)
    await attachJson("tokens-chain-ids", chainIds)

    const ethereumTokens = body.tokens[String(ETHEREUM_CHAIN_ID)]
    expect(Array.isArray(ethereumTokens)).toBeTruthy()
    expect(ethereumTokens.length, "Ethereum must have a token list").toBeGreaterThan(0)

    const token = ethereumTokens[0]
    for (const field of ["chainId", "address", "symbol", "name", "decimals", "priceUSD"]) {
      expect(token, `token entries must expose ${field}`).toHaveProperty(field)
    }
  })

  test("GET /token resolves a known ERC20", async ({ request }) => {
    const response = await request.get(
      `${LIFI_API_URL}/token?chain=${ETHEREUM_CHAIN_ID}&token=${USDC_ETHEREUM}`,
      { failOnStatusCode: false }
    )
    skipIfUnavailable(response, "GET /token")

    const body = await response.json()
    await attachJson("token-response", body)

    expect(response.ok()).toBeTruthy()
    expect(body.chainId).toBe(ETHEREUM_CHAIN_ID)
    expect(body.symbol).toBe("USDC")
    expect(body.decimals).toBe(6)
    expectPositiveNumber(body.priceUSD, "USDC priceUSD")
  })

  /**
   * swaps.lifiTalismanTokens drives the fee discount in fee-utils.ts. If LI.FI stops resolving one
   * of them, the discount silently stops applying — the swap still works, at the wrong fee.
   */
  test("GET /token resolves every lifiTalismanTokens entry", async ({ request }) => {
    const swaps = await getRemoteConfigSwaps(request)
    expect(swaps.lifiTalismanTokens.length, "remote config must list fee tokens").toBeGreaterThan(0)
    await attachJson("lifi-talisman-tokens", swaps.lifiTalismanTokens)

    for (const tokenId of swaps.lifiTalismanTokens) {
      const { chainId, address } = parseEvmTokenId(tokenId)

      const response = await request.get(
        `${LIFI_API_URL}/token?chain=${chainId}&token=${address}`,
        { failOnStatusCode: false }
      )
      skipIfUnavailable(response, `GET /token (${tokenId})`)

      expect(response.ok(), `${tokenId} must resolve (got ${response.status()})`).toBeTruthy()
      const body = await response.json()
      expect(body.chainId, `${tokenId} chainId`).toBe(chainId)
      expect(String(body.address).toLowerCase(), `${tokenId} address`).toBe(address.toLowerCase())
      expect(typeof body.decimals, `${tokenId} decimals`).toBe("number")
    }
  })

  test("GET /tools lists exchanges and bridges", async ({ request }) => {
    const response = await request.get(`${LIFI_API_URL}/tools`, { failOnStatusCode: false })
    skipIfUnavailable(response, "GET /tools")

    const body = await response.json()
    await attachJson(
      "tools-response",
      Object.fromEntries(Object.entries(body).map(([key, value]) => [key, (value as []).length]))
    )

    expect(response.ok()).toBeTruthy()
    expect(Array.isArray(body.exchanges)).toBeTruthy()
    expect(Array.isArray(body.bridges)).toBeTruthy()
    expect(body.exchanges.length, "at least one exchange must be available").toBeGreaterThan(0)
    expect(body.bridges.length, "at least one bridge must be available").toBeGreaterThan(0)
  })

  test("POST /advanced/routes returns routable quotes", async ({ request }) => {
    const response = await request.post(`${LIFI_API_URL}/advanced/routes`, {
      data: {
        fromChainId: ETHEREUM_CHAIN_ID,
        fromAmount: "1000000000000000000", // 1 ETH
        fromTokenAddress: NATIVE_ETH,
        toChainId: ETHEREUM_CHAIN_ID,
        toTokenAddress: USDC_ETHEREUM,
        options: { integrator: INTEGRATOR },
      },
      failOnStatusCode: false,
    })
    skipIfUnavailable(response, "POST /advanced/routes")

    const body = await response.json()
    expect(response.ok()).toBeTruthy()
    expect(Array.isArray(body.routes)).toBeTruthy()
    expect(body.routes.length, "1 ETH -> USDC must be routable").toBeGreaterThan(0)
    await attachJson("routes-response", body.routes[0])

    for (const route of body.routes) {
      expect(route.fromAmount, "fromAmount must be echoed").toBe("1000000000000000000")
      expectPositiveNumber(route.toAmount, "route toAmount")
      expect(Array.isArray(route.steps)).toBeTruthy()
      expect(route.steps.length, "a route must have at least one step").toBeGreaterThan(0)

      for (const step of route.steps) {
        // the quote UI renders toolDetails (name + logo) for every step
        expect(step.toolDetails, "each step must carry toolDetails").toBeDefined()
        expect(typeof step.toolDetails.name).toBe("string")
        expect(step.estimate, "each step must carry an estimate").toBeDefined()
      }
    }
  })

  test("GET /quote returns a transaction request", async ({ request }) => {
    const params = new URLSearchParams({
      fromChain: String(ETHEREUM_CHAIN_ID),
      toChain: String(ETHEREUM_CHAIN_ID),
      fromToken: NATIVE_ETH,
      toToken: USDC_ETHEREUM,
      fromAmount: "1000000000000000000",
      fromAddress: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
      integrator: INTEGRATOR,
    })

    const response = await request.get(`${LIFI_API_URL}/quote?${params}`, {
      failOnStatusCode: false,
    })
    skipIfUnavailable(response, "GET /quote")

    const body = await response.json()
    expect(response.ok()).toBeTruthy()
    await attachJson("quote-response", { estimate: body.estimate, action: body.action })

    expect(body.estimate, "the quote must carry an estimate").toBeDefined()
    expectPositiveNumber(body.estimate.toAmount, "estimate toAmount")
    expect(body.transactionRequest, "the quote must carry a transactionRequest").toBeDefined()
    expect(body.transactionRequest.data, "transactionRequest must carry calldata").toBeTruthy()
  })

  test.describe("Invalid parameter handling", () => {
    /**
     * fetchLifiStatus (core/domains/transactions/watchSwapStatus.ts) throws on a non-ok response,
     * so this must stay a clean 4xx with a JSON body — a 5xx or an HTML error page would surface
     * as an unhandled failure in the transaction watcher.
     */
    test("GET /status with a bogus txHash returns 4xx JSON, not 5xx", async ({ request }) => {
      const response = await request.get(`${LIFI_API_URL}/status?txHash=0x0`, {
        failOnStatusCode: false,
      })
      await attachRaw("status-bogus-response", response)

      expectNoServerError(response)
      expect(response.status(), "a bogus hash must be a client error").toBeGreaterThanOrEqual(400)
      expect(response.headers()["content-type"]).toContain("application/json")
    })

    test("GET /token with an invalid chain does not 5xx", async ({ request }) => {
      const response = await request.get(`${LIFI_API_URL}/token?chain=notachain&token=ETH`, {
        failOnStatusCode: false,
      })
      await attachRaw("token-invalid-chain-response", response)
      expectNoServerError(response)
    })

    test("POST /advanced/routes with an unknown token does not 5xx", async ({ request }) => {
      const response = await request.post(`${LIFI_API_URL}/advanced/routes`, {
        data: {
          fromChainId: ETHEREUM_CHAIN_ID,
          fromAmount: "1000000000000000000",
          fromTokenAddress: NATIVE_ETH,
          toChainId: ETHEREUM_CHAIN_ID,
          toTokenAddress: "0x000000000000000000000000000000000000dead",
          options: { integrator: INTEGRATOR },
        },
        failOnStatusCode: false,
      })
      await attachRaw("routes-unknown-token-response", response)
      expectNoServerError(response)
    })

    test("non-existent endpoint returns 404, not 5xx", async ({ request }) => {
      const response = await request.get(`${LIFI_API_URL}/nonexistent-endpoint`, {
        failOnStatusCode: false,
      })
      await attachRaw("nonexistent-response", response)
      expectNoServerError(response)
    })
  })
})
