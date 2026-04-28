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
    expect(spec.paths).toHaveProperty("/subnets")
    expect(spec.paths).toHaveProperty("/pools")
    expect(spec.paths).toHaveProperty("/validators")
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

  test("Subnet list return subnets", async ({ request }) => {
    const response = await request.get(`${TAO_DATA_API_URL}/subnets`, { headers: authHeaders })
    expect(response.ok()).toBeTruthy()

    const subnets = await response.json()
    await test.info().attach("subnets-response", {
      body: JSON.stringify(subnets, null, 2),
      contentType: "application/json",
    })

    const subnet = subnets.find((s: { netuid: number }) => s.netuid === 64)
    expect(subnet).toBeDefined()
    expect(subnet).toHaveProperty("emission")
    expect(Number(subnet.emission)).toBeGreaterThanOrEqual(0)
    expect(subnet).toHaveProperty("tempo")
  })

  test("Validators for Targon subnet are returned", async ({ request }) => {
    const response = await request.get(`${TAO_DATA_API_URL}/subnets/4/validators`, {
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
    expect(body[0].hotkey).toEqual(expect.any(String))
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
