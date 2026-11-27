import type { IChainConnectorDot } from "@talismn/chain-connectors"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { FetchBalanceResults, TokensWithAddresses } from "../../types/IBalanceModule"
import { fetchOwnedGammaDeposits, type GammaDeposit } from "./chain"
import { getGammaSpendable } from "./deposits"
import { subscribeBalances } from "./subscribeBalances"

vi.mock("./chain", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./chain")>()),
  fetchOwnedGammaDeposits: vi.fn(),
}))

const COLDKEY = "5Fo2v1deBHBzANPFNHf9rCYfGcgSLy8PbPJUg4vwqCN1wzG3"

const depositsWithSpendable = (spendable: bigint): GammaDeposit[] => [
  {
    netuid: 25,
    hotkey: "5ExmGpDd1cziNENNaogDUA6RCNUvtp3aGjag53KRGEUokHns",
    balance: 154770370n,
    spendable,
    dailySpendCap: 154770370n,
  },
]

const connector = {
  send: async (_networkId: string, method: string) => {
    if (method === "chain_getBlockHash") return "0x01"
    if (method === "state_getRuntimeVersion") return { specVersion: 497 }
    throw new Error(`unexpected ${method}`)
  },
} as unknown as IChainConnectorDot

const subscribe = () =>
  subscribeBalances({
    networkId: "bittensor",
    tokensWithAddresses: [
      [
        {
          id: "bittensor:substrate-gamma:25",
          type: "substrate-gamma",
          platform: "polkadot",
          networkId: "bittensor",
          netuid: 25,
        } as TokensWithAddresses[number][0],
        [COLDKEY],
      ],
    ],
    connector,
    miniMetadata: {
      id: "gamma-497",
      source: "substrate-gamma",
      chainId: "bittensor",
      specVersion: 497,
      version: "v16",
      data: "0x00",
      extra: null,
    },
  })

describe("substrate-gamma subscribeBalances", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it("polls every 30 s and emits only when a poll reads different deposits", async () => {
    vi.mocked(fetchOwnedGammaDeposits)
      .mockResolvedValueOnce(new Map([[COLDKEY, depositsWithSpendable(154770370n)]]))
      .mockResolvedValueOnce(new Map([[COLDKEY, depositsWithSpendable(154770370n)]]))
      .mockResolvedValueOnce(new Map([[COLDKEY, depositsWithSpendable(100000000n)]]))

    const emits: FetchBalanceResults[] = []
    const subscription = subscribe().subscribe((results) => emits.push(results))
    const spendables = () => emits.map(({ success }) => success.map(getGammaSpendable))

    await vi.advanceTimersByTimeAsync(0)
    expect(spendables()).toEqual([[154770370n]])

    await vi.advanceTimersByTimeAsync(29_999)
    expect(vi.mocked(fetchOwnedGammaDeposits)).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1)
    expect(vi.mocked(fetchOwnedGammaDeposits)).toHaveBeenCalledTimes(2)
    expect(spendables()).toEqual([[154770370n]])

    await vi.advanceTimersByTimeAsync(30_000)
    expect(spendables()).toEqual([[154770370n], [100000000n]])

    subscription.unsubscribe()
  })
})
