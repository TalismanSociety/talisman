import type { ChaindataProvider, Network, Token } from "@talismn/chaindata-provider"
import { NEVER, of, Subject } from "rxjs"
import { afterEach, describe, expect, it, vi } from "vitest"

import { BalancesProvider, type BalancesResult, getSweepStaleVariant } from "./BalancesProvider"
import { getBalanceId } from "./classes"
import { deriveMiniMetadataId, type IBalance } from "./types"
import type { ChainConnectors } from "./types/chainConnectors"
import type { FetchBalanceResults } from "./types/IBalanceModule"

const fakeModules = vi.hoisted(() => {
  const subscribeBalances = vi.fn()
  const fake = (platform: string, type: string) => ({ platform, type, subscribeBalances })
  return {
    subscribeBalances,
    BALANCE_MODULES: [
      fake("polkadot", "substrate-native"),
      fake("ethereum", "evm-native"),
      fake("solana", "sol-native"),
    ],
  }
})

vi.mock("./modules", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./modules")>()),
  BALANCE_MODULES: fakeModules.BALANCE_MODULES,
}))

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
  confirmedBalanceIds: [],
  ...partial,
})

const liveEmission = (...balances: IBalance[]) =>
  makeResult({ balances, confirmedBalanceIds: balances.map((b) => getBalanceId(b)) })

// the provider constructor only stores its dependencies, none are exercised by the
// storage/seed paths under test
const makeProvider = () =>
  new BalancesProvider(
    {} as ConstructorParameters<typeof BalancesProvider>[0],
    {} as ConstructorParameters<typeof BalancesProvider>[1]
  )

type ProviderInternals = {
  updateStorage$: (result: BalancesResult) => void
  getStoredBalances: (addressesByToken: Record<string, string[]>) => IBalance[]
}

const internals = (provider: BalancesProvider) => provider as unknown as ProviderInternals

