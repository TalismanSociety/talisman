import { Balances } from "@talismn/balances"
import { describe, expect, it } from "vitest"

import { type SortTokenDataOptions, sortTokenData } from "../sortTokenData"
import { makeBalance, makeToken } from "./tokenPickerFixtures"

type Funds = { tokens: number; usdPrice?: number }

const tokenData = (id: string, symbol: string, ...funds: Funds[]) => {
  const token = makeToken(id, symbol)
  return {
    token,
    balances: new Balances(
      funds.map(({ tokens, usdPrice }, index) =>
        makeBalance(token, tokens, { address: `account-${index}`, usdPrice })
      )
    ),
  }
}

const sortIds = (
  tokens: ReturnType<typeof tokenData>[],
  options: Partial<SortTokenDataOptions> = {}
) => sortTokenData(tokens, { currency: "usd", ...options }).map((data) => data.token.id)

describe("sortTokenData", () => {
  it.each([
    {
      rule: "priority beats pin and fiat",
      higher: tokenData("prio", "Z"),
      lower: tokenData("rich", "A", { tokens: 100, usdPrice: 1 }),
      options: { isPriority: (token) => token.id === "prio", pinnedTokenId: "rich" },
    },
    {
      rule: "pin beats fiat",
      higher: tokenData("pinned", "Z"),
      lower: tokenData("rich", "A", { tokens: 100, usdPrice: 1 }),
      options: { pinnedTokenId: "pinned" },
    },
    {
      rule: "higher fiat value first, summed across accounts",
      higher: tokenData("rich", "Z", { tokens: 30, usdPrice: 1 }, { tokens: 30, usdPrice: 1 }),
      lower: tokenData("poor", "A", { tokens: 50, usdPrice: 1 }),
    },
    {
      rule: "a balance without a rate beats no balance",
      higher: tokenData("unpriced", "Z", { tokens: 1 }),
      lower: tokenData("empty", "A"),
    },
    {
      rule: "uppercase symbols before lowercase, as the list has always sorted",
      higher: tokenData("upper", "Gamma"),
      lower: tokenData("lower", "alpha"),
    },
  ] satisfies Array<{
    rule: string
    higher: ReturnType<typeof tokenData>
    lower: ReturnType<typeof tokenData>
    options?: Partial<SortTokenDataOptions>
  }>)("$rule", ({ higher, lower, options }) => {
    expect(sortIds([lower, higher], options)).toEqual([higher.token.id, lower.token.id])
  })

  it("ranks a token without balances the same as one with a zero balance", () => {
    const none = tokenData("none", "AA")
    const zero = tokenData("zero", "AA", { tokens: 0, usdPrice: 1 })

    expect(sortIds([none, zero])).toEqual(["none", "zero"])
    expect(sortIds([zero, none])).toEqual(["zero", "none"])
  })
})
