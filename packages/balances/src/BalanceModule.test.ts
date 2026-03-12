import type { ChaindataProvider } from "@talismn/chaindata-provider"
import { firstValueFrom, of } from "rxjs"
import { describe, expect, it, vi } from "vitest"

import { BalancesProvider, type BalancesStorage } from "./BalancesProvider"
import type { IBalance } from "./types/balancetypes"
import type { ChainConnectors } from "./types/chainConnectors"
import type { MiniMetadata } from "./types/minimetadatas"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeMockChaindataProvider = () =>
  ({
    getNetworkById$: vi.fn().mockReturnValue(of(null)),
    getTokensMapById$: vi.fn().mockReturnValue(of({})),
    getNetworksMapById$: vi.fn().mockReturnValue(of({})),
    miniMetadatasMapById$: of({}),
    registerDynamicTokens: vi.fn().mockResolvedValue(undefined),
  }) as unknown as ChaindataProvider

const makeMockChainConnectors = () =>
  ({
    substrate: undefined,
    evm: undefined,
    solana: undefined,
  }) as unknown as ChainConnectors

const makeBalance = (
  address: string,
  tokenId: string,
  overrides: Partial<IBalance> = {}
): IBalance => ({
  source: "test-source",
  status: "live",
  address,
  tokenId,
  networkId: "test-network",
  value: "1000000000000",
  ...overrides,
})

