import { isEqual } from "lodash-es"
import { assert, describe, expect, it } from "vitest"

import {
  makeChaindata,
  makeCustomChaindata,
  makeDotNetwork,
  makeEthNetwork,
  makeEvmNativeToken,
  makeInvalidDotNetwork,
  makeInvalidToken,
  makeLegacyPersistedData,
  makeOrphanedNetwork,
  makeUnknownTokenTypeData,
} from "../__fixtures__/chaindata"
import {
  chaindataEqualWithYield,
  parseChaindataFileChunked,
  parseCustomChaindataChunked,
} from "./chunkedValidation"
import { ChaindataFileSchema, CustomChaindataSchema } from "./schema"

const issueSummary = (error: {
  issues: { code: string; path: PropertyKey[]; message: string }[]
}) => error.issues.map(({ code, path, message }) => ({ code, path, message }))

describe("parseChaindataFileChunked", () => {
  const cases: Array<[string, unknown]> = [
    ["valid chaindata", makeChaindata()],
    ["empty chaindata", { networks: [], tokens: [], miniMetadatas: [] }],
    [
      "orphaned network (native token check)",
      makeChaindata({ networks: [...makeChaindata().networks, makeOrphanedNetwork()] }),
    ],
    [
      "invalid token",
      makeChaindata({ tokens: [...makeChaindata().tokens, makeInvalidToken() as never] }),
    ],
    [
      "invalid network",
      makeChaindata({ networks: [...makeChaindata().networks, makeInvalidDotNetwork() as never] }),
    ],
    [
      "cleartext rpcs",
      makeChaindata({
        networks: [
          makeDotNetwork({ rpcs: ["ws://example.com", "wss://rpc.polkadot.io"] }),
          makeEthNetwork({ rpcs: ["http://example.com"] }),
        ],
      }),
    ],
    ["legacy persisted data with extra props", makeLegacyPersistedData()],
    ["unknown token type", makeUnknownTokenTypeData()],
    [
      "invalid token AND orphaned network (check must not run)",
      makeChaindata({
        networks: [...makeChaindata().networks, makeOrphanedNetwork()],
        tokens: [...makeChaindata().tokens, makeInvalidToken() as never],
      }),
    ],
    ["non-object input", "nope"],
    ["null input", null],
    ["missing sections", {}],
    ["sections of wrong type", { networks: "x", tokens: [], miniMetadatas: [] }],
  ]

  it.each(cases)("matches ChaindataFileSchema.safeParse: %s", async (_label, input) => {
    const expected = ChaindataFileSchema.safeParse(input)
    const actual = await parseChaindataFileChunked(input)

    expect(actual.success).toBe(expected.success)
    if (expected.success && actual.success) {
      // deep-equal including key order (TokenSchema transform reorders token keys)
      expect(JSON.stringify(actual.data)).toBe(JSON.stringify(expected.data))
    }
    if (!expected.success && !actual.success) {
      expect(issueSummary(actual.error)).toEqual(issueSummary(expected.error))
    }
  })

  it("yields the thread while validating a large file", async () => {
    const base = makeChaindata()
    const large = {
      networks: base.networks,
      tokens: [
        ...Array.from({ length: 5_000 }, (_, i) =>
          makeEvmNativeToken({ id: `1-evm-native-${i}` as never })
        ),
        ...base.tokens,
      ],
      miniMetadatas: base.miniMetadatas,
    }

    let ticks = 0
    const interval = setInterval(() => ticks++, 1)
    try {
      const result = await parseChaindataFileChunked(large, { budgetMs: 2 })
      expect(result.success).toBe(true)
    } finally {
      clearInterval(interval)
    }
    expect(ticks).toBeGreaterThan(0)
  })

  it("rejects with an AbortError when aborted", async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(
      parseChaindataFileChunked(makeChaindata(), { signal: controller.signal })
    ).rejects.toSatisfy((error) => error instanceof Error && error.name === "AbortError")
  })
})

describe("parseChaindataFileChunked with substrate-gamma", () => {
  const gammaToken = {
    id: "bittensor:substrate-gamma:25",
    networkId: "bittensor",
    type: "substrate-gamma",
    platform: "polkadot",
    decimals: 9,
    symbol: "GAMMA",
    netuid: 25,
  }

  it("accepts a gamma token and defaults it to non-transferable", async () => {
    const result = await parseChaindataFileChunked(
      makeChaindata({ tokens: [...makeChaindata().tokens, gammaToken as never] })
    )

    assert(result.success)
    expect(result.data.tokens.find((t) => t.id === gammaToken.id)).toEqual({
      ...gammaToken,
      isTransferable: false,
    })
  })

  it("rejects a gamma token with an unknown key", async () => {
    const result = await parseChaindataFileChunked(
      makeChaindata({
        tokens: [...makeChaindata().tokens, { ...gammaToken, hotkey: "5Fo2" } as never],
      })
    )

    assert(!result.success)
    expect(issueSummary(result.error)).toEqual([
      { code: "unrecognized_keys", path: ["tokens", 3], message: 'Unrecognized key: "hotkey"' },
    ])
  })

  it("accepts a network with an empty substrate-gamma balances config", async () => {
    const network = makeDotNetwork({ balancesConfig: { "substrate-gamma": {} } })
    const result = await parseChaindataFileChunked(
      makeChaindata({ networks: [network, ...makeChaindata().networks.slice(1)] })
    )

    assert(result.success)
    expect(result.data.networks[0]?.balancesConfig).toEqual({ "substrate-gamma": {} })
  })
})

describe("parseCustomChaindataChunked", () => {
  const cases: Array<[string, unknown]> = [
    ["valid custom chaindata (tokens only)", makeCustomChaindata()],
    [
      "valid custom chaindata with networks",
      { networks: [makeChaindata().networks[0]], tokens: [makeChaindata().tokens[0]] },
    ],
    ["unrecognized top-level key (strictObject)", { tokens: [], extra: true }],
    ["invalid token", { tokens: [makeInvalidToken()] }],
    ["orphaned network", { networks: [makeOrphanedNetwork()], tokens: [] }],
    ["non-object input", 42],
    ["missing tokens", {}],
  ]

  it.each(cases)("matches CustomChaindataSchema.safeParse: %s", async (_label, input) => {
    const expected = CustomChaindataSchema.safeParse(input)
    const actual = await parseCustomChaindataChunked(input)

    expect(actual.success).toBe(expected.success)
    if (expected.success && actual.success) {
      expect(JSON.stringify(actual.data)).toBe(JSON.stringify(expected.data))
      // z.object must not add missing optional keys
      expect("networks" in actual.data).toBe("networks" in expected.data)
    }
    if (!expected.success && !actual.success) {
      expect(issueSummary(actual.error)).toEqual(issueSummary(expected.error))
    }
  })
})

describe("chaindataEqualWithYield", () => {
  it("agrees with lodash isEqual", async () => {
    const a = makeChaindata()
    const b = makeChaindata()
    const c = makeChaindata({ tokens: [...makeChaindata().tokens].reverse() })
    const d = makeChaindata({ miniMetadatas: [] })

    expect(await chaindataEqualWithYield(a, b)).toBe(isEqual(a, b))
    expect(await chaindataEqualWithYield(a, b)).toBe(true)
    expect(await chaindataEqualWithYield(a, c)).toBe(isEqual(a, c))
    expect(await chaindataEqualWithYield(a, c)).toBe(false)
    expect(await chaindataEqualWithYield(a, d)).toBe(false)
  })
})
