import type { UnifiedMetadata } from "@talismn/scale"
import { parseMetadataRpc } from "@talismn/scale"
import { vi } from "vitest"
import {
  getConstantValue,
  hasRuntimeApi,
  hasStorageItem,
  hasStorageItems,
  tryGetConstantValue,
} from "./utils"

vi.mock("@talismn/scale", () => ({
  parseMetadataRpc: vi.fn(),
}))

const makeMetadata = (
  overrides: { pallets?: Record<string, unknown>[]; apis?: Record<string, unknown>[] } = {}
): UnifiedMetadata =>
  ({
    pallets: [],
    apis: [],
    ...overrides,
  }) as unknown as UnifiedMetadata

describe("hasStorageItem", () => {
  it("returns true when pallet and item exist", () => {
    const metadata = makeMetadata({
      pallets: [{ name: "System", storage: { items: [{ name: "Account" }] } }],
    })
    expect(hasStorageItem(metadata, "System", "Account")).toBe(true)
  })

  it("returns false when pallet doesn't exist", () => {
    const metadata = makeMetadata({
      pallets: [{ name: "System", storage: { items: [{ name: "Account" }] } }],
    })
    expect(hasStorageItem(metadata, "Balances", "Account")).toBe(false)
  })

  it("returns false when item doesn't exist in pallet", () => {
    const metadata = makeMetadata({
      pallets: [{ name: "System", storage: { items: [{ name: "Account" }] } }],
    })
    expect(hasStorageItem(metadata, "System", "Events")).toBe(false)
  })

  it("returns false when pallet has no storage", () => {
    const metadata = makeMetadata({
      pallets: [{ name: "System" }],
    })
    expect(hasStorageItem(metadata, "System", "Account")).toBe(false)
  })
})

describe("hasStorageItems", () => {
  it("returns true when all items exist", () => {
    const metadata = makeMetadata({
      pallets: [{ name: "System", storage: { items: [{ name: "Account" }, { name: "Events" }] } }],
    })
    expect(hasStorageItems(metadata, "System", ["Account", "Events"])).toBe(true)
  })

  it("returns false when any item is missing", () => {
    const metadata = makeMetadata({
      pallets: [{ name: "System", storage: { items: [{ name: "Account" }] } }],
    })
    expect(hasStorageItems(metadata, "System", ["Account", "Events"])).toBe(false)
  })

  it("returns false when pallet doesn't exist", () => {
    const metadata = makeMetadata({
      pallets: [{ name: "System", storage: { items: [{ name: "Account" }] } }],
    })
    expect(hasStorageItems(metadata, "Balances", ["Account"])).toBe(false)
  })

  it("returns true for empty itemNames array", () => {
    const metadata = makeMetadata({
      pallets: [{ name: "System", storage: { items: [{ name: "Account" }] } }],
    })
    expect(hasStorageItems(metadata, "System", [])).toBe(true)
  })
})

describe("hasRuntimeApi", () => {
  it("returns true when API and method exist", () => {
    const metadata = makeMetadata({
      apis: [{ name: "StakingApi", methods: [{ name: "nominations_quota" }] }],
    })
    expect(hasRuntimeApi(metadata, "StakingApi", "nominations_quota")).toBe(true)
  })

  it("returns false when API doesn't exist", () => {
    const metadata = makeMetadata({
      apis: [{ name: "StakingApi", methods: [{ name: "nominations_quota" }] }],
    })
    expect(hasRuntimeApi(metadata, "CoreApi", "version")).toBe(false)
  })

  it("returns false when method doesn't exist in API", () => {
    const metadata = makeMetadata({
      apis: [{ name: "StakingApi", methods: [{ name: "nominations_quota" }] }],
    })
    expect(hasRuntimeApi(metadata, "StakingApi", "pending_rewards")).toBe(false)
  })

  it("returns false when API has no methods", () => {
    const metadata = makeMetadata({
      apis: [{ name: "StakingApi" }],
    })
    expect(hasRuntimeApi(metadata, "StakingApi", "nominations_quota")).toBe(false)
  })
})

describe("getConstantValue", () => {
  beforeEach(() => {
    vi.mocked(parseMetadataRpc).mockReset()
  })

  it("returns decoded value when constant exists", () => {
    const mockCodec = { dec: vi.fn().mockReturnValue(42) }
    const mockBuilder = { buildConstant: vi.fn().mockReturnValue(mockCodec) }
    const encodedValue = new Uint8Array([1, 2, 3])

    vi.mocked(parseMetadataRpc).mockReturnValue({
      unifiedMetadata: makeMetadata({
        pallets: [{ name: "System", constants: [{ name: "BlockLength", value: encodedValue }] }],
      }),
      builder: mockBuilder,
      // biome-ignore lint/suspicious/noExplicitAny: mock return type for parseMetadataRpc
    } as any)

    const result = getConstantValue<number>("0xdead", "System", "BlockLength")

    expect(result).toBe(42)
    expect(mockBuilder.buildConstant).toHaveBeenCalledWith("System", "BlockLength")
    expect(mockCodec.dec).toHaveBeenCalledWith(encodedValue)
  })

  it("throws when constant doesn't exist", () => {
    const mockBuilder = { buildConstant: vi.fn() }

    vi.mocked(parseMetadataRpc).mockReturnValue({
      unifiedMetadata: makeMetadata({
        pallets: [{ name: "System", constants: [] }],
      }),
      builder: mockBuilder,
      // biome-ignore lint/suspicious/noExplicitAny: mock return type for parseMetadataRpc
    } as any)

    expect(() => getConstantValue("0xdead", "System", "BlockLength")).toThrow(
      "Constant System.BlockLength not found"
    )
  })
})

describe("tryGetConstantValue", () => {
  beforeEach(() => {
    vi.mocked(parseMetadataRpc).mockReset()
  })

  it("returns decoded value when constant exists", () => {
    const mockCodec = { dec: vi.fn().mockReturnValue(42) }
    const mockBuilder = { buildConstant: vi.fn().mockReturnValue(mockCodec) }
    const encodedValue = new Uint8Array([1, 2, 3])

    vi.mocked(parseMetadataRpc).mockReturnValue({
      unifiedMetadata: makeMetadata({
        pallets: [{ name: "System", constants: [{ name: "BlockLength", value: encodedValue }] }],
      }),
      builder: mockBuilder,
      // biome-ignore lint/suspicious/noExplicitAny: mock return type for parseMetadataRpc
    } as any)

    const result = tryGetConstantValue<number>("0xdead", "System", "BlockLength")

    expect(result).toBe(42)
    expect(mockBuilder.buildConstant).toHaveBeenCalledWith("System", "BlockLength")
    expect(mockCodec.dec).toHaveBeenCalledWith(encodedValue)
  })

  it("returns null when constant doesn't exist", () => {
    const mockBuilder = { buildConstant: vi.fn() }

    vi.mocked(parseMetadataRpc).mockReturnValue({
      unifiedMetadata: makeMetadata({
        pallets: [{ name: "System", constants: [] }],
      }),
      builder: mockBuilder,
      // biome-ignore lint/suspicious/noExplicitAny: mock return type for parseMetadataRpc
    } as any)

    const result = tryGetConstantValue("0xdead", "System", "BlockLength")

    expect(result).toBeNull()
    expect(mockBuilder.buildConstant).not.toHaveBeenCalled()
  })
})
