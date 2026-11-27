import { subGammaTokenId } from "@talismn/chaindata-provider"
import { describe, expect, it } from "vitest"

import { Balance } from "../../classes/Balance"
import { getValueId } from "../../types"
import type { GammaDeposit } from "./chain"
import { getGammaDeposits, getGammaSpendable, toGammaBalance } from "./deposits"

const COLDKEY = "5Fo2v1deBHBzANPFNHf9rCYfGcgSLy8PbPJUg4vwqCN1wzG3"
const HOTKEY_A = "5ExmGpDd1cziNENNaogDUA6RCNUvtp3aGjag53KRGEUokHns"
const HOTKEY_B = "5CiVZ2VFrM7N6dmkCbnhrq6jaCp75jxMADAqPo1hv5oizGnt"
const HOTKEY_C = "5GpE6BzryYDYxfnhjbQWWCj7Th1B9ak2ztoo5hBC9HEnwhUi"

describe("gamma deposits", () => {
  it("round-trips open, capped and paused deposits", () => {
    const deposits: GammaDeposit[] = [
      { netuid: 25, hotkey: HOTKEY_A, balance: 300n, spendable: 300n, dailySpendCap: null },
      { netuid: 25, hotkey: HOTKEY_B, balance: 200n, spendable: 50n, dailySpendCap: 50n },
      { netuid: 25, hotkey: HOTKEY_C, balance: 100n, spendable: 0n, dailySpendCap: 0n },
    ]

    const json = toGammaBalance(COLDKEY, subGammaTokenId("bittensor", 25), deposits)
    if (!json) throw new Error("expected a balance")
    const balance = new Balance(json)

    expect(getGammaDeposits(json)).toEqual([
      { hotkey: HOTKEY_A, balance: 300n, spendable: 300n, dailySpendCap: null, status: "open" },
      { hotkey: HOTKEY_B, balance: 200n, spendable: 50n, dailySpendCap: 50n, status: "capped" },
      { hotkey: HOTKEY_C, balance: 100n, spendable: 0n, dailySpendCap: 0n, status: "paused" },
    ])
    expect(getGammaSpendable(json)).toBe(350n)
    expect({
      networkId: json.networkId,
      source: json.source,
      total: balance.total.planck,
      free: balance.free.planck,
      transferable: balance.transferable.planck,
    }).toEqual({
      networkId: "bittensor",
      source: "substrate-gamma",
      total: 600n,
      free: 0n,
      transferable: 0n,
    })
  })

  it("gives two deposits on one subnet distinct value ids", () => {
    const json = toGammaBalance(COLDKEY, subGammaTokenId("bittensor", 80), [
      { netuid: 80, hotkey: HOTKEY_A, balance: 10n, spendable: 10n, dailySpendCap: null },
      { netuid: 80, hotkey: HOTKEY_B, balance: 20n, spendable: 20n, dailySpendCap: null },
    ])

    expect(json?.values.map(getValueId)).toEqual([
      "gamma-deposit:5ExmGpDd1cziNENNaogDUA6RCNUvtp3aGjag53KRGEUokHns::reserved::::",
      "gamma-deposit:5CiVZ2VFrM7N6dmkCbnhrq6jaCp75jxMADAqPo1hv5oizGnt::reserved::::",
    ])
  })
})
