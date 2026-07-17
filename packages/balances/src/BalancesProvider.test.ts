import { describe, expect, it } from "vitest"

import { BalancesProvider, type BalancesResult } from "./BalancesProvider"
import { getBalanceId, type IBalance } from "./types"

const makeBalance = (partial: Partial<IBalance> & Record<string, unknown> = {}): IBalance =>
  ({
    address: "0x01",
    tokenId: "test-token",
    networkId: "test-network",
    source: "substrate-native",
    status: "live",
    values: [{ type: "free", label: "free", amount: "1000" }],
    ...partial,
  }) as IBalance

const makeResult = (partial: Partial<BalancesResult> = {}): BalancesResult => ({
  status: "live",
  balances: [],
  failedBalanceIds: [],
  ...partial,
})

// the provider constructor only stores its dependencies, none are exercised by the
// storage/seed paths under test
const makeProvider = () =>
  new BalancesProvider(
    {} as ConstructorParameters<typeof BalancesProvider>[0],
    {} as ConstructorParameters<typeof BalancesProvider>[1]
  )

type ProviderInternals = {
  updateStorage$: (balanceIds: string[], result: BalancesResult) => void
  getStoredBalances: (addressesByToken: Record<string, string[]>) => IBalance[]
}

const internals = (provider: BalancesProvider) => provider as unknown as ProviderInternals

describe("BalancesProvider restart seeds", () => {
  it("seeds previously-live balances with status live and stored content", () => {
    const provider = makeProvider()
    const balance = makeBalance()
    const balanceId = getBalanceId(balance)

    internals(provider).updateStorage$([balanceId], makeResult({ balances: [balance] }))

    const seed = internals(provider).getStoredBalances({ [balance.tokenId]: [balance.address] })
    expect(seed).toHaveLength(1)
    expect(seed[0].status).toBe("live")
    expect({ ...seed[0], status: undefined }).toEqual({ ...balance, status: undefined })
  })

  it("returns a reference-stable live variant across repeated seeds", () => {
    const provider = makeProvider()
    const balance = makeBalance()
    const balanceId = getBalanceId(balance)

    internals(provider).updateStorage$([balanceId], makeResult({ balances: [balance] }))

    const scope = { [balance.tokenId]: [balance.address] }
    const first = internals(provider).getStoredBalances(scope)
    const second = internals(provider).getStoredBalances(scope)
    expect(first[0]).toBe(second[0])
  })

  it("keeps status cache for balances never confirmed live (cold start)", () => {
    const balance = makeBalance()

    // no updateStorage$ call: simulates a provider constructed from persisted storage
    const cold = new BalancesProvider(
      {} as ConstructorParameters<typeof BalancesProvider>[0],
      {} as ConstructorParameters<typeof BalancesProvider>[1],
      { balances: [{ ...balance, status: "cache" } as IBalance], miniMetadatas: [] }
    )

    const seed = internals(cold).getStoredBalances({ [balance.tokenId]: [balance.address] })
    expect(seed).toHaveLength(1)
    expect(seed[0].status).toBe("cache")
  })

  it("downgrades a balance whose fetch later fails: stale in storage, not live in seeds", () => {
    const provider = makeProvider()
    const balance = makeBalance()
    const balanceId = getBalanceId(balance)

    internals(provider).updateStorage$([balanceId], makeResult({ balances: [balance] }))
    internals(provider).updateStorage$([balanceId], makeResult({ failedBalanceIds: [balanceId] }))

    const seed = internals(provider).getStoredBalances({ [balance.tokenId]: [balance.address] })
    expect(seed).toHaveLength(1)
    expect(seed[0].status).toBe("stale")
  })

  it("drops live status for balances that disappear from the result set", () => {
    const provider = makeProvider()
    const balance = makeBalance()
    const balanceId = getBalanceId(balance)

    internals(provider).updateStorage$([balanceId], makeResult({ balances: [balance] }))
    // next emission: balance expected but absent and not failed = now empty, removed
    internals(provider).updateStorage$([balanceId], makeResult())

    const seed = internals(provider).getStoredBalances({ [balance.tokenId]: [balance.address] })
    expect(seed).toHaveLength(0)
  })

  it("still confirms live status on a content-identical (no-op) emission", () => {
    const balance = makeBalance()
    const balanceId = getBalanceId(balance)

    // provider restored from persisted storage holding this balance as cache
    const restored = new BalancesProvider(
      {} as ConstructorParameters<typeof BalancesProvider>[0],
      {} as ConstructorParameters<typeof BalancesProvider>[1],
      { balances: [{ ...balance, status: "cache" } as IBalance], miniMetadatas: [] }
    )

    // first live emission is content-identical to storage: the storage merge no-ops,
    // but the live set must still learn about the balance
    internals(restored).updateStorage$([balanceId], makeResult({ balances: [balance] }))

    const seed = internals(restored).getStoredBalances({ [balance.tokenId]: [balance.address] })
    expect(seed).toHaveLength(1)
    expect(seed[0].status).toBe("live")
  })
})
