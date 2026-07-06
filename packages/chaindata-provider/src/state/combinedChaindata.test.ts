import { firstValueFrom, of, ReplaySubject, take, toArray } from "rxjs"
import { describe, expect, it } from "vitest"
import {
  makeChaindata,
  makeCustomChaindata,
  makeEthNetwork,
  makeEvmNativeToken,
  makeInvalidToken,
  makeMiniMetadata,
  makeSubDTaoToken,
} from "../__fixtures__/chaindata"
import type { Network, Token } from "../chaindata"
import {
  getCleanNetwork,
  getCleanToken,
  getCombinedChaindata$,
  isNetworkCustom,
  isNetworkKnown,
  isTokenCustom,
  isTokenKnown,
  isTokenTestnet,
} from "./combinedChaindata"
import type { Chaindata, CustomChaindata } from "./schema"

// ─── Helpers ───────────────────────────────────────────────────────

/** Emit a combined chaindata and resolve the first value */
const combine = (
  defaultData: Chaindata,
  custom?: CustomChaindata | undefined,
  dynamicTokens: Token[] = []
) => {
  const dynamicTokens$ = new ReplaySubject<Token[]>(1)
  dynamicTokens$.next(dynamicTokens)

  const result$ = getCombinedChaindata$(of(defaultData), custom, dynamicTokens$)
  return firstValueFrom(result$)
}

const findNetwork = (networks: Network[], id: string) =>
  networks.find((n) => n.id === id) as Network & Record<string, unknown>

const findToken = (tokens: Token[], id: string) =>
  tokens.find((t) => t.id === id) as Token & Record<string, unknown>

// ─── Tests ─────────────────────────────────────────────────────────

