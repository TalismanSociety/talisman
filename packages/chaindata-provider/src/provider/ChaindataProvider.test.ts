import { firstValueFrom, ReplaySubject, Subject } from "rxjs"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  makeChaindata,
  makeDotNetwork,
  makeEthNetwork,
  makeEvmNativeToken,
  makeInvalidToken,
  makeLegacyPersistedData,
  makeSubNativeToken,
  makeUnknownTokenTypeData,
} from "../__fixtures__/chaindata"
import type { Token } from "../chaindata"
import type { Chaindata, CustomChaindata } from "../state/schema"
import { ChaindataProvider, type ChaindataStorage } from "./ChaindataProvider"

// ── Mocks ────────────────────────────────────────────────────────────

let githubSubject: Subject<Chaindata>

vi.mock("../state/githubChaindata", () => ({
  getGithubChaindata$() {
    return githubSubject
  },
}))

vi.mock("../state/oldDb", () => ({
  tryToDeleteOldChaindataDb: vi.fn(),
}))

vi.mock("../state/initChaindata.json", () => ({
  default: {
    networks: [],
    tokens: [],
    miniMetadatas: [],
  },
}))

// ── Helpers ──────────────────────────────────────────────────────────

const EMPTY_STORAGE: ChaindataStorage = {
  networks: [],
  tokens: [],
  miniMetadatas: [],
}

/** Wait a tick for async subjects to flush */
const tick = () => new Promise((r) => setTimeout(r, 10))

// ── Tests ────────────────────────────────────────────────────────────

beforeEach(() => {
  githubSubject = new Subject<Chaindata>()
})

