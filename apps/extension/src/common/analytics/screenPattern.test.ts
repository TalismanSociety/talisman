import { describe, expect, it } from "vitest"

import { joinRoutePattern } from "./screenPattern"

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
