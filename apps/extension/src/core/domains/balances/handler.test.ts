import type { BalancesResult, IBalance } from "@talismn/balances"
import { fromPairs } from "lodash-es"
import { of } from "rxjs"
import { describe, expect, it, vi } from "vitest"

import type { ExtensionStore } from "../../handlers/stores"
import type { Port } from "../../types/base"
import { BalancesHandler } from "./handler"

const fakes = vi.hoisted(() => ({ getBalances$: vi.fn(), walletBalances: vi.fn() }))
vi.mock("./balancesProvider", () => ({ balancesProvider: { getBalances$: fakes.getBalances$ } }))
vi.mock("./walletBalances", async () => {
  const { defer } = await import("rxjs")
  return { walletBalances$: defer(() => fakes.walletBalances()) }
})

const ADDRESS = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
const tokenIds = Array.from({ length: 430 }, (_, i) => `network-${i}:substrate-native`)
const balanceIds = tokenIds.map((tokenId) => `${ADDRESS}::${tokenId}`)
const row = {
  address: ADDRESS,
  tokenId: tokenIds[0],
  networkId: "network-0",
  source: "substrate-native",
  status: "live",
  values: [{ type: "free", label: "free", amount: "1000" }],
} as IBalance
const providerResult: BalancesResult = {
  status: "live",
  balances: [row],
  failedBalanceIds: [balanceIds[1]],
  confirmedBalanceIds: balanceIds,
}

const fakePort = () => {
  const messages: unknown[] = []
  const port = {
    postMessage: (message: unknown) => messages.push(message),
    onDisconnect: { addListener: () => {} },
  }
  return { port: port as unknown as Port, messages }
}

const portMessage = {
  id: "1",
  subscription: {
    status: "live",
    balances: [row],
    failedBalanceIds: [balanceIds[1]],
    confirmedBalanceIds: [],
  },
  timestamp: expect.any(Number),
}

describe("BalancesHandler", () => {
  it("pri(balances.subscribe) posts the wallet result without its confirmedBalanceIds", async () => {
    fakes.walletBalances.mockReturnValue(of(providerResult))
    const { port, messages } = fakePort()

    await new BalancesHandler({} as ExtensionStore).handle(
      "1",
      "pri(balances.subscribe)",
      null,
      port
    )

    expect(messages).toEqual([portMessage])
  })

  it("posts one message for two results that differ only in confirmedBalanceIds", async () => {
    fakes.walletBalances.mockReturnValue(
      of(providerResult, { ...providerResult, confirmedBalanceIds: balanceIds.slice(0, 2) })
    )
    const { port, messages } = fakePort()

    await new BalancesHandler({} as ExtensionStore).handle(
      "1",
      "pri(balances.subscribe)",
      null,
      port
    )

    expect(messages).toEqual([portMessage])
  })

  it("pri(balances.byparams.subscribe) requests every id and posts the result without its confirmedBalanceIds", async () => {
    fakes.getBalances$.mockReturnValue(of(providerResult))
    const { port, messages } = fakePort()

    await new BalancesHandler({} as ExtensionStore).handle(
      "1",
      "pri(balances.byparams.subscribe)",
      { addressesAndTokens: { addresses: [ADDRESS], tokenIds } },
      port
    )

    expect(fakes.getBalances$).toHaveBeenCalledWith(
      fromPairs(tokenIds.map((tokenId) => [tokenId, [ADDRESS]]))
    )
    expect(messages).toEqual([portMessage])
  })
})