describe("getCombinedChaindata$", () => {
  // ── Merge correctness ──────────────────────────────────────────

  describe("merge correctness", () => {
    it("marks default-only networks with __isCustom: false, __isKnown: true", async () => {
      const result = await combine(makeChaindata())

      for (const network of result.networks) {
        const n = network as Network & Record<string, unknown>
        expect(n.__isCustom).toBe(false)
        expect(n.__isKnown).toBe(true)
      }
    })

    it("marks default-only tokens with correct flags", async () => {
      const result = await combine(makeChaindata())

      for (const token of result.tokens) {
        const t = token as Token & Record<string, unknown>
        expect(t.__isCustom).toBe(false)
        expect(t.__isKnown).toBe(true)
        expect(typeof t.__isTestnet).toBe("boolean")
      }
    })

    it("custom network overrides default by id — __isCustom: true, __isKnown: true", async () => {
      const customNetwork = makeEthNetwork({ id: "1", name: "My Ethereum" })
      const customToken = makeEvmNativeToken()
      const custom = makeCustomChaindata({
        networks: [customNetwork],
        tokens: [customToken],
      })
      const result = await combine(makeChaindata(), custom)

      const merged = findNetwork(result.networks, "1")
      expect(merged.__isCustom).toBe(true)
      expect(merged.__isKnown).toBe(true)
      expect(merged.name).toBe("My Ethereum")
    })

    it("custom network not in default — __isCustom: true, __isKnown: false", async () => {
      const customNetwork = makeEthNetwork({
        id: "999",
        name: "New Chain",
        nativeTokenId: "999-evm-native",
      })
      const customToken = makeEvmNativeToken({ id: "999-evm-native", networkId: "999" })
      const custom = makeCustomChaindata({
        networks: [customNetwork],
        tokens: [customToken],
      })
      const result = await combine(makeChaindata(), custom)

      const merged = findNetwork(result.networks, "999")
      expect(merged.__isCustom).toBe(true)
      expect(merged.__isKnown).toBe(false)
    })

    it("custom token overrides default by id — __isCustom: true, __isKnown: true", async () => {
      const customToken = makeEvmNativeToken({ id: "1-evm-native", symbol: "WETH" })
      const custom = makeCustomChaindata({ tokens: [customToken] })
      const result = await combine(makeChaindata(), custom)

      const merged = findToken(result.tokens, "1-evm-native")
      expect(merged.__isCustom).toBe(true)
      expect(merged.__isKnown).toBe(true)
      expect(merged.symbol).toBe("WETH")
    })

    it("custom token not in default — __isCustom: true, __isKnown: false", async () => {
      const customToken = makeEvmNativeToken({
        id: "999-evm-native",
        networkId: "1",
        symbol: "NEW",
      })
      const custom = makeCustomChaindata({ tokens: [customToken] })
      const result = await combine(makeChaindata(), custom)

      const merged = findToken(result.tokens, "999-evm-native")
      expect(merged.__isCustom).toBe(true)
      expect(merged.__isKnown).toBe(false)
    })

    it("token on testnet network gets __isTestnet: true", async () => {
      const testnetNetwork = makeEthNetwork({
        id: "5",
        isTestnet: true,
        nativeTokenId: "5-evm-native",
      })
      const testnetToken = makeEvmNativeToken({ id: "5-evm-native", networkId: "5" })
      const data = makeChaindata({
        networks: [testnetNetwork],
        tokens: [testnetToken],
      })
      const result = await combine(data)

      const merged = findToken(result.tokens, "5-evm-native")
      expect(merged.__isTestnet).toBe(true)
    })

    it("token on non-testnet network gets __isTestnet: false", async () => {
      const result = await combine(makeChaindata())

      const merged = findToken(result.tokens, "1-evm-native")
      expect(merged.__isTestnet).toBe(false)
    })

    it("miniMetadatas come from default only", async () => {
      const miniMeta = makeMiniMetadata()
      const data = makeChaindata({ miniMetadatas: [miniMeta] })
      const custom = makeCustomChaindata({ tokens: [] })
      const result = await combine(data, custom)

      expect(result.miniMetadatas).toEqual([miniMeta])
    })
  })

  // ── Custom chaindata validation ────────────────────────────────

  describe("custom chaindata validation", () => {
    it("undefined custom$ uses default empty custom data", async () => {
      const result = await combine(makeChaindata(), undefined)

      // All networks should be from default (not custom)
      for (const network of result.networks) {
        const n = network as Network & Record<string, unknown>
        expect(n.__isCustom).toBe(false)
      }
    })

    it("plain object custom$ (not observable) is accepted", async () => {
      const customToken = makeEvmNativeToken({ id: "1-evm-native", symbol: "CETH" })
      const custom = makeCustomChaindata({ tokens: [customToken] })

      // Pass as observable wrapping the object
      const dynamicTokens$ = new ReplaySubject<Token[]>(1)
      dynamicTokens$.next([])
      const result$ = getCombinedChaindata$(of(makeChaindata()), custom, dynamicTokens$)
      const result = await firstValueFrom(result$)

      const merged = findToken(result.tokens, "1-evm-native")
      expect(merged.__isCustom).toBe(true)
      expect(merged.symbol).toBe("CETH")
    })

    it("invalid custom chaindata falls back to empty", async () => {
      // strictObject rejects extra properties
      const invalidCustom = {
        tokens: [],
        networks: [],
        extraField: true,
      } as unknown as CustomChaindata

      const dynamicTokens$ = new ReplaySubject<Token[]>(1)
      dynamicTokens$.next([])
      const result$ = getCombinedChaindata$(of(makeChaindata()), of(invalidCustom), dynamicTokens$)
      const result = await firstValueFrom(result$)

      // All networks should be from default (custom fell back to empty)
      for (const network of result.networks) {
        const n = network as Network & Record<string, unknown>
        expect(n.__isCustom).toBe(false)
      }
    })
  })

  // ── Dynamic tokens ─────────────────────────────────────────────

  describe("dynamic tokens", () => {
    it("valid dynamic token is appended to default tokens", async () => {
      const dynamicToken = makeEvmNativeToken({
        id: "42-evm-native",
        networkId: "1",
        symbol: "DYN",
      })
      const result = await combine(makeChaindata(), undefined, [dynamicToken])

      const merged = findToken(result.tokens, "42-evm-native")
      expect(merged).toBeDefined()
      expect(merged.symbol).toBe("DYN")
      // Dynamic tokens are not custom — they merge into defaults
      expect(merged.__isCustom).toBe(false)
      expect(merged.__isKnown).toBe(true)
    })

    it("invalid dynamic token is filtered out by TokenSchema.safeParse", async () => {
      const invalid = makeInvalidToken() as unknown as Token
      const result = await combine(makeChaindata(), undefined, [invalid])

      const found = result.tokens.find(
        (t) => (t as Token & Record<string, unknown>).id === "bad-token"
      )
      expect(found).toBeUndefined()
    })

    it("dynamic token with same id as default is deduped (dynamic wins via keyBy)", async () => {
      const dynamicToken = makeEvmNativeToken({
        id: "1-evm-native",
        symbol: "DYN-ETH",
      })
      const result = await combine(makeChaindata(), undefined, [dynamicToken])

      const merged = findToken(result.tokens, "1-evm-native")
      expect(merged.symbol).toBe("DYN-ETH")
    })

    it("applies schema defaults to dynamic tokens (e.g. isTransferable)", async () => {
      // SubDTaoToken schema declares isTransferable: z.boolean().default(true)
      // A dynamic token without isTransferable should get the default applied via safeParse
      const dtaoToken = makeSubDTaoToken()
      expect(dtaoToken).not.toHaveProperty("isTransferable")

      const data = makeChaindata()
      const result = await combine(data, undefined, [dtaoToken as Token])

      const merged = findToken(result.tokens, dtaoToken.id)
      expect(merged).toBeDefined()
      expect(merged.isTransferable).toBe(true)
    })
  })

  // ── shareReplay ────────────────────────────────────────────────

  describe("shareReplay", () => {
    it("concurrent subscribers receive the same object reference (no redundant merge)", async () => {
      const dynamicTokens$ = new ReplaySubject<Token[]>(1)
      dynamicTokens$.next([])

      const result$ = getCombinedChaindata$(of(makeChaindata()), undefined, dynamicTokens$)

      // subscribe concurrently so refCount stays > 0
      const results: Chaindata[] = []
      const sub1 = result$.subscribe((v) => results.push(v))
      const sub2 = result$.subscribe((v) => results.push(v))

      // wait for both to receive
      await firstValueFrom(result$)

      expect(results.length).toBeGreaterThanOrEqual(2)
      // both subscribers got the exact same object reference — merge ran once
      expect(results[0]).toBe(results[1])

      sub1.unsubscribe()
      sub2.unsubscribe()
    })

    it("emits updated value when upstream changes, replays latest to new subscribers", async () => {
      const default$ = new ReplaySubject<Chaindata>(1)
      const dynamicTokens$ = new ReplaySubject<Token[]>(1)
      dynamicTokens$.next([])

      const data1 = makeChaindata()
      default$.next(data1)

      const result$ = getCombinedChaindata$(default$, undefined, dynamicTokens$)

      // collect two emissions
      const emissions = firstValueFrom(result$.pipe(take(2), toArray()))

      // the merge is chunked with latest-wins semantics: pushing data2 while data1's
      // merge is in flight would supersede it, so wait for the first emission
      await firstValueFrom(result$)

      // push a second emission
      const data2 = makeChaindata({
        tokens: [makeEvmNativeToken({ id: "1-evm-native", symbol: "UPDATED" })],
        networks: [makeEthNetwork()],
        miniMetadatas: [],
      })
      default$.next(data2)

      const [emission1, emission2] = await emissions
      expect(emission1).not.toBe(emission2) // different merge results
      expect(findToken(emission2.tokens, "1-evm-native").symbol).toBe("UPDATED")
    })
  })

  // ── Edge cases ─────────────────────────────────────────────────

  describe("edge cases", () => {
    it("empty default + empty custom → empty arrays", async () => {
      const emptyData: Chaindata = { networks: [], tokens: [], miniMetadatas: [] }
      const emptyCustom = makeCustomChaindata({ tokens: [] })
      const result = await combine(emptyData, emptyCustom)

      expect(result.networks).toEqual([])
      expect(result.tokens).toEqual([])
      expect(result.miniMetadatas).toEqual([])
    })

    it("custom network with isTestnet: true → custom tokens on it get __isTestnet: true", async () => {
      const testnetNetwork = makeEthNetwork({
        id: "999",
        isTestnet: true,
        nativeTokenId: "999-evm-native",
      })
      const testnetToken = makeEvmNativeToken({
        id: "999-evm-native",
        networkId: "999",
        symbol: "TEST",
      })
      const custom = makeCustomChaindata({
        networks: [testnetNetwork],
        tokens: [testnetToken],
      })
      const result = await combine(makeChaindata(), custom)

      const merged = findToken(result.tokens, "999-evm-native")
      expect(merged.__isTestnet).toBe(true)
      expect(merged.__isCustom).toBe(true)
    })
  })
})

