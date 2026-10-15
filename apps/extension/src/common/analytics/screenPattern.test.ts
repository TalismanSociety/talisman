import { describe, expect, it } from "vitest"

import { isRoutePattern, joinRoutePattern } from "./screenPattern"

describe("joinRoutePattern", () => {
  it.each([
    [["portfolio/*", "tokens/:symbol"], "/portfolio/tokens/:symbol", "nothing"],
    [["portfolio/*"], "/portfolio", "descendant"],
    [["portfolio/*", "*"], "/portfolio", "redirect"],
    [["*"], "/", "redirect"],
    [["accounts", "add", undefined], "/accounts/add", "nothing"],
    [["settings", "general", ""], "/settings/general", "nothing"],
    [["/"], "/", "nothing"],
    [["bittensor/*", "subnets/:netuid"], "/bittensor/subnets/:netuid", "nothing"],
    [
      ["earn/*", "positions/yieldxyz/:yieldId/:address"],
      "/earn/positions/yieldxyz/:yieldId/:address",
      "nothing",
    ],
    [["eth-sign/:id"], "/eth-sign/:id", "nothing"],
  ])("%j -> %s (awaits %s)", (paths, pattern, awaits) => {
    expect(joinRoutePattern(paths)).toEqual({ pattern, awaits })
  })
})

describe("isRoutePattern", () => {
  it.each([
    "/",
    "/portfolio/tokens/:symbol",
    "/auth-sol-signIn/:id",
    "/phishing-page-detected/:url",
    "/bittensor-testnet/subnets/:netuid",
    "/send/*",
  ])("accepts %s", (pattern) => {
    expect(isRoutePattern(pattern)).toBe(true)
  })

  it.each([
    "",
    "portfolio",
    "/send/0x5Eb5f6fE3dbCB4D1B1D2eB5C2BCDF0b0f6Cc2f3a",
    "/accounts/5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    "/tokens/123",
    "/tokens/3f2a9c1e-1b2c-4d5e-8f90-a1b2c3d4e5f6",
    "/Settings",
    "/a//b",
    `/${"a".repeat(31)}`,
  ])("rejects %s", (pattern) => {
    expect(isRoutePattern(pattern)).toBe(false)
  })
})
