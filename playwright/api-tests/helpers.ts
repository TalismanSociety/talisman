/// <reference types="node" />

import { type APIRequestContext, type APIResponse, expect, test } from "@playwright/test"

/** Attach a parsed body to the report, so a failed cron run is diagnosable from the Discord zip. */
export const attachJson = (name: string, body: unknown) =>
  test.info().attach(name, {
    body: JSON.stringify(body, null, 2),
    contentType: "application/json",
  })

/** Attach status + raw text, for error paths where the body may not be JSON. */
export const attachRaw = async (name: string, response: APIResponse) =>
  test.info().attach(name, {
    body: `${redactUrl(response.url())}\nStatus: ${response.status()}\n${await response.text()}`,
    contentType: "text/plain",
  })

/**
 * Third-party quote endpoints region-gate with 403 and throttle with 429. Neither means
 * the contract broke, so skip instead of failing — a red daily run should mean "the API
 * changed", not "the CI runner is in the wrong country".
 */
export const skipIfUnavailable = (response: APIResponse, what: string) => {
  const status = response.status()
  if (status !== 403 && status !== 429) return

  const reason = status === 403 ? "region-gated" : "rate-limited"
  test.info().annotations.push({ type: "unavailable", description: `${what}: ${status} ${reason}` })
  test.skip(true, `${what} returned ${status} (${reason})`)
}

const SENSITIVE_QUERY_PARAMS = [
  "api_key",
  "apikey",
  "key",
  "token",
  "access_token",
  "secret",
  "signature",
]

/**
 * Some providers take their credential as a query param (SimpleSwap uses `api_key`), and failure
 * messages end up in the report zip that api-health.yml posts to Discord. Redact before rendering
 * any URL into a message or an attachment.
 */
const redactUrl = (url: string) => {
  try {
    const parsed = new URL(url)
    for (const [name] of [...parsed.searchParams]) {
      if (SENSITIVE_QUERY_PARAMS.includes(name.toLowerCase())) parsed.searchParams.set(name, "***")
    }
    return parsed.toString()
  } catch {
    // not a parseable URL — nothing to redact, and nothing worth throwing over
    return url
  }
}

/** A 5xx always means the API is broken, whatever the endpoint. */
export const expectNoServerError = (response: APIResponse) =>
  expect(response.status(), `${redactUrl(response.url())} must not return 5xx`).toBeLessThan(500)

export const expectFiniteNumber = (value: unknown, label: string) => {
  const num = Number(value)
  expect(num, `${label} must be numeric (got ${JSON.stringify(value)})`).not.toBeNaN()
  expect(Number.isFinite(num), `${label} must be finite (got ${JSON.stringify(value)})`).toBe(true)
}

export const expectPositiveNumber = (value: unknown, label: string) => {
  expectFiniteNumber(value, label)
  expect(Number(value), `${label} must be > 0`).toBeGreaterThan(0)
}

export const expectNonNegativeNumber = (value: unknown, label: string) => {
  expectFiniteNumber(value, label)
  expect(Number(value), `${label} must be >= 0`).toBeGreaterThanOrEqual(0)
}

const REMOTE_CONFIG_URL = "https://wrc.talisman.xyz/config"

type RemoteConfigSwaps = {
  lifiTalismanTokens: string[]
  curatedTokens: string[]
  simpleswapApiKey: string
}

let swapsConfigCache: Promise<RemoteConfigSwaps> | undefined

/**
 * The wallet reads every swap setting from the remote config at runtime
 * (see apps/extension/src/core/domains/app/remote-config/fetchRemoteConfig.ts), so tests that
 * need to know which tokens/networks are actually offered read the same source instead of
 * duplicating the list. Cached per worker — the config does not change during a run.
 */
export const getRemoteConfigSwaps = (request: APIRequestContext) => {
  swapsConfigCache ??= (async () => {
    const response = await request.get(REMOTE_CONFIG_URL)
    expect(response.ok(), "remote config must be reachable").toBeTruthy()
    const config = (await response.json()) as { swaps: RemoteConfigSwaps }
    return config.swaps
  })()

  return swapsConfigCache
}

/** Talisman token id -> EVM chain id, for the `evm-native` entries of `swaps.curatedTokens`. */
export const evmChainIdsFromCuratedTokens = (curatedTokens: string[]) => [
  ...new Set(
    curatedTokens
      .filter((tokenId) => tokenId.endsWith(":evm-native"))
      .map((tokenId) => Number(tokenId.split(":")[0]))
      .filter((chainId) => Number.isInteger(chainId))
  ),
]