// ─── Helper functions ──────────────────────────────────────────────

describe("helper functions", () => {
  // Build merged networks/tokens once for reuse
  const defaultNetwork = (): Network & Record<string, unknown> =>
    ({ ...makeEthNetwork(), __isCustom: false, __isKnown: true }) as Network &
      Record<string, unknown>

  const customNetwork = (): Network & Record<string, unknown> =>
    ({
      ...makeEthNetwork({ id: "999", nativeTokenId: "999-evm-native" }),
      __isCustom: true,
      __isKnown: false,
    }) as Network & Record<string, unknown>

  const defaultToken = (): Token & Record<string, unknown> =>
    ({
      ...makeEvmNativeToken(),
      __isCustom: false,
      __isKnown: true,
      __isTestnet: false,
    }) as Token & Record<string, unknown>

  const customToken = (): Token & Record<string, unknown> =>
    ({
      ...makeEvmNativeToken({ id: "999-evm-native", networkId: "999" }),
      __isCustom: true,
      __isKnown: false,
      __isTestnet: true,
    }) as Token & Record<string, unknown>

  describe("isNetworkCustom", () => {
    it("returns true for custom network", () => {
      expect(isNetworkCustom(customNetwork() as Network)).toBe(true)
    })

    it("returns false for default network", () => {
      expect(isNetworkCustom(defaultNetwork() as Network)).toBe(false)
    })

    it("returns false for non-object", () => {
      expect(isNetworkCustom(42 as unknown as Network)).toBe(false)
      expect(isNetworkCustom("str" as unknown as Network)).toBe(false)
    })
  })

  describe("isNetworkKnown", () => {
    it("returns true for known network", () => {
      expect(isNetworkKnown(defaultNetwork() as Network)).toBe(true)
    })

    it("returns false for unknown network", () => {
      expect(isNetworkKnown(customNetwork() as Network)).toBe(false)
    })
  })

  describe("isTokenCustom", () => {
    it("returns true for custom token", () => {
      expect(isTokenCustom(customToken() as Token)).toBe(true)
    })

    it("returns false for default token", () => {
      expect(isTokenCustom(defaultToken() as Token)).toBe(false)
    })
  })

  describe("isTokenKnown", () => {
    it("returns true for known token", () => {
      expect(isTokenKnown(defaultToken() as Token)).toBe(true)
    })

    it("returns false for unknown token", () => {
      expect(isTokenKnown(customToken() as Token)).toBe(false)
    })
  })

  describe("isTokenTestnet", () => {
    it("returns true for testnet token", () => {
      expect(isTokenTestnet(customToken() as Token)).toBe(true)
    })

    it("returns false for non-testnet token", () => {
      expect(isTokenTestnet(defaultToken() as Token)).toBe(false)
    })
  })

  describe("getCleanNetwork", () => {
    it("removes __isCustom and __isKnown, keeps the rest", () => {
      const network = defaultNetwork()
      const clean = getCleanNetwork(network as Network)

      expect(clean).not.toHaveProperty("__isCustom")
      expect(clean).not.toHaveProperty("__isKnown")
      expect(clean).toHaveProperty("id", "1")
      expect(clean).toHaveProperty("name", "Ethereum Mainnet")
      expect(clean).toHaveProperty("platform", "ethereum")
    })
  })

  describe("getCleanToken", () => {
    it("removes __isCustom, __isKnown, __isTestnet, keeps the rest", () => {
      const token = defaultToken()
      const clean = getCleanToken(token as Token)

      expect(clean).not.toHaveProperty("__isCustom")
      expect(clean).not.toHaveProperty("__isKnown")
      expect(clean).not.toHaveProperty("__isTestnet")
      expect(clean).toHaveProperty("id", "1-evm-native")
      expect(clean).toHaveProperty("symbol", "ETH")
      expect(clean).toHaveProperty("type", "evm-native")
    })
  })
})
