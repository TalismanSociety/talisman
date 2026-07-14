import { isEqual } from "lodash-es"
import { describe, expect, it } from "vitest"

import {
  makeChaindata,
  makeCustomChaindata,
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
