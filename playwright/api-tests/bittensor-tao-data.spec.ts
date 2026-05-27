/// <reference types="node" />

import { expect, test } from "@playwright/test"

const TAO_DATA_API_URL = "https://tda.talisman.xyz"

const TDA_API_KEY = process.env.TDA_API_KEY
const authHeaders: Record<string, string> = TDA_API_KEY ? { "X-API-Key": TDA_API_KEY } : {}

test.describe("Bittensor TAO Data API", () => {
  test.describe.configure({ retries: 2 })

  test("OpenAPI spec is accessible", async ({ request }) => {
    const response = await request.get(`${TAO_DATA_API_URL}/openapi.json`)
    const spec = await response.json()
    await test.info().attach("openapi-spec", {
      body: JSON.stringify(spec, null, 2),
      contentType: "application/json",
    })
    expect(response.ok()).toBeTruthy()
    expect(spec).toHaveProperty("paths")
    expect(spec.paths).toHaveProperty("/pools")
    expect(spec.paths).toHaveProperty("/validators")
    expect(spec.paths).toHaveProperty("/validators/{hotkey}/subnets")
    expect(spec.paths).toHaveProperty("/price")
  })

  test("Checks if pool data is being returned", async ({ request }) => {
    const response = await request.get(`${TAO_DATA_API_URL}/pools`, { headers: authHeaders })
    const body = await response.json()
    await test.info().attach("pools-response", {
      body: JSON.stringify(body, null, 2),
      contentType: "application/json",
    })
    expect(response.ok()).toBeTruthy()
    expect(Array.isArray(body)).toBeTruthy()
    expect(body.length).toBeGreaterThan(0)
    expect(body[1].netuid).toBeGreaterThanOrEqual(0)
  })

  test("Validator data", async ({ request }) => {
    const response = await request.get(`${TAO_DATA_API_URL}/validators`, {
      headers: authHeaders,
    })
    const body = await response.json()
    await test.info().attach("validators-response", {
      body: JSON.stringify(body, null, 2),
      contentType: "application/json",
    })
    expect(response.ok()).toBeTruthy()
    expect(Array.isArray(body)).toBeTruthy()
    expect(body.length).toBeGreaterThan(0)
  })

  test("TAO price is greater than 0", async ({ request }) => {
    const response = await request.get(`${TAO_DATA_API_URL}/price`, { headers: authHeaders })
    const body = await response.json()
    await test.info().attach("price-response", {
      body: JSON.stringify(body, null, 2),
      contentType: "application/json",
    })
    expect(response.ok()).toBeTruthy()
    expect(Number(body.price)).toBeGreaterThan(0)
  })

  test("Validators for Targon subnet are returned", async ({ request }) => {
    const TARGON_NETUID = 4

    const response = await request.get(`${TAO_DATA_API_URL}/subnets/${TARGON_NETUID}/validators`, {
      headers: authHeaders,
    })
    const body = await response.json()
    await test.info().attach("subnets-validators-response", {
      body: JSON.stringify(body, null, 2),
      contentType: "application/json",
    })

    expect(response.ok()).toBeTruthy()
    expect(Array.isArray(body)).toBeTruthy()
    expect(body.length).toBeGreaterThan(0)

    for (const validator of body) {
      expect(validator).toEqual(
        expect.objectContaining({
          hotkey: expect.any(String),
          stake: expect.any(Number),
        })
      )
      expect(validator.hotkey).toMatch(/^5[1-9A-HJ-NP-Za-km-z]{47}$/)
      expect(validator.stake).toBeGreaterThan(0)
    }
  })

  test("Subnets for a validator are returned", async ({ request }) => {
    const APEX_NETUID = 1

    const validatorsResponse = await request.get(
      `${TAO_DATA_API_URL}/subnets/${APEX_NETUID}/validators`,
      { headers: authHeaders }
    )
    expect(validatorsResponse.ok()).toBeTruthy()
    const validators = await validatorsResponse.json()
    expect(Array.isArray(validators)).toBeTruthy()
    expect(validators.length).toBeGreaterThan(0)

    const hotkey: string = validators[0].hotkey
    expect(hotkey).toMatch(/^5[1-9A-HJ-NP-Za-km-z]{47}$/)

    const response = await request.get(`${TAO_DATA_API_URL}/validators/${hotkey}/subnets`, {
      headers: authHeaders,
    })
    const body = await response.json()
    await test.info().attach("validator-subnets-response", {
      body: JSON.stringify(body, null, 2),
      contentType: "application/json",
    })

    expect(response.ok()).toBeTruthy()
    expect(Array.isArray(body)).toBeTruthy()
    expect(body.length).toBeGreaterThan(0)

    const netuids = new Set<number>()
    for (const entry of body) {
      expect(entry).toEqual(
        expect.objectContaining({
          netuid: expect.any(Number),
          stake: expect.any(Number),
        })
      )
      expect(Number.isInteger(entry.netuid)).toBe(true)
      expect(entry.netuid).toBeGreaterThanOrEqual(0)
      expect(entry.stake).toBeGreaterThan(0)
      netuids.add(entry.netuid)
    }

    expect(netuids.size).toBe(body.length)
    expect(netuids.has(APEX_NETUID)).toBe(true)
  })

  test("non-existent endpoint returns 404, not 5xx", async ({ request }) => {
    const response = await request.get(`${TAO_DATA_API_URL}/nonexistent-endpoint`, {
      headers: authHeaders,
      failOnStatusCode: false,
    })
    await test.info().attach("nonexistent-response", {
      body: `Status: ${response.status()}\n${await response.text()}`,
      contentType: "text/plain",
    })
    expect(response.status()).toBeLessThan(500)
  })
})
