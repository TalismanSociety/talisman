import { Balances } from "@talismn/balances"
import { describe, expect, it } from "vitest"

import { buildTokenPickerList } from "../buildTokenPickerList"
import { makeBalance, makeToken } from "./tokenPickerFixtures"

const funded = makeToken("funded", "FUN")
const zero = makeToken("zero", "ZER")
const absent = makeToken("absent", "ABS")
const unlisted = makeToken("unlisted", "UNL")

const rows = [funded, zero, absent].map((token) => ({ token, chainNameSearch: token.id }))

const balances = new Balances([
  makeBalance(funded, 2, { address: "alice", usdPrice: 3 }),
  makeBalance(funded, 5, { address: "bob", usdPrice: 3 }),
  makeBalance(zero, 0, { usdPrice: 3 }),
  makeBalance(unlisted, 100, { usdPrice: 3 }),
])

describe("buildTokenPickerList", () => {
  it("lists only tokens with a positive balance by default", () => {
    const list = buildTokenPickerList(rows, balances, { currency: "usd" })

    expect(list.map((row) => row.token.id)).toEqual(["funded"])
  })

  it("lists nothing before balances arrive, unless empty balances are shown", () => {
    const empty = new Balances([])

    expect(buildTokenPickerList(rows, empty, { currency: "usd" })).toEqual([])
    expect(
      buildTokenPickerList(rows, empty, { currency: "usd", showEmptyBalances: true })
    ).toHaveLength(3)
  })

  it("attaches every account's balance of each token and none of other tokens", () => {
    const [row] = buildTokenPickerList(rows, balances, { currency: "usd" })

    expect(row.balances.each.map((balance) => balance.address)).toEqual(["alice", "bob"])
    expect(row.balances.sum.fiat("usd").transferable).toBe(21)
  })

  it("lists tokens without a balance last when empty balances are shown", () => {
    const list = buildTokenPickerList(rows, balances, {
      currency: "usd",
      showEmptyBalances: true,
    })

    expect(list.map((row) => row.token.id)).toEqual(["funded", "absent", "zero"])
    expect(list[1].balances.count).toBe(0)
    expect(list[1].balances.sum.fiat("usd").transferable).toBe(0)
  })

  it("keeps the caller's fields on each row", () => {
    const list = buildTokenPickerList(rows, balances, { currency: "usd" })

    expect(list[0].chainNameSearch).toBe("funded")
  })
})
