import { Balance, type BalanceJson, Balances, type HydrateDb } from "@talismn/balances"
import { subNativeTokenId, type Token } from "@talismn/chaindata-provider"
import { newTokenRates } from "@talismn/token-rates"
import { describe, expect, it } from "vitest"

import { sortTokenData } from "../sortTokenData"

const DECIMALS = 10

const makeToken = (id: string, symbol: string, isTransferable = true): Token =>
  (isTransferable
    ? { id, type: "substrate-native", symbol, decimals: DECIMALS, networkId: id }
    : {
        id,
        type: "substrate-dtao",
        symbol,
        decimals: DECIMALS,
        networkId: id,
        netuid: 1,
        isTransferable: false,
      }) as Token

const makeTokenData = (
  token: Token,
  balances: Array<{ tokens: number; usdPrice?: number }> = []
) => {
  const rates = newTokenRates()
  rates.usd = { price: balances.find((b) => b.usdPrice !== undefined)?.usdPrice ?? 0 }
  const db: HydrateDb = {
    tokens: { [token.id]: token },
    tokenRates: { [token.id]: rates },
  }
  return {
    id: token.id,
    token,
    balances: new Balances(
      balances.map(
        ({ tokens }, index) =>
          new Balance(
            {
              source: "test-source",
              status: "live",
              networkId: token.networkId,
              address: `account-${index}`,
              tokenId: token.id,
              value: (BigInt(tokens) * 10n ** BigInt(DECIMALS)).toString(),
            } as BalanceJson,
            db
          )
      )
    ),
  }
}

describe("sortTokenData", () => {
  it("applies the picker's ordering rules in order and keeps input order on full ties", () => {
    const priorityIds = new Set(["prio", "prio-locked"])
    const tokens = [
      makeTokenData(makeToken("empty-b", "AAA")),
      makeTokenData(makeToken("locked", "LOCK", false), [{ tokens: 1000, usdPrice: 1 }]),
      makeTokenData(makeToken("poor", "aaa"), [{ tokens: 10, usdPrice: 1 }]),
      makeTokenData(makeToken(subNativeTokenId("kusama"), "KSM")),
      makeTokenData(makeToken("rich", "ZZZ"), [
        { tokens: 50, usdPrice: 1 },
        { tokens: 50, usdPrice: 1 },
      ]),
      makeTokenData(makeToken("dusty", "DUST"), [{ tokens: 1 }]),
      makeTokenData(makeToken("prio-locked", "PRIO", false)),
      makeTokenData(makeToken("empty-a", "AAA")),
      makeTokenData(makeToken(subNativeTokenId("polkadot"), "DOT"), [{ tokens: 10, usdPrice: 1 }]),
      makeTokenData(makeToken("pinned", "PIN")),
      makeTokenData(makeToken("prio", "PRIO")),
      makeTokenData(makeToken("mid", "Bbb"), [{ tokens: 10, usdPrice: 1 }]),
    ]

    const sorted = sortTokenData(tokens, {
      currency: "usd",
      isPriority: (token) => priorityIds.has(token.id),
      pinnedTokenId: "pinned",
    })

    expect(sorted.map((t) => t.id)).toEqual([
      "prio",
      "prio-locked",
      "pinned",
      "rich",
      subNativeTokenId("polkadot"),
      "mid",
      "poor",
      "dusty",
      subNativeTokenId("kusama"),
      "empty-b",
      "empty-a",
      "locked",
    ])
  })

  it("sorts by symbol alone when no token has a balance, a priority or a pin", () => {
    const tokens = [
      makeTokenData(makeToken("b", "beta")),
      makeTokenData(makeToken("c", "Gamma")),
      makeTokenData(makeToken("a", "alpha")),
    ]

    expect(sortTokenData(tokens, { currency: "usd" }).map((t) => t.id)).toEqual(["c", "a", "b"])
  })
})