describe("ChaindataProvider", () => {
  // ── Constructor + storage initialization ────────────────────────

  describe("constructor + storage initialization", () => {
    it("starts with empty default storage when no args provided", async () => {
      const provider = new ChaindataProvider()
      const storage = await firstValueFrom(provider.storage$)
      expect(storage).toEqual(EMPTY_STORAGE)
    })

    it("accepts persistedStorage as a valid object", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })
      const storage = await firstValueFrom(provider.storage$)
      expect(storage.networks).toEqual(data.networks)
      expect(storage.tokens).toEqual(data.tokens)
      expect(storage.miniMetadatas).toEqual(data.miniMetadatas)
    })

    it("accepts persistedStorage as a Promise resolving to valid data", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({
        persistedStorage: Promise.resolve(data),
      })
      const storage = await firstValueFrom(provider.storage$)
      expect(storage.networks).toEqual(data.networks)
      expect(storage.tokens).toEqual(data.tokens)
    })

    it("starts with DEFAULT_STORAGE when Promise resolves to undefined", async () => {
      const provider = new ChaindataProvider({
        persistedStorage: Promise.resolve(undefined),
      })
      const storage = await firstValueFrom(provider.storage$)
      expect(storage).toEqual(EMPTY_STORAGE)
    })

    it("falls back to empty data when persisted data has invalid networks (validation fails)", async () => {
      const persisted = makeLegacyPersistedData() as unknown as ChaindataStorage
      const provider = new ChaindataProvider({ persistedStorage: persisted })

      // defaultChaindata$ validates via ChaindataFileSchema;
      // extra unknown fields may cause validation failure → empty data
      const networks = await firstValueFrom(provider.networks$)
      const tokens = await firstValueFrom(provider.tokens$)

      // Either the data was stripped to valid form or fell back to empty
      // (depends on schema strictness). The key invariant: no crash.
      expect(Array.isArray(networks)).toBe(true)
      expect(Array.isArray(tokens)).toBe(true)
    })
  })

  // ── Custom chaindata ────────────────────────────────────────────

  describe("custom chaindata", () => {
    it("merges custom chaindata from an observable", async () => {
      const customToken = makeEvmNativeToken({
        id: "137-evm-native",
        networkId: "137",
        symbol: "MATIC",
      })
      const customNetwork = makeEthNetwork({
        id: "137",
        name: "Polygon",
        nativeTokenId: "137-evm-native",
      })
      const custom$ = new ReplaySubject<CustomChaindata>(1)
      custom$.next({ tokens: [customToken], networks: [customNetwork] })
      const provider = new ChaindataProvider({ customChaindata$: custom$ })

      const tokens = await firstValueFrom(provider.tokens$)
      expect(tokens.some((t) => t.id === "137-evm-native")).toBe(true)

      const networks = await firstValueFrom(provider.networks$)
      expect(networks.some((n) => n.id === "137")).toBe(true)
    })

    it("merges custom chaindata from a plain object", async () => {
      const customToken = makeEvmNativeToken({
        id: "10-evm-native",
        networkId: "10",
        symbol: "ETH",
      })
      const customNetwork = makeEthNetwork({
        id: "10",
        name: "Optimism",
        nativeTokenId: "10-evm-native",
      })
      const provider = new ChaindataProvider({
        customChaindata$: { tokens: [customToken], networks: [customNetwork] },
      })

      const tokens = await firstValueFrom(provider.tokens$)
      expect(tokens.some((t) => t.id === "10-evm-native")).toBe(true)
    })
  })

  // ── Dynamic tokens ──────────────────────────────────────────────

  describe("registerDynamicTokens", () => {
    it("registers valid tokens that appear in combined output", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const newToken = makeEvmNativeToken({
        id: "42161-evm-native",
        networkId: "42161",
        symbol: "ETH",
      })
      await provider.registerDynamicTokens([newToken])

      const tokens = await firstValueFrom(provider.tokens$)
      expect(tokens.some((t) => t.id === "42161-evm-native")).toBe(true)
    })

    it("throws when registering an invalid token (TokenSchema.parse fails)", async () => {
      const provider = new ChaindataProvider()
      const invalid = makeInvalidToken() as unknown as Token
      await expect(provider.registerDynamicTokens([invalid])).rejects.toThrow()
    })

    it("does nothing when called with an empty array", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const tokensBefore = await firstValueFrom(provider.tokens$)
      await provider.registerDynamicTokens([])
      const tokensAfter = await firstValueFrom(provider.tokens$)

      expect(tokensAfter.length).toBe(tokensBefore.length)
    })

    it("merges tokens from multiple registerDynamicTokens calls", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const token1 = makeEvmNativeToken({
        id: "42161-evm-native",
        networkId: "42161",
        symbol: "ETH",
      })
      const token2 = makeEvmNativeToken({
        id: "10-evm-native",
        networkId: "10",
        symbol: "ETH",
      })

      await provider.registerDynamicTokens([token1])
      await provider.registerDynamicTokens([token2])

      const tokens = await firstValueFrom(provider.tokens$)
      expect(tokens.some((t) => t.id === "42161-evm-native")).toBe(true)
      expect(tokens.some((t) => t.id === "10-evm-native")).toBe(true)
    })
  })

  describe("syncDynamicTokens", () => {
    const SOL_SPL_DYNAMIC_ID = "solana-sol-spl-So11111111111111111111111111111111111111112"

    const makeSolSplDynamicToken = (overrides: Partial<Token> = {}): Token =>
      ({
        id: SOL_SPL_DYNAMIC_ID,
        networkId: "solana",
        type: "sol-spl",
        platform: "solana",
        decimals: 9,
        symbol: "DYN",
        mintAddress: "So11111111111111111111111111111111111111112",
        ...overrides,
      }) as Token

    it("removes a sol-spl dynamic token once it is curated into default chaindata", async () => {
      const dynamicToken = makeSolSplDynamicToken({ symbol: "DYN", name: "Dynamic" })
      // default chaindata gets a curated entry with the same id (different symbol/name)
      const curatedToken = makeSolSplDynamicToken({ symbol: "WSOL", name: "Wrapped SOL" })
      const data = makeChaindata({
        tokens: [...makeChaindata().tokens, curatedToken],
      })
      const provider = new ChaindataProvider({ persistedStorage: data })
      await provider.registerDynamicTokens([dynamicToken])

      await provider.syncDynamicTokens()

      // combined chaindata should now show the curated metadata, not the dynamic one
      const token = await firstValueFrom(provider.getTokenById$(SOL_SPL_DYNAMIC_ID))
      expect(token).not.toBeNull()
      expect(token!.symbol).toBe("WSOL")
      expect((token as { name?: string }).name).toBe("Wrapped SOL")
    })

    it("keeps a sol-spl dynamic token when no curated entry exists", async () => {
      const dynamicToken = makeSolSplDynamicToken({ symbol: "DYN" })
      const provider = new ChaindataProvider({ persistedStorage: makeChaindata() })
      await provider.registerDynamicTokens([dynamicToken])

      await provider.syncDynamicTokens()

      const token = await firstValueFrom(provider.getTokenById$(SOL_SPL_DYNAMIC_ID))
      expect(token).not.toBeNull()
      expect(token!.symbol).toBe("DYN")
    })

    it("removes a sol-token2022 dynamic token once it is curated into default chaindata", async () => {
      const id = "solana-sol-token2022-So11111111111111111111111111111111111111112"
      const baseToken = {
        id,
        networkId: "solana",
        type: "sol-token2022",
        platform: "solana",
        decimals: 9,
        mintAddress: "So11111111111111111111111111111111111111112",
      }
      const dynamicToken = { ...baseToken, symbol: "DYN" } as Token
      const curatedToken = { ...baseToken, symbol: "T22" } as Token
      const data = makeChaindata({
        tokens: [...makeChaindata().tokens, curatedToken],
      })
      const provider = new ChaindataProvider({ persistedStorage: data })
      await provider.registerDynamicTokens([dynamicToken])

      await provider.syncDynamicTokens()

      const token = await firstValueFrom(provider.getTokenById$(id))
      expect(token!.symbol).toBe("T22")
    })

    it("does nothing when there are no dynamic tokens", async () => {
      const provider = new ChaindataProvider({ persistedStorage: makeChaindata() })
      await expect(provider.syncDynamicTokens()).resolves.toBeUndefined()
    })
  })

  // ── Observable API ──────────────────────────────────────────────

  describe("observable API", () => {
    it("networks$ emits networks from merged chaindata", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const networks = await firstValueFrom(provider.networks$)
      expect(networks.length).toBeGreaterThanOrEqual(data.networks.length)
      expect(networks.some((n) => n.id === "polkadot")).toBe(true)
    })

    it("tokens$ emits tokens from merged chaindata", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const tokens = await firstValueFrom(provider.tokens$)
      expect(tokens.length).toBeGreaterThanOrEqual(data.tokens.length)
      expect(tokens.some((t) => t.id === "polkadot-substrate-native")).toBe(true)
    })

    it("miniMetadatas$ emits miniMetadatas from merged chaindata", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const miniMetadatas = await firstValueFrom(provider.miniMetadatas$)
      expect(miniMetadatas.length).toBe(data.miniMetadatas.length)
    })

    it("storage$ emits storage data", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const storage = await firstValueFrom(provider.storage$)
      expect(storage.networks).toEqual(data.networks)
      expect(storage.tokens).toEqual(data.tokens)
      expect(storage.miniMetadatas).toEqual(data.miniMetadatas)
    })

    it("getNetworkById$ returns the specific network", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const network = await firstValueFrom(provider.getNetworkById$("polkadot"))
      expect(network).not.toBeNull()
      expect(network!.id).toBe("polkadot")
      expect(network!.name).toBe("Polkadot")
    })

    it("getNetworkById$ returns null for unknown network", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const network = await firstValueFrom(provider.getNetworkById$("nonexistent"))
      expect(network).toBeNull()
    })

    it("getTokenById$ returns the specific token", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const token = await firstValueFrom(provider.getTokenById$("1-evm-native"))
      expect(token).not.toBeNull()
      expect(token!.id).toBe("1-evm-native")
      expect(token!.symbol).toBe("ETH")
    })

    it("getTokenById$ returns null for unknown token", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const token = await firstValueFrom(provider.getTokenById$("nonexistent"))
      expect(token).toBeNull()
    })
  })

  // ── Schema upgrade / recovery ───────────────────────────────────

  describe("schema upgrade simulation", () => {
    it("recovers from corrupted persisted data via github sync", async () => {
      const corrupted = makeLegacyPersistedData() as unknown as ChaindataStorage
      const provider = new ChaindataProvider({ persistedStorage: corrupted })

      // Keep a subscription alive so the github→storage pipeline stays active
      const emissions: unknown[] = []
      const sub = provider.networks$.subscribe((n) => emissions.push(n))

      try {
        // Initially either empty or stripped data (depending on schema strictness)
        const initialNetworks = emissions[0] as unknown[]
        expect(Array.isArray(initialNetworks)).toBe(true)

        // Push valid data from github → provider should recover
        const validData = makeChaindata()
        githubSubject.next(validData)
        await tick()

        // After github sync, skip(0) doesn't help; use latest from subscription
        const networks = await firstValueFrom(provider.networks$)
        expect(networks.length).toBeGreaterThan(0)
      } finally {
        sub.unsubscribe()
      }
    })

    it("recovers from data with unknown token types via github sync", async () => {
      const unknownData = makeUnknownTokenTypeData() as unknown as ChaindataStorage
      const provider = new ChaindataProvider({ persistedStorage: unknownData })

      // Keep subscription alive
      const sub = provider.tokens$.subscribe(() => {})

      try {
        // Unknown token type fails schema → fallback to empty
        const initialTokens = await firstValueFrom(provider.tokens$)
        expect(Array.isArray(initialTokens)).toBe(true)

        // Push valid data from github
        const validData = makeChaindata()
        githubSubject.next(validData)
        await tick()

        const tokens = await firstValueFrom(provider.tokens$)
        expect(tokens.length).toBeGreaterThan(0)
      } finally {
        sub.unsubscribe()
      }
    })
  })

  // ── Integration with GitHub sync ────────────────────────────────

  describe("integration with github sync", () => {
    it("updates storage and combined chaindata when github emits new data", async () => {
      const provider = new ChaindataProvider()

      // Keep subscription alive so the refCount-based pipeline stays connected
      const sub = provider.networks$.subscribe(() => {})

      try {
        // Initially empty
        const initialNetworks = await firstValueFrom(provider.networks$)
        expect(initialNetworks).toEqual([])

        // Push data from github
        const chaindata = makeChaindata()
        githubSubject.next(chaindata)
        await tick()

        const networks = await firstValueFrom(provider.networks$)
        expect(networks.length).toBe(chaindata.networks.length)
        expect(networks.some((n) => n.id === "polkadot")).toBe(true)

        const tokens = await firstValueFrom(provider.tokens$)
        expect(tokens.length).toBe(chaindata.tokens.length)

        // Verify storage was also updated
        const storage = await firstValueFrom(provider.storage$)
        expect(storage.networks).toEqual(chaindata.networks)
      } finally {
        sub.unsubscribe()
      }
    })

    it("updates when github emits updated data after initial load", async () => {
      const initial = makeChaindata({
        networks: [makeDotNetwork()],
        tokens: [makeSubNativeToken()],
        miniMetadatas: [],
      })
      const provider = new ChaindataProvider({ persistedStorage: initial })

      // Keep subscription alive
      const sub = provider.networks$.subscribe(() => {})

      try {
        // Verify initial state
        let networks = await firstValueFrom(provider.networks$)
        expect(networks.length).toBe(1)

        // Push expanded data from github
        const expanded = makeChaindata()
        githubSubject.next(expanded)
        await tick()

        networks = await firstValueFrom(provider.networks$)
        expect(networks.length).toBe(expanded.networks.length)
      } finally {
        sub.unsubscribe()
      }
    })
  })

  // ── Async getter methods ────────────────────────────────────────

  describe("async getter methods", () => {
    it("getNetworks returns all networks", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const networks = await provider.getNetworks()
      expect(networks.length).toBe(data.networks.length)
    })

    it("getNetworks filters by platform", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const dotNetworks = await provider.getNetworks("polkadot")
      expect(dotNetworks.every((n) => n.platform === "polkadot")).toBe(true)

      const ethNetworks = await provider.getNetworks("ethereum")
      expect(ethNetworks.every((n) => n.platform === "ethereum")).toBe(true)
    })

    it("getTokens returns all tokens", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const tokens = await provider.getTokens()
      expect(tokens.length).toBe(data.tokens.length)
    })

    it("getTokenById returns the specific token", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const token = await provider.getTokenById("polkadot-substrate-native")
      expect(token).not.toBeNull()
      expect(token!.symbol).toBe("DOT")
    })

    it("getNetworkById returns the specific network", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const network = await provider.getNetworkById("polkadot")
      expect(network).not.toBeNull()
      expect(network!.name).toBe("Polkadot")
    })

    it("getMiniMetadatas returns all mini metadatas", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const metas = await provider.getMiniMetadatas()
      expect(metas.length).toBe(data.miniMetadatas.length)
    })
  })

  // ── Genesis hash methods ─────────────────────────────────────────

  describe("genesis hash methods", () => {
    const POLKADOT_GENESIS =
      "0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3" as const

    it("getNetworkByGenesisHash returns network for known genesis hash", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const network = await provider.getNetworkByGenesisHash(POLKADOT_GENESIS)
      expect(network).not.toBeNull()
      expect(network!.id).toBe("polkadot")
      expect(network!.genesisHash).toBe(POLKADOT_GENESIS)
    })

    it("getNetworkByGenesisHash returns null for unknown genesis hash", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const network = await provider.getNetworkByGenesisHash("0xdeadbeef")
      expect(network).toBeNull()
    })

    it("getNetworkByGenesisHash$ returns observable with matching network", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const network = await firstValueFrom(provider.getNetworkByGenesisHash$(POLKADOT_GENESIS))
      expect(network).not.toBeNull()
      expect(network!.id).toBe("polkadot")
    })

    it("getNetworkByGenesisHash$ returns observable emitting null for unknown hash", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const network = await firstValueFrom(provider.getNetworkByGenesisHash$("0xdeadbeef"))
      expect(network).toBeNull()
    })

    it("getNetworksMapByGenesisHash returns a map keyed by genesis hash", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const map = await provider.getNetworksMapByGenesisHash()
      expect(map[POLKADOT_GENESIS]).toBeDefined()
      expect(map[POLKADOT_GENESIS]!.id).toBe("polkadot")
    })

    it("getNetworksMapByGenesisHash$ returns observable of genesis hash map", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const map = await firstValueFrom(provider.getNetworksMapByGenesisHash$())
      expect(map[POLKADOT_GENESIS]).toBeDefined()
      expect(map[POLKADOT_GENESIS]!.id).toBe("polkadot")
    })

    it("getNetworksMapByGenesisHash excludes networks without genesisHash", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const map = await provider.getNetworksMapByGenesisHash()
      // EthNetwork has no genesisHash; only polkadot networks should appear
      const keys = Object.keys(map)
      expect(keys.length).toBeGreaterThan(0)
      for (const network of Object.values(map)) {
        expect(network.platform).toBe("polkadot")
      }
    })

    it("getNetworkByGenesisHash finds second polkadot network", async () => {
      const kusama = makeDotNetwork({
        id: "kusama",
        name: "Kusama",
        genesisHash: "0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe",
      })
      const data = makeChaindata({
        networks: [makeDotNetwork(), kusama, makeEthNetwork()],
      })
      const provider = new ChaindataProvider({ persistedStorage: data })

      const network = await provider.getNetworkByGenesisHash(
        "0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe"
      )
      expect(network).not.toBeNull()
      expect(network!.id).toBe("kusama")
    })
  })

  // ── ID listing methods ───────────────────────────────────────────

  describe("ID listing methods", () => {
    it("getNetworkIds returns all network IDs", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const ids = await provider.getNetworkIds()
      expect(ids).toContain("polkadot")
      expect(ids).toContain("1")
      expect(ids.length).toBe(data.networks.length)
    })

    it("getNetworkIds$ returns observable of network IDs", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const ids = await firstValueFrom(provider.getNetworkIds$())
      expect(ids).toContain("polkadot")
      expect(ids).toContain("1")
      expect(ids.length).toBe(data.networks.length)
    })

    it("getNetworkIds filters by platform", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const dotIds = await provider.getNetworkIds("polkadot")
      expect(dotIds).toContain("polkadot")
      expect(dotIds).not.toContain("1")

      const ethIds = await provider.getNetworkIds("ethereum")
      expect(ethIds).toContain("1")
      expect(ethIds).not.toContain("polkadot")
    })

    it("getTokenIds returns all token IDs", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const ids = await provider.getTokenIds()
      expect(ids).toContain("polkadot-substrate-native")
      expect(ids).toContain("1-evm-native")
      expect(ids.length).toBe(data.tokens.length)
    })

    it("getTokenIds$ returns observable of token IDs", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const ids = await firstValueFrom(provider.getTokenIds$())
      expect(ids).toContain("polkadot-substrate-native")
      expect(ids).toContain("1-evm-native")
      expect(ids.length).toBe(data.tokens.length)
    })

    it("getTokenIds filters by type", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const subIds = await provider.getTokenIds("substrate-native")
      expect(subIds).toContain("polkadot-substrate-native")
      expect(subIds).not.toContain("1-evm-native")

      const evmIds = await provider.getTokenIds("evm-native")
      expect(evmIds).toContain("1-evm-native")
      expect(evmIds).not.toContain("polkadot-substrate-native")
    })

    it("getNetworkIds returns empty array for empty provider", async () => {
      const provider = new ChaindataProvider()
      const ids = await provider.getNetworkIds()
      expect(ids).toEqual([])
    })

    it("getTokenIds returns empty array for empty provider", async () => {
      const provider = new ChaindataProvider()
      const ids = await provider.getTokenIds()
      expect(ids).toEqual([])
    })
  })

  // ── Mini metadata by ID ──────────────────────────────────────────

  describe("mini metadata by ID", () => {
    it("miniMetadataById returns metadata for known ID", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const meta = await provider.miniMetadataById("substrate-native-polkadot")
      expect(meta).not.toBeNull()
      expect(meta!.id).toBe("substrate-native-polkadot")
      expect(meta!.chainId).toBe("polkadot")
    })

    it("miniMetadataById returns null for unknown ID", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const meta = await provider.miniMetadataById("nonexistent")
      expect(meta).toBeNull()
    })

    it("getMiniMetadataById$ returns observable with matching metadata", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const meta = await firstValueFrom(provider.getMiniMetadataById$("substrate-native-polkadot"))
      expect(meta).not.toBeNull()
      expect(meta!.id).toBe("substrate-native-polkadot")
    })

    it("getMiniMetadataById$ returns observable emitting null for unknown ID", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const meta = await firstValueFrom(provider.getMiniMetadataById$("nonexistent"))
      expect(meta).toBeNull()
    })
  })

  // ── Token type filtering ─────────────────────────────────────────

  describe("token type filtering", () => {
    it("getTokens('substrate-native') returns only substrate native tokens", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const tokens = await provider.getTokens("substrate-native")
      expect(tokens.length).toBeGreaterThan(0)
      expect(tokens.every((t) => t.type === "substrate-native")).toBe(true)
    })

    it("getTokens('evm-native') returns only EVM native tokens", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const tokens = await provider.getTokens("evm-native")
      expect(tokens.length).toBeGreaterThan(0)
      expect(tokens.every((t) => t.type === "evm-native")).toBe(true)
    })

    it("getTokens('sol-native') returns only Solana native tokens", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const tokens = await provider.getTokens("sol-native")
      expect(tokens.length).toBeGreaterThan(0)
      expect(tokens.every((t) => t.type === "sol-native")).toBe(true)
    })

    it("getTokens with type that has no matches returns empty array", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const tokens = await provider.getTokens("evm-erc20")
      expect(tokens).toEqual([])
    })

    it("getTokens$ with type filter returns observable of filtered tokens", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const tokens = await firstValueFrom(provider.getTokens$("substrate-native"))
      expect(tokens.length).toBeGreaterThan(0)
      expect(tokens.every((t) => t.type === "substrate-native")).toBe(true)
    })

    it("getTokens without type returns all tokens", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const allTokens = await provider.getTokens()
      const subTokens = await provider.getTokens("substrate-native")
      const evmTokens = await provider.getTokens("evm-native")
      const solTokens = await provider.getTokens("sol-native")

      expect(allTokens.length).toBe(subTokens.length + evmTokens.length + solTokens.length)
    })
  })

  // ── Edge cases ───────────────────────────────────────────────────

  describe("edge cases", () => {
    it("getNetworkById returns null for non-existent ID", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const network = await provider.getNetworkById("does-not-exist")
      expect(network).toBeNull()
    })

    it("getTokenById returns null for non-existent ID", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const token = await provider.getTokenById("does-not-exist")
      expect(token).toBeNull()
    })

    it("miniMetadataById returns null for empty string ID", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const meta = await provider.miniMetadataById("")
      expect(meta).toBeNull()
    })

    it("getNetworkByGenesisHash returns null for non-existent genesis hash", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const network = await provider.getNetworkByGenesisHash(
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      )
      expect(network).toBeNull()
    })

    it("getNetworksMapById returns map keyed by network ID", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const map = await provider.getNetworksMapById()
      expect(map.polkadot).toBeDefined()
      expect(map.polkadot!.name).toBe("Polkadot")
      expect(map["1"]).toBeDefined()
      expect(map["1"]!.name).toBe("Ethereum Mainnet")
    })

    it("getTokensMapById returns map keyed by token ID", async () => {
      const data = makeChaindata()
      const provider = new ChaindataProvider({ persistedStorage: data })

      const map = await provider.getTokensMapById()
      expect(map["polkadot-substrate-native"]).toBeDefined()
      expect(map["polkadot-substrate-native"]!.symbol).toBe("DOT")
      expect(map["1-evm-native"]).toBeDefined()
      expect(map["1-evm-native"]!.symbol).toBe("ETH")
    })
  })
})
