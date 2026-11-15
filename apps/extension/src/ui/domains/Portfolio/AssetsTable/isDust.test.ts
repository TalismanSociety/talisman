import { Balances } from "@talismn/balances"
import { describe, expect, it } from "vitest"

import { makeBalance, makeToken } from "../../Asset/__tests__/tokenPickerFixtures"
import { isDust } from "./isDust"

type Holding = { coingeckoId?: string; tokens: number; usdPrice?: number }

const balancesOf = ({ coingeckoId, tokens, usdPrice }: Holding) =>
  new Balances([makeBalance({ ...makeToken("token", "ζ"), coingeckoId }, tokens, { usdPrice })])

describe("isDust", () => {
  it.each([
    {
      rule: "a priced token without a coingecko id worth under US$1, like a subnet alpha",
      holding: { tokens: 1, usdPrice: 0.4 },
    },
    {
      rule: "a coingecko token worth under US$1",
      holding: { coingeckoId: "bitmind", tokens: 1, usdPrice: 0.4 },
    },
    {
      rule: "a coingecko token without a rate",
      holding: { coingeckoId: "preview-only", tokens: 1 },
    },
  ] satisfies Array<{ rule: string; holding: Holding }>)("hides $rule", ({ holding }) => {
    expect(isDust(balancesOf(holding))).toBe(true)
  })

  it.each([
    {
      rule: "a token without a coingecko id or a rate",
      holding: { tokens: 1 },
    },
    {
      rule: "a priced token without a coingecko id worth US$1 or more",
      holding: { tokens: 3, usdPrice: 0.4 },
    },
    {
      rule: "a coingecko token worth US$1 or more",
      holding: { coingeckoId: "bitmind", tokens: 3, usdPrice: 0.4 },
    },
  ] satisfies Array<{ rule: string; holding: Holding }>)("keeps $rule", ({ holding }) => {
    expect(isDust(balancesOf(holding))).toBe(false)
  })
})
