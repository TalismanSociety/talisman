import { describe, expect, it, vi } from "vitest"

import { BalancesProvider, type BalancesResult, getSweepStaleVariant } from "./BalancesProvider"
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

  it("expires live status for balances not confirmed recently", () => {
    vi.useFakeTimers()
    try {
      const provider = makeProvider()
      const balance = makeBalance()
      const balanceId = getBalanceId(balance)
      const scope = { [balance.tokenId]: [balance.address] }

      internals(provider).updateStorage$([balanceId], makeResult({ balances: [balance] }))

      vi.advanceTimersByTime(4 * 60_000)
      expect(internals(provider).getStoredBalances(scope)[0].status).toBe("live")

      // a content-identical emission refreshes the confirmation
      internals(provider).updateStorage$([balanceId], makeResult({ balances: [balance] }))
      vi.advanceTimersByTime(4 * 60_000)
      expect(internals(provider).getStoredBalances(scope)[0].status).toBe("live")

      // no emission for longer than the window: the scope left the subscription
      vi.advanceTimersByTime(2 * 60_000)
      expect(internals(provider).getStoredBalances(scope)[0].status).toBe("cache")
    } finally {
      vi.useRealTimers()
    }
  })

  it("stale sweep downgrades seeded live variants but not module-confirmed ones", () => {
    const provider = makeProvider()
    const balance = makeBalance()
    const balanceId = getBalanceId(balance)

    internals(provider).updateStorage$([balanceId], makeResult({ balances: [balance] }))
    const [seed] = internals(provider).getStoredBalances({ [balance.tokenId]: [balance.address] })

    // seeded live status is inherited, not confirmed on the current subscription
    expect(seed.status).toBe("live")
    expect(getSweepStaleVariant(seed).status).toBe("stale")

    // a balance emitted live by a module passes through untouched
    expect(getSweepStaleVariant(balance)).toBe(balance)
  })
})