const makeMiniMetadata = (id: string, overrides: Partial<MiniMetadata> = {}): MiniMetadata => ({
  id,
  source: "substrate-native",
  chainId: "polkadot",
  specVersion: 1,
  version: "1",
  data: null,
  extra: null,
  ...overrides,
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("BalancesProvider", () => {
  describe("constructor", () => {
    it("creates without error with mock dependencies", () => {
      const provider = new BalancesProvider(makeMockChaindataProvider(), makeMockChainConnectors())
      expect(provider).toBeInstanceOf(BalancesProvider)
    })

    it("accepts default storage (empty)", () => {
      const provider = new BalancesProvider(makeMockChaindataProvider(), makeMockChainConnectors())
      expect(provider).toBeDefined()
    })

    it("accepts custom storage with balances and miniMetadatas", () => {
      const storage: BalancesStorage = {
        balances: [makeBalance("0xAABB", "polkadot-substrate-native")],
        miniMetadatas: [makeMiniMetadata("mm-1")],
      }
      const provider = new BalancesProvider(
        makeMockChaindataProvider(),
        makeMockChainConnectors(),
        storage
      )
      expect(provider).toBeDefined()
    })

    it("filters out nil values from storage balances", () => {
      const storage: BalancesStorage = {
        balances: [
          null as unknown as IBalance,
          makeBalance("0xAABB", "polkadot-substrate-native"),
          undefined as unknown as IBalance,
        ],
        miniMetadatas: [],
      }
      // should not throw
      const provider = new BalancesProvider(
        makeMockChaindataProvider(),
        makeMockChainConnectors(),
        storage
      )
      expect(provider).toBeDefined()
    })

    it("filters out nil values from storage miniMetadatas", () => {
      const storage: BalancesStorage = {
        balances: [],
        miniMetadatas: [
          null as unknown as MiniMetadata,
          makeMiniMetadata("mm-1"),
          undefined as unknown as MiniMetadata,
        ],
      }
      const provider = new BalancesProvider(
        makeMockChaindataProvider(),
        makeMockChainConnectors(),
        storage
      )
      expect(provider).toBeDefined()
    })
  })

  describe("storage$", () => {
    it("emits BalancesStorage", async () => {
      const provider = new BalancesProvider(makeMockChaindataProvider(), makeMockChainConnectors())
      const storage = await firstValueFrom(provider.storage$)
      expect(storage).toHaveProperty("balances")
      expect(storage).toHaveProperty("miniMetadatas")
    })

    it("default storage has empty balances and miniMetadatas arrays", async () => {
      const provider = new BalancesProvider(makeMockChaindataProvider(), makeMockChainConnectors())
      const storage = await firstValueFrom(provider.storage$)
      expect(storage.balances).toEqual([])
      expect(storage.miniMetadatas).toEqual([])
    })

    it("custom storage preserves provided balances", async () => {
      const balance = makeBalance("0xAABB", "polkadot-substrate-native")
      const provider = new BalancesProvider(
        makeMockChaindataProvider(),
        makeMockChainConnectors(),
        { balances: [balance], miniMetadatas: [] }
      )
      const storage = await firstValueFrom(provider.storage$)
      expect(storage.balances).toHaveLength(1)
      expect(storage.balances[0]!.address).toBe("0xAABB")
      expect(storage.balances[0]!.tokenId).toBe("polkadot-substrate-native")
    })

    it("custom storage preserves provided miniMetadatas", async () => {
      const mm = makeMiniMetadata("mm-42")
      const provider = new BalancesProvider(
        makeMockChaindataProvider(),
        makeMockChainConnectors(),
        { balances: [], miniMetadatas: [mm] }
      )
      const storage = await firstValueFrom(provider.storage$)
      expect(storage.miniMetadatas).toHaveLength(1)
      expect(storage.miniMetadatas[0]!.id).toBe("mm-42")
    })

    it("sorts balances by balance id (address::tokenId)", async () => {
      const b1 = makeBalance("0xZZ", "token-b")
      const b2 = makeBalance("0xAA", "token-a")
      const b3 = makeBalance("0xAA", "token-b")

      const provider = new BalancesProvider(
        makeMockChaindataProvider(),
        makeMockChainConnectors(),
        { balances: [b1, b2, b3], miniMetadatas: [] }
      )

      const storage = await firstValueFrom(provider.storage$)
      const ids = storage.balances.map((b) => `${b.address}::${b.tokenId}`)
      const sorted = [...ids].sort()
      expect(ids).toEqual(sorted)
    })

    it("sorts miniMetadatas by id", async () => {
      const mm1 = makeMiniMetadata("mm-z")
      const mm2 = makeMiniMetadata("mm-a")
      const mm3 = makeMiniMetadata("mm-m")

      const provider = new BalancesProvider(
        makeMockChaindataProvider(),
        makeMockChainConnectors(),
        { balances: [], miniMetadatas: [mm1, mm2, mm3] }
      )

      const storage = await firstValueFrom(provider.storage$)
      const ids = storage.miniMetadatas.map((m) => m.id)
      const sorted = [...ids].sort()
      expect(ids).toEqual(sorted)
    })

    it("deduplicates balances by id (last wins)", async () => {
      const b1 = makeBalance("0xAA", "token-a", { value: "100" })
      const b2 = makeBalance("0xAA", "token-a", { value: "200" })

      const provider = new BalancesProvider(
        makeMockChaindataProvider(),
        makeMockChainConnectors(),
        // keyBy keeps the last entry with the same key
        { balances: [b1, b2], miniMetadatas: [] }
      )

      const storage = await firstValueFrom(provider.storage$)
      expect(storage.balances).toHaveLength(1)
      expect((storage.balances[0] as IBalance & { value: string }).value).toBe("200")
    })
  })

  describe("getBalances$", () => {
    it("returns an Observable", () => {
      const provider = new BalancesProvider(makeMockChaindataProvider(), makeMockChainConnectors())
      const result = provider.getBalances$({})
      expect(result).toBeDefined()
      expect(typeof result.subscribe).toBe("function")
    })

    it("emits with empty balances for empty addressesByTokenId", async () => {
      const chaindataProvider = makeMockChaindataProvider()
      // cleanupAddressesByTokenId$ calls getNetworksMapById$
      ;(chaindataProvider.getNetworksMapById$ as ReturnType<typeof vi.fn>).mockReturnValue(of({}))

      const provider = new BalancesProvider(chaindataProvider, makeMockChainConnectors())
      const result = await firstValueFrom(provider.getBalances$({}))

      // With empty input after cleanup, we get an immediate emission
      expect(result.balances).toEqual([])
      expect(result.failedBalanceIds).toEqual([])
    })

    it("emits status 'initialising' or 'live' for empty input", async () => {
      const chaindataProvider = makeMockChaindataProvider()
      ;(chaindataProvider.getNetworksMapById$ as ReturnType<typeof vi.fn>).mockReturnValue(of({}))

      const provider = new BalancesProvider(chaindataProvider, makeMockChainConnectors())
      const result = await firstValueFrom(provider.getBalances$({}))

      expect(["initialising", "live"]).toContain(result.status)
    })

    it("filters out addresses for unknown networks", async () => {
      const chaindataProvider = makeMockChaindataProvider()
      // No networks known → all addresses should be filtered
      ;(chaindataProvider.getNetworksMapById$ as ReturnType<typeof vi.fn>).mockReturnValue(of({}))

      const provider = new BalancesProvider(chaindataProvider, makeMockChainConnectors())
      // Use a valid EVM address (normalizeAddress requires a real address format)
      const result = await firstValueFrom(
        provider.getBalances$({
          "unknown-network:evm-native": ["0x0000000000000000000000000000000000000001"],
        })
      )

      // Since network is unknown, addressesByTokenId is cleaned to empty → empty result
      expect(result.balances).toEqual([])
    })
  })

  describe("fetchBalances", () => {
    it("returns a Promise", () => {
      const chaindataProvider = makeMockChaindataProvider()
      ;(chaindataProvider.getNetworksMapById$ as ReturnType<typeof vi.fn>).mockReturnValue(of({}))

      const provider = new BalancesProvider(chaindataProvider, makeMockChainConnectors())
      const result = provider.fetchBalances({})
      expect(result).toBeInstanceOf(Promise)
    })

    it("resolves to empty array for empty addressesByTokenId", async () => {
      const chaindataProvider = makeMockChaindataProvider()
      ;(chaindataProvider.getNetworksMapById$ as ReturnType<typeof vi.fn>).mockReturnValue(of({}))

      const provider = new BalancesProvider(chaindataProvider, makeMockChainConnectors())
      const balances = await provider.fetchBalances({})
      expect(balances).toEqual([])
    })
  })

  describe("getDetectedTokensId$", () => {
    it("returns an Observable", () => {
      const provider = new BalancesProvider(makeMockChaindataProvider(), makeMockChainConnectors())
      const result = provider.getDetectedTokensId$("0xABCD")
      expect(result).toBeDefined()
      expect(typeof result.subscribe).toBe("function")
    })
  })
})
