import { describe, expect, it, vi } from "vitest"

import { getProxyTypes } from "./getProxyTypes"

/**
 * Builds a minimal metadata-like structure that `parseMetadataRpc` would produce.
 * We stub `parseMetadataRpc` so tests don't need real SCALE-encoded blobs.
 */

// We'll mock @talismn/scale's parseMetadataRpc
const PROXY_TYPE_LOOKUP_ID = 200
const CALLS_LOOKUP_ID = 100

const makeVariantLookup = (
  id: number,
  variants: Array<{ name: string; fields?: unknown[]; index: number; docs?: string[] }>
) => ({
  id,
  path: [],
  params: [],
  def: {
    tag: "variant" as const,
    value: variants.map((v) => ({
      name: v.name,
      fields: v.fields ?? [],
      index: v.index,
      docs: v.docs ?? [],
    })),
  },
  docs: [],
})

const makeMetadata = ({
  palletName = "Proxy",
  callsType = CALLS_LOOKUP_ID as number | null,
  addProxyFields = [
    { name: "delegate", type: 1 },
    { name: "proxy_type", type: PROXY_TYPE_LOOKUP_ID },
    { name: "delay", type: 2 },
  ] as Array<{ name: string | undefined; type: number }>,
  proxyTypeVariants = [
    { name: "Any", fields: [], index: 0, docs: ["Allow all transactions."] },
    { name: "NonTransfer", fields: [], index: 1, docs: ["Allow all except balance transfers."] },
    { name: "Governance", fields: [], index: 2, docs: [] },
  ] as Array<{ name: string; fields?: unknown[]; index: number; docs?: string[] }>,
  includeAddProxy = true,
  extraCallVariants = [] as Array<{
    name: string
    fields: unknown[]
    index: number
    docs?: string[]
  }>,
  extraLookups = [] as Array<{
    id: number
    path: string[]
    params: unknown[]
    def: unknown
    docs: string[]
  }>,
} = {}) => {
  const callVariants = [
    ...(includeAddProxy ? [{ name: "add_proxy", fields: addProxyFields, index: 0, docs: [] }] : []),
    { name: "remove_proxy", fields: addProxyFields, index: 1, docs: [] },
    ...extraCallVariants,
  ]

  return {
    unifiedMetadata: {
      pallets: [
        {
          name: palletName,
          calls: callsType != null ? { type: callsType } : undefined,
          storage: { prefix: "Proxy", items: [] },
          constants: [],
          events: undefined,
          errors: undefined,
          index: 0,
          docs: [],
        },
      ],
      lookup: [
        makeVariantLookup(CALLS_LOOKUP_ID, callVariants),
        makeVariantLookup(PROXY_TYPE_LOOKUP_ID, proxyTypeVariants),
        ...extraLookups,
      ],
      extrinsic: { version: 4, type: 0, signedExtensions: [] },
      type: 0,
      apis: [],
    },
  }
}

// biome-ignore lint/suspicious/noExplicitAny: test mock
let mockMetadata: any = makeMetadata()

vi.mock("@talismn/scale", () => ({
  parseMetadataRpc: () => mockMetadata,
}))

describe("getProxyTypes", () => {
  it("extracts proxy type names and docs from metadata", () => {
    mockMetadata = makeMetadata()
    const result = getProxyTypes("0x00")
    expect(result).toEqual([
      { name: "Any", docs: "Allow all transactions." },
      { name: "NonTransfer", docs: "Allow all except balance transfers." },
      { name: "Governance", docs: "" },
    ])
  })

  it("returns empty array when Proxy pallet is missing", () => {
    mockMetadata = makeMetadata({ palletName: "NotProxy" })
    expect(getProxyTypes("0x00")).toEqual([])
  })

  it("returns empty array when calls type is absent", () => {
    mockMetadata = makeMetadata({ callsType: null })
    expect(getProxyTypes("0x00")).toEqual([])
  })

  it("returns empty array when add_proxy variant is missing", () => {
    mockMetadata = makeMetadata({ includeAddProxy: false })
    expect(getProxyTypes("0x00")).toEqual([])
  })

  it("falls back to positional field when proxy_type name is missing", () => {
    mockMetadata = makeMetadata({
      addProxyFields: [
        { name: undefined, type: 1 },
        { name: undefined, type: PROXY_TYPE_LOOKUP_ID },
        { name: undefined, type: 2 },
      ],
    })
    const result = getProxyTypes("0x00")
    expect(result).toHaveLength(3)
    expect(result[0]?.name).toBe("Any")
  })

  it("falls back to camelCase proxyType field name", () => {
    mockMetadata = makeMetadata({
      addProxyFields: [
        { name: "delegate", type: 1 },
        { name: "proxyType", type: PROXY_TYPE_LOOKUP_ID },
        { name: "delay", type: 2 },
      ],
    })
    const result = getProxyTypes("0x00")
    expect(result).toHaveLength(3)
  })

  it("filters out non-unit variants (variants with fields)", () => {
    mockMetadata = makeMetadata({
      proxyTypeVariants: [
        { name: "Any", fields: [], index: 0, docs: [] },
        { name: "Custom", fields: [{ name: "data", type: 3 }], index: 1, docs: [] },
        { name: "Staking", fields: [], index: 2, docs: [] },
      ],
    })
    const result = getProxyTypes("0x00")
    expect(result).toEqual([
      { name: "Any", docs: "" },
      { name: "Staking", docs: "" },
    ])
  })

  it("joins multi-line docs", () => {
    mockMetadata = makeMetadata({
      proxyTypeVariants: [{ name: "Any", fields: [], index: 0, docs: ["Line one.", "Line two."] }],
    })
    const result = getProxyTypes("0x00")
    expect(result[0]?.docs).toBe("Line one. Line two.")
  })

  it("returns empty array when parseMetadataRpc throws", () => {
    // Setting mockMetadata to null makes the mock throw when destructuring
    mockMetadata = null
    expect(getProxyTypes("0x00")).toEqual([])
  })
})
