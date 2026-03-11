import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

// ── Module mocks ──────────────────────────────────────────────────

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}))

let mockFromAssetIds: string[] | undefined = []
let mockToAssetIds: string[] | undefined = []

vi.mock("../swaps.api", () => ({
  useSafeTokens: () => ({ data: new Set<string>() }),
  useSwapAssets: () => ({
    fromAssetIds: mockFromAssetIds,
    toAssetIds: mockToAssetIds,
    fromSupportMap: null,
    toSupportMap: null,
    isLoadingFromAssets: false,
    isLoadingToAssets: false,
  }),
  useReverse: () => vi.fn(),
}))

vi.mock("../hooks/useSwapAddresses", () => ({
  useSwapAddresses: (props: Record<string, unknown>) => ({
    fromAddress: props.fromAddress ?? null,
    toAddress: props.toAddress ?? null,
    setFromAddress: props.setFromAddress ?? vi.fn(),
    setToAddress: props.setToAddress ?? vi.fn(),
    ethAccounts: [],
    substrateAccounts: [],
    fromEvmAccount: null,
    fromSubstrateAccount: null,
    resetFromAddressManuallySet: vi.fn(),
  }),
}))

vi.mock("../hooks/useSwapQuoteManager", () => ({
  useSwapQuoteManager: () => ({
    isLoadingQuotes: false,
    isAllQuotesSettled: true,
    hasQuoteError: false,
    sortedQuotes: [],
    selectedQuote: null,
    selectedQuoteFees: null,
    selectedModule: null,
    toAmount: null,
  }),
}))

vi.mock("../hooks/useSwapErc20Approval", () => ({
  useSwapErc20Approval: () => ({}),
}))

vi.mock("../hooks/useFastBalance", () => ({
  useFastBalance: () => undefined,
}))

vi.mock("@ui/state/chaindata", () => ({
  useToken: vi.fn(() => null),
}))

// ── Import after mocks ────────────────────────────────────────────

// eslint-disable-next-line import/first
import { useSwapContextProvider } from "../SwapProvider.internal"

// ── Tests ─────────────────────────────────────────────────────────

describe("useSwapContextProvider stateInit initialization", () => {
  beforeEach(() => {
    mockFromAssetIds = []
    mockToAssetIds = []
  })

  it("initializes toTokenId from stateInit.toTokenId when toAssetIds loads", () => {
    mockToAssetIds = ["1:native:eth", "8453:erc20:0xseek"]

    const { result } = renderHook(() =>
      useSwapContextProvider({ stateInit: { toTokenId: "8453:erc20:0xseek" } })
    )

    expect(result.current.toTokenId).toBe("8453:erc20:0xseek")
  })

  it("initializes fromTokenId from stateInit.fromTokenId when fromAssetIds loads", () => {
    mockFromAssetIds = ["1:native:eth", "137:native:matic"]

    const { result } = renderHook(() =>
      useSwapContextProvider({ stateInit: { fromTokenId: "1:native:eth" } })
    )

    expect(result.current.fromTokenId).toBe("1:native:eth")
  })

  it("does not initialize when stateInit is null", () => {
    mockToAssetIds = ["1:native:eth"]
    mockFromAssetIds = ["1:native:eth"]

    const { result } = renderHook(() => useSwapContextProvider({ stateInit: null }))

    expect(result.current.fromTokenId).toBeNull()
    expect(result.current.toTokenId).toBeNull()
  })

  it("does not re-initialize after user changes toTokenId", () => {
    mockToAssetIds = ["1:native:eth", "8453:erc20:0xseek"]

    const { result } = renderHook(() =>
      useSwapContextProvider({ stateInit: { toTokenId: "8453:erc20:0xseek" } })
    )

    // Verify initial auto-selection
    expect(result.current.toTokenId).toBe("8453:erc20:0xseek")

    // Simulate user selecting a different token
    act(() => {
      result.current.setToTokenId("1:native:eth")
    })

    expect(result.current.toTokenId).toBe("1:native:eth")
  })

  it("waits for toAssetIds to load before initializing", () => {
    // Start with empty toAssetIds
    mockToAssetIds = []

    const { result, rerender } = renderHook(() =>
      useSwapContextProvider({ stateInit: { toTokenId: "8453:erc20:0xseek" } })
    )

    expect(result.current.toTokenId).toBeNull()

    // Simulate toAssetIds loading
    mockToAssetIds = ["8453:erc20:0xseek"]
    rerender()

    expect(result.current.toTokenId).toBe("8453:erc20:0xseek")
  })

  it("handles toTokenId not found in toAssetIds gracefully", () => {
    mockToAssetIds = ["1:native:eth"]

    const { result } = renderHook(() =>
      useSwapContextProvider({ stateInit: { toTokenId: "nonexistent:token" } })
    )

    expect(result.current.toTokenId).toBeNull()
  })
})

describe("useSwapContextProvider isInitializing", () => {
  beforeEach(() => {
    mockFromAssetIds = undefined
    mockToAssetIds = undefined
  })

  it("is true when stateInit.toTokenId is set but toAssetIds has not loaded", () => {
    const { result } = renderHook(() =>
      useSwapContextProvider({ stateInit: { toTokenId: "8453:erc20:0xseek" } })
    )

    expect(result.current.isInitializing).toBe(true)
  })

  it("is true when stateInit.fromTokenId is set but fromAssetIds has not loaded", () => {
    const { result } = renderHook(() =>
      useSwapContextProvider({ stateInit: { fromTokenId: "1:native:eth" } })
    )

    expect(result.current.isInitializing).toBe(true)
  })

  it("becomes false once toAssetIds loads and toTokenId is set", () => {
    const { result, rerender } = renderHook(() =>
      useSwapContextProvider({ stateInit: { toTokenId: "8453:erc20:0xseek" } })
    )

    expect(result.current.isInitializing).toBe(true)

    mockToAssetIds = ["8453:erc20:0xseek"]
    rerender()

    expect(result.current.isInitializing).toBe(false)
    expect(result.current.toTokenId).toBe("8453:erc20:0xseek")
  })

  it("becomes false when assets load even if token not found", () => {
    const { result, rerender } = renderHook(() =>
      useSwapContextProvider({ stateInit: { toTokenId: "nonexistent:token" } })
    )

    expect(result.current.isInitializing).toBe(true)

    mockToAssetIds = ["1:native:eth"]
    rerender()

    // toAssetIds loaded (not undefined), so isInitializing becomes false
    expect(result.current.isInitializing).toBe(false)
    expect(result.current.toTokenId).toBeNull()
  })

  it("is false when stateInit is null", () => {
    const { result } = renderHook(() => useSwapContextProvider({ stateInit: null }))

    expect(result.current.isInitializing).toBe(false)
  })

  it("is false when stateInit has no token IDs", () => {
    const { result } = renderHook(() =>
      useSwapContextProvider({ stateInit: { fromAddress: "0x1234" } })
    )

    expect(result.current.isInitializing).toBe(false)
  })
})
