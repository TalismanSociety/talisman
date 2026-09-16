import type { EthNetwork, EvmNativeToken } from "@talismn/chaindata-provider"
import type { Account } from "@talismn/keyring"
import { BehaviorSubject, map } from "rxjs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { DiscoveredBalance } from "../types"

const mocks = vi.hoisted(() => ({
  ready$: undefined as unknown as BehaviorSubject<boolean>,
  accounts$: undefined as unknown as BehaviorSubject<Account[]>,
  networks$: undefined as unknown as BehaviorSubject<EthNetwork[]>,
  tokens: [] as EvmNativeToken[],
  rows: new Map<string, DiscoveredBalance>(),
  getClient: vi.fn(),
  fetchMissingTokens: vi.fn(async () => []),
}))

vi.mock("../../../db", () => ({
  db: {
    assetDiscovery: {
      toArray: async () => [...mocks.rows.values()],
      clear: async () => mocks.rows.clear(),
      count: async () => mocks.rows.size,
      put: async (row: DiscoveredBalance) => mocks.rows.set(row.id, row),
      bulkPut: async (rows: DiscoveredBalance[]) => {
        for (const row of rows) mocks.rows.set(row.id, row)
      },
      bulkDelete: async (ids: string[]) => {
        for (const id of ids) mocks.rows.delete(id)
      },
    },
  },
}))

vi.mock("../../app/store.app", () => ({ appStore: { get: async () => false } }))
vi.mock("@talismn/balances", () => ({ abiMulticall: [], erc20BalancesAggregatorAbi: [] }))
vi.mock("../../../libs/isWalletReady", () => ({
  get isWalletReady$() {
    return mocks.ready$
  },
}))
vi.mock("../../keyring/store", () => ({
  keyringStore: {
    get accounts$() {
      return mocks.accounts$
    },
    getAccounts: async () => mocks.accounts$.value,
  },
}))
vi.mock("../../../rpcs/chaindata", () => ({
  chaindataProvider: {
    getNetworks$: () => mocks.networks$,
    getNetworks: async () => mocks.networks$.value,
    getNetworksMapById$: () =>
      mocks.networks$.pipe(map((networks) => Object.fromEntries(networks.map((n) => [n.id, n])))),
    getNetworksMapById: async () => Object.fromEntries(mocks.networks$.value.map((n) => [n.id, n])),
    getTokens: async () => mocks.tokens,
    getTokenById: async (id: string) => mocks.tokens.find((token) => token.id === id),
  },
}))
vi.mock("../../../rpcs/chain-connector-evm", () => ({
  chainConnectorEvm: { getPublicClientForEvmNetwork: mocks.getClient },
}))
vi.mock("../fetchMissingTokens", () => ({ fetchMissingTokens: mocks.fetchMissingTokens }))
vi.mock("../scheduler", () => ({ runDiscoveryTask: (task: () => Promise<unknown>) => task() }))

const ACCOUNT: Account = {
  address: "0x0000000000000000000000000000000000001234",
  type: "keypair",
  curve: "ethereum",
  name: "Discovery test",
  createdAt: 0,
}

const network = (id: string, forceScan = false): EthNetwork => ({
  id,
  name: id,
  platform: "ethereum",
  nativeTokenId: `${id}:evm-native`,
  nativeCurrency: { symbol: "TAO", decimals: 18, name: "TAO" },
  rpcs: ["https://example.com"],
  blockExplorerUrls: [],
  forceScan,
  isDefault: !forceScan,
})
const BITTENSOR = network("964", true)
const BASE = network("8453")

const loadNetworks = (networks: EthNetwork[]) => {
  mocks.tokens = networks.map((n) => ({
    id: n.nativeTokenId,
    networkId: n.id,
    platform: "ethereum",
    type: "evm-native",
    symbol: "TAO",
    decimals: 18,
    isDefault: true,
  }))
  mocks.networks$.next(networks)
}

const settle = async () => {
  for (let i = 0; i < 15; i++) await vi.advanceTimersByTimeAsync(0)
}

let scanner: typeof import("../scanner").assetDiscoveryScanner
let activeNetworks: typeof import("../../balances/store.activeNetworks").activeNetworksStore
let activeTokens: typeof import("../../balances/store.activeTokens").activeTokensStore
let scanStore: typeof import("../store").assetDiscoveryStore
let db: typeof import("../../../db").db

beforeEach(async () => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.useFakeTimers()
  mocks.ready$ = new BehaviorSubject(false)
  mocks.accounts$ = new BehaviorSubject<Account[]>([])
  mocks.networks$ = new BehaviorSubject<EthNetwork[]>([])
  loadNetworks([])
  mocks.getClient.mockReset().mockResolvedValue({ getBalance: vi.fn(async () => 1n) })
  ;({ activeNetworksStore: activeNetworks } = await import("../../balances/store.activeNetworks"))
  ;({ activeTokensStore: activeTokens } = await import("../../balances/store.activeTokens"))
  ;({ assetDiscoveryStore: scanStore } = await import("../store"))
  ;({ db } = await import("../../../db"))
  await activeNetworks.replace({})
  await activeTokens.replace({})
  await scanStore.reset()
  await db.assetDiscovery.clear()
  ;({ assetDiscoveryScanner: scanner } = await import("../scanner"))
})