describe("BalancesProvider restart seeds", () => {
  it("seeds previously-live balances with status live and stored content", () => {
    const provider = makeProvider()
    const balance = makeBalance()

    internals(provider).updateStorage$(liveEmission(balance))

    const seed = internals(provider).getStoredBalances({ [balance.tokenId]: [balance.address] })
    expect(seed).toHaveLength(1)
    expect(seed[0].status).toBe("live")
    expect({ ...seed[0], status: undefined }).toEqual({ ...balance, status: undefined })
  })

  it("returns a reference-stable live variant across repeated seeds", () => {
    const provider = makeProvider()
    const balance = makeBalance()

    internals(provider).updateStorage$(liveEmission(balance))

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

    internals(provider).updateStorage$(liveEmission(balance))
    internals(provider).updateStorage$(makeResult({ failedBalanceIds: [balanceId] }))

    const seed = internals(provider).getStoredBalances({ [balance.tokenId]: [balance.address] })
    expect(seed).toHaveLength(1)
    expect(seed[0].status).toBe("stale")
  })

  it("drops live status for balances that disappear from the result set", () => {
    const provider = makeProvider()
    const balance = makeBalance()
    const balanceId = getBalanceId(balance)

    internals(provider).updateStorage$(liveEmission(balance))
    internals(provider).updateStorage$(makeResult({ confirmedBalanceIds: [balanceId] }))

    const seed = internals(provider).getStoredBalances({ [balance.tokenId]: [balance.address] })
    expect(seed).toHaveLength(0)
  })

  it("keeps a stored row the emission neither confirmed nor failed", () => {
    const provider = makeProvider()
    const balance = makeBalance()

    internals(provider).updateStorage$(liveEmission(balance))
    internals(provider).updateStorage$(makeResult())

    const seed = internals(provider).getStoredBalances({ [balance.tokenId]: [balance.address] })
    expect(seed).toHaveLength(1)
    expect(seed[0].status).toBe("live")
  })

  it("still confirms live status on a content-identical (no-op) emission", () => {
    const balance = makeBalance()

    // provider restored from persisted storage holding this balance as cache
    const restored = new BalancesProvider(
      {} as ConstructorParameters<typeof BalancesProvider>[0],
      {} as ConstructorParameters<typeof BalancesProvider>[1],
      { balances: [{ ...balance, status: "cache" } as IBalance], miniMetadatas: [] }
    )

    // first live emission is content-identical to storage: the storage merge no-ops,
    // but the live set must still learn about the balance
    internals(restored).updateStorage$(liveEmission(balance))

    const seed = internals(restored).getStoredBalances({ [balance.tokenId]: [balance.address] })
    expect(seed).toHaveLength(1)
    expect(seed[0].status).toBe("live")
  })

  it("expires live status for balances not confirmed recently", () => {
    vi.useFakeTimers()
    try {
      const provider = makeProvider()
      const balance = makeBalance()
      const scope = { [balance.tokenId]: [balance.address] }

      internals(provider).updateStorage$(liveEmission(balance))

      vi.advanceTimersByTime(4 * 60_000)
      expect(internals(provider).getStoredBalances(scope)[0].status).toBe("live")

      // a content-identical emission refreshes the confirmation
      internals(provider).updateStorage$(liveEmission(balance))
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

    internals(provider).updateStorage$(liveEmission(balance))
    const [seed] = internals(provider).getStoredBalances({ [balance.tokenId]: [balance.address] })

    // seeded live status is inherited, not confirmed on the current subscription
    expect(seed.status).toBe("live")
    expect(getSweepStaleVariant(seed).status).toBe("stale")

    // a balance emitted live by a module passes through untouched
    expect(getSweepStaleVariant(balance)).toBe(balance)
  })
})

type Platform = "polkadot" | "ethereum" | "solana"

const SS58 = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
const H160 = "0x0000000000000000000000000000000000000001"
const SOLANA = "So11111111111111111111111111111111111111112"

const PLATFORMS: Record<
  Platform,
  {
    tokenType: string
    network: Partial<Network>
    address: string
    incompatible: string
    connectors: ChainConnectors
  }
> = {
  polkadot: {
    tokenType: "substrate-native",
    network: { platform: "polkadot", account: "*25519" },
    address: SS58,
    incompatible: H160,
    connectors: {
      substrate: { send: async () => ({ specVersion: 1 }) },
    } as unknown as ChainConnectors,
  },
  ethereum: {
    tokenType: "evm-native",
    network: { platform: "ethereum" },
    address: H160,
    incompatible: SS58,
    connectors: { evm: {} } as unknown as ChainConnectors,
  },
  solana: {
    tokenType: "sol-native",
    network: { platform: "solana" },
    address: SOLANA,
    incompatible: SS58,
    connectors: { solana: {} } as unknown as ChainConnectors,
  },
}

// module streams and minimetadata streams are shared process-wide by network id, so every
// scope gets a network of its own
let networkCounter = 0
const makeScope = (platform: Platform) => {
  const {
    tokenType,
    network: networkPartial,
    address,
    incompatible,
    connectors,
  } = PLATFORMS[platform]
  const networkId = `test-network-${String(++networkCounter).padStart(3, "0")}`
  const tokenId = `${networkId}:${tokenType}`
  const network = { id: networkId, ...networkPartial } as Network
  const token = { id: tokenId, type: tokenType, networkId } as Token
  const miniMetadataId = deriveMiniMetadataId({
    source: tokenType,
    chainId: networkId,
    specVersion: 1,
  })
  const miniMetadata = {
    id: miniMetadataId,
    source: tokenType,
    chainId: networkId,
    specVersion: 1,
    version: "1",
    data: null,
    extra: null,
  }
  const balanceId = getBalanceId({ address, tokenId })
  const row = makeBalance({ address, tokenId, networkId, source: tokenType })
  return {
    networkId,
    tokenId,
    network,
    token,
    miniMetadata,
    address,
    incompatible,
    balanceId,
    row,
    connectors,
  }
}
type Scope = ReturnType<typeof makeScope>

const makeChaindata = (...scopes: Scope[]) =>
  ({
    getNetworkById$: (id: string) => of(scopes.find((s) => s.networkId === id)?.network ?? null),
    getTokensMapById$: () => of(Object.fromEntries(scopes.map((s) => [s.tokenId, s.token]))),
    getNetworksMapById$: () => of(Object.fromEntries(scopes.map((s) => [s.networkId, s.network]))),
    miniMetadatasMapById$: of(
      Object.fromEntries(scopes.map((s) => [s.miniMetadata.id, s.miniMetadata]))
    ),
    registerDynamicTokens: vi.fn(),
  }) as unknown as ChaindataProvider

const seedResult = (balances: IBalance[] = []): BalancesResult =>
  makeResult({ status: "initialising", balances })

// the aggregate audits for 100ms and yields through MessageChannel, which the fake
// timers leave alone: advance the audit window, then let the real macrotasks drain
const settle = async () => {
  await vi.advanceTimersByTimeAsync(100)
  for (let i = 0; i < 5; i++) await new Promise((resolve) => setImmediate(resolve))
}

const subscribe = (provider: BalancesProvider, scope: Record<string, string[]>) => {
  const emissions: BalancesResult[] = []
  const subscription = provider.getBalances$(scope).subscribe((r) => emissions.push(r))
  return { emissions, subscription }
}

describe.each(["polkadot", "ethereum", "solana"] as Platform[])(
  "%s pipeline confirmedBalanceIds",
  (platform) => {
    afterEach(() => {
      vi.useRealTimers()
      fakeModules.subscribeBalances.mockReset()
    })

    const setup = (scope: Scope, storage?: IBalance[]) => {
      vi.useFakeTimers({
        toFake: ["setTimeout", "setInterval", "clearTimeout", "clearInterval", "Date"],
      })
      const module$ = new Subject<FetchBalanceResults>()
      fakeModules.subscribeBalances.mockReturnValue(module$)
      const provider = new BalancesProvider(
        makeChaindata(scope),
        scope.connectors,
        storage && { balances: storage, miniMetadatas: [] }
      )
      return { module$, provider }
    }

    it("an empty module emission confirms the id with no row", async () => {
      const scope = makeScope(platform)
      const { module$, provider } = setup(scope)
      const { emissions, subscription } = subscribe(provider, { [scope.tokenId]: [scope.address] })

      await settle()
      module$.next({ success: [], errors: [] })
      await settle()

      expect(emissions).toEqual([
        seedResult(),
        {
          status: "live",
          balances: [],
          failedBalanceIds: [],
          confirmedBalanceIds: [scope.balanceId],
        },
      ])
      subscription.unsubscribe()
    })

    it("the initialising seed confirms nothing even for a seeded live row", async () => {
      const scope = makeScope(platform)
      const { provider } = setup(scope, [{ ...scope.row, status: "cache" } as IBalance])
      internals(provider).updateStorage$(liveEmission(scope.row))
      const { emissions, subscription } = subscribe(provider, { [scope.tokenId]: [scope.address] })

      await settle()

      expect(emissions).toEqual([seedResult([scope.row])])
      expect(emissions[0].balances[0].status).toBe("live")
      subscription.unsubscribe()
    })

    it("an incompatible address is never confirmed", async () => {
      const scope = makeScope(platform)
      const { module$, provider } = setup(scope)
      const { emissions, subscription } = subscribe(provider, {
        [scope.tokenId]: [scope.address, scope.incompatible],
      })

      await settle()
      module$.next({ success: [], errors: [] })
      await settle()

      expect(fakeModules.subscribeBalances.mock.calls[0][0].tokensWithAddresses).toEqual([
        [scope.token, [scope.address]],
      ])
      expect(emissions).toEqual([
        seedResult(),
        {
          status: "live",
          balances: [],
          failedBalanceIds: [],
          confirmedBalanceIds: [scope.balanceId],
        },
      ])
      subscription.unsubscribe()
    })
  }
)

describe("the 30s sweep", () => {
  afterEach(() => {
    vi.useRealTimers()
    fakeModules.subscribeBalances.mockReset()
  })

  it("leaves confirmedBalanceIds untouched", async () => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "setInterval", "clearTimeout", "clearInterval", "Date"],
    })
    const confirmed = makeScope("polkadot")
    const dead = makeScope("polkadot")
    const module$ = new Subject<FetchBalanceResults>()
    fakeModules.subscribeBalances.mockImplementation(({ networkId }: { networkId: string }) =>
      networkId === confirmed.networkId ? module$ : NEVER
    )
    const provider = new BalancesProvider(makeChaindata(confirmed, dead), confirmed.connectors, {
      balances: [{ ...dead.row, status: "cache" } as IBalance],
      miniMetadatas: [],
    })
    internals(provider).updateStorage$(liveEmission(dead.row))
    const { emissions, subscription } = subscribe(provider, {
      [confirmed.tokenId]: [confirmed.address],
      [dead.tokenId]: [dead.address],
    })

    await settle()
    module$.next({ success: [confirmed.row], errors: [] })
    await settle()
    expect(emissions.at(-1)).toEqual({
      status: "initialising",
      balances: [confirmed.row, dead.row],
      failedBalanceIds: [],
      confirmedBalanceIds: [confirmed.balanceId],
    })

    await vi.advanceTimersByTimeAsync(30_000)
    await settle()
    expect(emissions.at(-1)).toEqual({
      status: "live",
      balances: [confirmed.row, { ...dead.row, status: "stale" }],
      failedBalanceIds: [],
      confirmedBalanceIds: [confirmed.balanceId],
    })
    subscription.unsubscribe()
  })
})
