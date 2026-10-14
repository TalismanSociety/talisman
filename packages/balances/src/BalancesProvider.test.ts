import type { ChaindataProvider, Network, Token } from "@talismn/chaindata-provider"
import { firstValueFrom, NEVER, of, Subject } from "rxjs"
import { afterEach, describe, expect, it, vi } from "vitest"

import { BalancesProvider, type BalancesResult, getSweepStaleVariant } from "./BalancesProvider"
import { getBalanceId } from "./classes"
import log from "./log"
import { createPollingSubscribeBalances } from "./modules/shared/subscribeBalances"
import { deriveMiniMetadataId, type IBalance } from "./types"
import type { ChainConnectors } from "./types/chainConnectors"
import type { FetchBalanceResults } from "./types/IBalanceModule"

const fakeModules = vi.hoisted(() => {
  const subscribeBalances = vi.fn()
  const subscribeTolerant = vi.fn()
  const fake = (platform: string, type: string, subscribe = subscribeBalances) => ({
    platform,
    type,
    subscribeBalances: subscribe,
  })
  return {
    subscribeBalances,
    subscribeTolerant,
    BALANCE_MODULES: [
      fake("polkadot", "substrate-native"),
      fake("polkadot", "substrate-hydration", subscribeTolerant),
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
  // the provider reads the defaults only when every polkadot module has one
  const miniMetadatas = fakeModules.BALANCE_MODULES.filter((m) => m.platform === "polkadot").map(
    ({ type: source }) => ({
      id: deriveMiniMetadataId({ source, chainId: networkId, specVersion: 1 }),
      source,
      chainId: networkId,
      specVersion: 1,
      version: "1",
      data: null,
      extra: null,
    })
  )
  const balanceId = getBalanceId({ address, tokenId })
  const row = makeBalance({ address, tokenId, networkId, source: tokenType })
  return {
    networkId,
    tokenId,
    network,
    token,
    miniMetadatas,
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
      Object.fromEntries(scopes.flatMap((s) => s.miniMetadatas.map((m) => [m.id, m])))
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

const useFakeTimers = () =>
  vi.useFakeTimers({
    toFake: ["setTimeout", "setInterval", "clearTimeout", "clearInterval", "Date"],
  })

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
      useFakeTimers()
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

    it("the network level keeps failedBalanceIds", async () => {
      const scope = makeScope(platform)
      const { module$, provider } = setup(scope)
      const { emissions, subscription } = subscribe(provider, { [scope.tokenId]: [scope.address] })

      await settle()
      module$.next({
        success: [],
        errors: [{ tokenId: scope.tokenId, address: scope.address, error: new Error("boom") }],
      })
      await settle()

      expect(emissions).toEqual([
        seedResult(),
        {
          status: "live",
          balances: [],
          failedBalanceIds: [scope.balanceId],
          confirmedBalanceIds: [],
        },
      ])
      subscription.unsubscribe()
    })
  }
)

const BOB = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty"
const CHARLIE = "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y"
const boom = (tokenId: string, address: string) => ({ tokenId, address, error: new Error("boom") })

describe("getBalances$ over several ids", () => {
  afterEach(() => {
    vi.useRealTimers()
    fakeModules.subscribeBalances.mockReset()
  })

  it("a mixed emission fails one id and confirms the others, sorted", async () => {
    useFakeTimers()
    const scope = makeScope("polkadot")
    const module$ = new Subject<FetchBalanceResults>()
    fakeModules.subscribeBalances.mockReturnValue(module$)
    const provider = new BalancesProvider(makeChaindata(scope), scope.connectors)
    const id = (address: string) => getBalanceId({ address, tokenId: scope.tokenId })
    const bobRow = { ...scope.row, address: BOB }
    const { emissions, subscription } = subscribe(provider, {
      [scope.tokenId]: [scope.address, CHARLIE, BOB],
    })

    await settle()
    module$.next({ success: [bobRow], errors: [boom(scope.tokenId, scope.address)] })
    await settle()

    expect(emissions.at(-1)).toEqual({
      status: "live",
      balances: [bobRow],
      failedBalanceIds: [id(scope.address)],
      confirmedBalanceIds: [id(BOB), id(CHARLIE)],
    })
    subscription.unsubscribe()
  })

  it("a two-network scope unions and sorts both id lists, and a network confirms only its own ids", async () => {
    useFakeTimers()
    const a = makeScope("polkadot")
    const b = makeScope("polkadot")
    const moduleA$ = new Subject<FetchBalanceResults>()
    const moduleB$ = new Subject<FetchBalanceResults>()
    fakeModules.subscribeBalances.mockImplementation(({ networkId }: { networkId: string }) =>
      networkId === a.networkId ? moduleA$ : moduleB$
    )
    const provider = new BalancesProvider(makeChaindata(a, b), a.connectors)
    const idA = (address: string) => getBalanceId({ address, tokenId: a.tokenId })
    const idB = (address: string) => getBalanceId({ address, tokenId: b.tokenId })
    const { emissions, subscription } = subscribe(provider, {
      [b.tokenId]: [b.address, BOB],
      [a.tokenId]: [a.address, BOB],
    })

    await settle()
    moduleB$.next({ success: [b.row], errors: [boom(b.tokenId, BOB)] })
    await settle()
    expect(emissions.at(-1)).toEqual({
      status: "initialising",
      balances: [b.row],
      failedBalanceIds: [idB(BOB)],
      confirmedBalanceIds: [idB(b.address)],
    })

    moduleA$.next({ success: [a.row], errors: [boom(a.tokenId, BOB)] })
    await settle()
    expect(emissions.at(-1)).toEqual({
      status: "live",
      balances: [a.row, b.row],
      failedBalanceIds: [idA(BOB), idB(BOB)],
      confirmedBalanceIds: [idA(a.address), idB(b.address)],
    })
    subscription.unsubscribe()
  })
})

describe("the 30s sweep", () => {
  afterEach(() => {
    vi.useRealTimers()
    fakeModules.subscribeBalances.mockReset()
  })

  it("leaves confirmedBalanceIds untouched", async () => {
    useFakeTimers()
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

describe.each(["polkadot", "ethereum", "solana"] as Platform[])(
  "%s pipeline module failure",
  (platform) => {
    afterEach(() => {
      vi.useRealTimers()
      vi.restoreAllMocks()
      fakeModules.subscribeBalances.mockReset()
    })

    // one Subject per subscribeBalances call: a retry resubscribes the module, and a
    // Subject that errored would re-error every later subscriber
    const setup = (scope: Scope, storage?: IBalance[]) => {
      useFakeTimers()
      const modules: Subject<FetchBalanceResults>[] = []
      fakeModules.subscribeBalances.mockImplementation(() => {
        const module$ = new Subject<FetchBalanceResults>()
        modules.push(module$)
        return module$
      })
      const provider = new BalancesProvider(
        makeChaindata(scope),
        scope.connectors,
        storage && { balances: storage, miniMetadatas: [] }
      )
      return { modules, provider }
    }

    const storedStatuses = async (provider: BalancesProvider) =>
      (await firstValueFrom(provider.storage$)).balances.map((b) => b.status)

    // settle() moves the clock 100ms past the error, so the resubscribe lands exactly
    // delayMs after the error and not one millisecond earlier
    const failAndWait = async (modules: Subject<FetchBalanceResults>[], delayMs: number) => {
      const count = modules.length
      modules[count - 1].error(new Error("boom"))
      await settle()
      await vi.advanceTimersByTimeAsync(delayMs - 101)
      expect(modules).toHaveLength(count)
      await vi.advanceTimersByTimeAsync(1)
      expect(modules).toHaveLength(count + 1)
    }

    it("a module that dies before its first delivery lists every owned id as failed and confirms them after the retry delay", async () => {
      const scope = makeScope(platform)
      const { modules, provider } = setup(scope)
      const { emissions, subscription } = subscribe(provider, { [scope.tokenId]: [scope.address] })

      await settle()
      modules[0].error(new Error("boom"))
      await settle()
      expect(emissions).toEqual([
        seedResult(),
        {
          status: "live",
          balances: [],
          failedBalanceIds: [scope.balanceId],
          confirmedBalanceIds: [],
        },
      ])

      await vi.advanceTimersByTimeAsync(9_000)
      expect(modules).toHaveLength(1)
      await vi.advanceTimersByTimeAsync(1_000)
      expect(modules).toHaveLength(2)
      modules[1].next({ success: [], errors: [] })
      await settle()

      expect(emissions.slice(2)).toEqual([
        {
          status: "live",
          balances: [],
          failedBalanceIds: [],
          confirmedBalanceIds: [scope.balanceId],
        },
      ])
      subscription.unsubscribe()
    })

    it("a module that dies after a delivery lists its ids as failed, marks stored rows stale and confirms again after the retry delay", async () => {
      const scope = makeScope(platform)
      const { modules, provider } = setup(scope)
      const { emissions, subscription } = subscribe(provider, { [scope.tokenId]: [scope.address] })

      await settle()
      modules[0].next({ success: [scope.row], errors: [] })
      await settle()
      expect(await storedStatuses(provider)).toEqual(["cache"])

      modules[0].error(new Error("boom"))
      await settle()
      expect(emissions.slice(1)).toEqual([
        {
          status: "live",
          balances: [scope.row],
          failedBalanceIds: [],
          confirmedBalanceIds: [scope.balanceId],
        },
        {
          status: "live",
          balances: [{ ...scope.row, status: "stale" }],
          failedBalanceIds: [scope.balanceId],
          confirmedBalanceIds: [],
        },
      ])
      expect(await storedStatuses(provider)).toEqual(["stale"])

      await vi.advanceTimersByTimeAsync(10_000)
      modules[1].next({ success: [scope.row], errors: [] })
      await settle()

      expect(emissions.slice(3)).toEqual([
        {
          status: "live",
          balances: [scope.row],
          failedBalanceIds: [],
          confirmedBalanceIds: [scope.balanceId],
        },
      ])
      expect(await storedStatuses(provider)).toEqual(["cache"])
      subscription.unsubscribe()
    })

    it("a module that dies twice in a row reports the failure once and keeps retrying", async () => {
      const scope = makeScope(platform)
      const { modules, provider } = setup(scope)
      const { emissions, subscription } = subscribe(provider, { [scope.tokenId]: [scope.address] })

      await settle()
      modules[0].error(new Error("boom"))
      await settle()
      await vi.advanceTimersByTimeAsync(10_000)
      modules[1].error(new Error("boom again"))
      await settle()
      await vi.advanceTimersByTimeAsync(20_000)
      modules[2].next({ success: [], errors: [] })
      await settle()

      expect(emissions).toEqual([
        seedResult(),
        {
          status: "live",
          balances: [],
          failedBalanceIds: [scope.balanceId],
          confirmedBalanceIds: [],
        },
        {
          status: "live",
          balances: [],
          failedBalanceIds: [],
          confirmedBalanceIds: [scope.balanceId],
        },
      ])
      subscription.unsubscribe()
    })

    it("retries back off 10s, 20s, 40s and start over at 10s after a delivery", async () => {
      const scope = makeScope(platform)
      const { modules, provider } = setup(scope)
      const { subscription } = subscribe(provider, { [scope.tokenId]: [scope.address] })
      await settle()

      await failAndWait(modules, 10_000)
      await failAndWait(modules, 20_000)
      await failAndWait(modules, 40_000)
      modules[3].next({ success: [], errors: [] })
      await settle()
      await failAndWait(modules, 10_000)
      subscription.unsubscribe()
    })

    it("the delay caps at 5 minutes and the log turns to error after five failures in a row", async () => {
      const warn = vi.spyOn(log, "warn")
      const error = vi.spyOn(log, "error")
      const scope = makeScope(platform)
      const { modules, provider } = setup(scope)
      const { subscription } = subscribe(provider, { [scope.tokenId]: [scope.address] })
      await settle()

      for (const delayMs of [10_000, 20_000, 40_000, 80_000, 160_000, 300_000, 300_000])
        await failAndWait(modules, delayMs)

      const prefix = `[balances] module ${PLATFORMS[platform].tokenType} on ${scope.networkId} failed`
      expect(
        warn.mock.calls.map(([message]) => message).filter((m) => m.startsWith(prefix))
      ).toEqual([
        `${prefix} 1 times in a row, retrying in 10000ms`,
        `${prefix} 2 times in a row, retrying in 20000ms`,
        `${prefix} 3 times in a row, retrying in 40000ms`,
        `${prefix} 4 times in a row, retrying in 80000ms`,
        `${prefix} 5 times in a row, retrying in 160000ms`,
      ])
      expect(error.mock.calls.map(([message]) => message)).toEqual([
        `${prefix} 6 times in a row, retrying in 300000ms`,
        `${prefix} 7 times in a row, retrying in 300000ms`,
      ])
      subscription.unsubscribe()
    })

    it("a scope that joins after the module failed receives the failure, not the last confirmed list", async () => {
      const scope = makeScope(platform)
      const { modules, provider } = setup(scope)
      const first = subscribe(provider, { [scope.tokenId]: [scope.address] })

      await settle()
      modules[0].next({ success: [scope.row], errors: [] })
      await settle()
      modules[0].error(new Error("boom"))
      await settle()

      const joiner = subscribe(provider, { [scope.tokenId]: [scope.address] })
      await settle()

      expect(joiner.emissions).toEqual([
        {
          status: "live",
          balances: [{ ...scope.row, status: "stale" }],
          failedBalanceIds: [scope.balanceId],
          confirmedBalanceIds: [],
        },
      ])
      expect(modules).toHaveLength(1)
      first.subscription.unsubscribe()
      joiner.subscription.unsubscribe()
    })
  }
)

describe("the Hydration poller", () => {
  afterEach(() => {
    vi.useRealTimers()
    fakeModules.subscribeBalances.mockReset()
  })

  it("recovers after one failed poll", async () => {
    useFakeTimers()
    const scope = makeScope("polkadot")
    const fetchBalances = vi
      .fn()
      .mockImplementationOnce(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error("rpc down")), 500))
      )
      .mockResolvedValue({ success: [scope.row], errors: [] })
    fakeModules.subscribeBalances.mockImplementation(
      createPollingSubscribeBalances("substrate-hydration", fetchBalances)
    )
    const provider = new BalancesProvider(makeChaindata(scope), scope.connectors)
    const { emissions, subscription } = subscribe(provider, { [scope.tokenId]: [scope.address] })

    await settle()
    expect(emissions).toEqual([seedResult()])
    await vi.advanceTimersByTimeAsync(500)
    await settle()
    expect(emissions.slice(1)).toEqual([
      {
        status: "live",
        balances: [],
        failedBalanceIds: [scope.balanceId],
        confirmedBalanceIds: [],
      },
    ])

    await vi.advanceTimersByTimeAsync(10_000)
    await settle()
    expect(fetchBalances).toHaveBeenCalledTimes(2)
    expect(emissions.slice(2)).toEqual([
      {
        status: "live",
        balances: [scope.row],
        failedBalanceIds: [],
        confirmedBalanceIds: [scope.balanceId],
      },
    ])
    subscription.unsubscribe()
  })
})

describe("a polkadot network dead at boot", () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    fakeModules.subscribeBalances.mockReset()
    fakeModules.subscribeTolerant.mockReset()
  })

  // the native module throws on a missing mini metadata, as buildNetworkStorageCoders does;
  // the hydration module tolerates it and keeps its subscription, so it holds the shared
  // mini metadata stream across the native retry
  it("the native module recovers once the RPC answers while a tolerant co-module holds the mini metadata stream", async () => {
    useFakeTimers()
    const warn = vi.spyOn(log, "warn")
    const scope = makeScope("polkadot")
    const tolerantTokenId = `${scope.networkId}:substrate-hydration:0`
    const tolerantToken = {
      id: tolerantTokenId,
      type: "substrate-hydration",
      networkId: scope.networkId,
    } as Token
    const tolerantBalanceId = getBalanceId({ address: scope.address, tokenId: tolerantTokenId })
    let rpcUp = false
    let specCalls = 0
    const connectors = {
      substrate: {
        send: async () => {
          specCalls++
          if (!rpcUp) throw new Error("socket closed")
          return { specVersion: 1 }
        },
      },
    } as unknown as ChainConnectors
    const chaindata = {
      ...makeChaindata(scope),
      getTokensMapById$: () =>
        of({ [scope.tokenId]: scope.token, [tolerantTokenId]: tolerantToken }),
    } as unknown as ChaindataProvider

    const natives: Subject<FetchBalanceResults>[] = []
    fakeModules.subscribeBalances.mockImplementation(({ miniMetadata }) => {
      if (!miniMetadata) throw new TypeError("Cannot read properties of undefined (reading 'data')")
      const module$ = new Subject<FetchBalanceResults>()
      natives.push(module$)
      return module$
    })
    const tolerants: Subject<FetchBalanceResults>[] = []
    fakeModules.subscribeTolerant.mockImplementation(() => {
      const module$ = new Subject<FetchBalanceResults>()
      tolerants.push(module$)
      return module$
    })

    const provider = new BalancesProvider(chaindata, connectors)
    const { emissions, subscription } = subscribe(provider, {
      [scope.tokenId]: [scope.address],
      [tolerantTokenId]: [scope.address],
    })

    // three spec version attempts, 2s apart, then the module failure
    await vi.advanceTimersByTimeAsync(5_000)
    await settle()
    expect(specCalls).toBe(3)
    expect(emissions.at(-1)).toEqual({
      status: "live",
      balances: [],
      failedBalanceIds: [scope.balanceId, tolerantBalanceId].sort(),
      confirmedBalanceIds: [],
    })
    expect(warn.mock.calls.map(([, cause]) => cause)).toContainEqual(
      expect.objectContaining({
        name: "SpecVersionUnavailableError",
        message: `spec version unavailable for ${scope.networkId}`,
      })
    )

    rpcUp = true
    await vi.advanceTimersByTimeAsync(10_000)
    await settle()
    expect(specCalls).toBe(4)
    expect(natives).toHaveLength(1)
    natives[0].next({ success: [scope.row], errors: [] })
    tolerants.at(-1)!.next({ success: [], errors: [] })
    await settle()

    expect(emissions.at(-1)).toEqual({
      status: "live",
      balances: [scope.row],
      failedBalanceIds: [],
      confirmedBalanceIds: [scope.balanceId, tolerantBalanceId].sort(),
    })
    subscription.unsubscribe()
  })
})