afterEach(async () => {
  mocks.ready$.complete()
  mocks.accounts$.complete()
  activeNetworks.observable.complete()
  activeNetworks.destroy()
  activeTokens.destroy()
  scanStore.destroy()
  mocks.networks$.complete()
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe("EVM asset discovery", () => {
  it("activates a discovered network before another network finishes, without rescanning itself", async () => {
    loadNetworks([BITTENSOR, BASE])
    const baseBalance = Promise.withResolvers<bigint>()
    mocks.getClient.mockImplementation(async (id: string) => ({
      getBalance: async () => (id === BASE.id ? baseBalance.promise : 1n),
    }))
    mocks.accounts$.next([ACCOUNT])
    mocks.ready$.next(true)
    await settle()
    const startScan = vi.spyOn(scanner, "startScan")

    await scanner.startScan({
      networkIds: [BITTENSOR.id, BASE.id],
      addresses: [ACCOUNT.address],
      withApi: false,
    })
    await vi.waitFor(async () => expect(await activeNetworks.get(BITTENSOR.id)).toBe(true))
    expect(await activeTokens.get(BITTENSOR.nativeTokenId)).toBe(true)
    expect(await scanStore.get("currentScanScope")).not.toBeNull()
    expect(startScan).toHaveBeenCalledTimes(1)

    await activeNetworks.setActive(BITTENSOR.id, false)
    await activeTokens.setActive(BITTENSOR.nativeTokenId, false)
    baseBalance.resolve(0n)
    await vi.waitFor(async () => expect(await scanStore.get("currentScanScope")).toBeNull())
    await settle()
    expect(await activeNetworks.get(BITTENSOR.id)).toBe(false)
    expect(await activeTokens.get(BITTENSOR.nativeTokenId)).toBe(false)
    expect(await db.assetDiscovery.count()).toBe(0)

    await activeNetworks.setActive(BITTENSOR.id, true)
    await vi.waitFor(() => expect(startScan).toHaveBeenCalledTimes(2))
    expect(startScan).toHaveBeenLastCalledWith({
      networkIds: [BITTENSOR.id],
      addresses: [ACCOUNT.address],
      withApi: false,
    })
    await settle()
  })

  it("waits for chain data after an account is imported and scans once it arrives", async () => {
    mocks.ready$.next(true)
    await settle()
    mocks.accounts$.next([ACCOUNT])
    await vi.advanceTimersByTimeAsync(11_000)
    expect(mocks.getClient).not.toHaveBeenCalled()

    loadNetworks([BITTENSOR])
    await vi.waitFor(async () => expect(await activeNetworks.get(BITTENSOR.id)).toBe(true))
    await settle()
    expect(mocks.getClient).toHaveBeenCalledWith(BITTENSOR.id)
    expect(await scanStore.get("queue")).toEqual([])
  })

  it("waits for chain data on startup with an existing account", async () => {
    mocks.accounts$.next([ACCOUNT])
    mocks.ready$.next(true)
    await vi.advanceTimersByTimeAsync(11_000)
    expect(mocks.getClient).not.toHaveBeenCalled()

    loadNetworks([BITTENSOR])
    await vi.waitFor(async () => expect(await activeNetworks.get(BITTENSOR.id)).toBe(true))
    await settle()
    expect(mocks.getClient).toHaveBeenCalledTimes(1)
  })

  it("does not force scan an explicitly disabled network on startup", async () => {
    mocks.accounts$.next([ACCOUNT])
    mocks.ready$.next(true)
    await vi.advanceTimersByTimeAsync(11_000)
    await activeNetworks.setActive(BITTENSOR.id, false)
    loadNetworks([BITTENSOR])
    await settle()
    expect(mocks.getClient).not.toHaveBeenCalled()
    expect(await activeNetworks.get(BITTENSOR.id)).toBe(false)
  })

  it("leaves a network disabled when its balance is zero", async () => {
    loadNetworks([BITTENSOR])
    mocks.getClient.mockResolvedValue({ getBalance: async () => 0n })
    await scanner.startScan({
      networkIds: [BITTENSOR.id],
      addresses: [ACCOUNT.address],
      withApi: false,
    })
    await settle()
    expect(await activeNetworks.get(BITTENSOR.id)).toBeUndefined()
    expect(await activeTokens.get(BITTENSOR.nativeTokenId)).toBeUndefined()
    expect(await scanStore.get("currentScanScope")).toBeNull()
  })

  it("retries persisted discoveries when resuming a scan", async () => {
    loadNetworks([BITTENSOR, BASE])
    const baseBalance = Promise.withResolvers<bigint>()
    mocks.getClient.mockResolvedValue({ getBalance: () => baseBalance.promise })
    await scanStore.mutate((state) => ({
      ...state,
      currentScanScope: {
        networkIds: [BITTENSOR.id, BASE.id],
        addresses: [ACCOUNT.address],
        withApi: false,
      },
      currentScanCursors: {
        [BITTENSOR.id]: { tokenId: BITTENSOR.nativeTokenId, address: ACCOUNT.address },
      },
    }))
    await db.assetDiscovery.put({
      id: "pending",
      tokenId: BITTENSOR.nativeTokenId,
      address: ACCOUNT.address,
      balance: "1",
    })
    await vi.advanceTimersByTimeAsync(5_000)
    await vi.waitFor(async () => expect(await activeNetworks.get(BITTENSOR.id)).toBe(true))
    await settle()
    expect(await db.assetDiscovery.count()).toBe(0)
    expect(await scanStore.get("currentScanScope")).not.toBeNull()
    baseBalance.resolve(0n)
    await settle()
  })
})
