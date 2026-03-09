import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { SwappableAssetWithDecimals } from "../swap-modules/common.swap-module"

// ── Module mocks ──────────────────────────────────────────────────

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}))

let mockFromAssets: SwappableAssetWithDecimals[] | undefined = []
let mockToAssets: SwappableAssetWithDecimals[] | undefined = []

vi.mock("../swaps.api", () => ({
  useSafeTokens: () => ({ data: new Set<string>() }),
  useSwapAssets: () => ({ fromAssets: mockFromAssets, toAssets: mockToAssets }),
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

// ── Import after mocks ────────────────────────────────────────────

// eslint-disable-next-line import/first
import { useSwapContextProvider } from "../SwapProvider.internal"

// ── Helpers ───────────────────────────────────────────────────────

function makeAsset(id: string, symbol: string): SwappableAssetWithDecimals {
  return {
    id,
    name: symbol,
    networkType: "evm",
    chainId: 1,
    symbol,
    decimals: 18,
    context: {},
  } as SwappableAssetWithDecimals
}

// ── Tests ─────────────────────────────────────────────────────────

describe("useSwapContextProvider stateInit initialization", () => {
  beforeEach(() => {
    mockFromAssets = []
    mockToAssets = []
  })

  it("initializes toAsset from stateInit.toTokenId when toAssets loads", () => {
    const seekAsset = makeAsset("8453:erc20:0xseek", "SEEK")
    mockToAssets = [makeAsset("1:native:eth", "ETH"), seekAsset]

    const { result } = renderHook(() =>
      useSwapContextProvider({ stateInit: { toTokenId: "8453:erc20:0xseek" } })
    )

    expect(result.current.toAsset).toBe(seekAsset)
  })

  it("initializes fromAsset from stateInit.fromTokenId when fromAssets loads", () => {
    const ethAsset = makeAsset("1:native:eth", "ETH")
    mockFromAssets = [ethAsset, makeAsset("137:native:matic", "MATIC")]

    const { result } = renderHook(() =>
      useSwapContextProvider({ stateInit: { fromTokenId: "1:native:eth" } })
    )

    expect(result.current.fromAsset).toBe(ethAsset)
  })

  it("does not initialize when stateInit is null", () => {
    mockToAssets = [makeAsset("1:native:eth", "ETH")]
    mockFromAssets = [makeAsset("1:native:eth", "ETH")]

    const { result } = renderHook(() => useSwapContextProvider({ stateInit: null }))

    expect(result.current.fromAsset).toBeNull()
    expect(result.current.toAsset).toBeNull()
  })

  it("does not re-initialize after user changes toAsset", () => {
    const seekAsset = makeAsset("8453:erc20:0xseek", "SEEK")
    const otherAsset = makeAsset("1:native:eth", "ETH")
    mockToAssets = [otherAsset, seekAsset]

    const { result } = renderHook(() =>
      useSwapContextProvider({ stateInit: { toTokenId: "8453:erc20:0xseek" } })
    )

    // Verify initial auto-selection
    expect(result.current.toAsset).toBe(seekAsset)

    // Simulate user selecting a different asset
    act(() => {
      result.current.setToAsset(otherAsset)
    })

    expect(result.current.toAsset).toBe(otherAsset)
  })

  it("waits for toAssets to load before initializing", () => {
    // Start with empty toAssets
    mockToAssets = []

    const { result, rerender } = renderHook(() =>
      useSwapContextProvider({ stateInit: { toTokenId: "8453:erc20:0xseek" } })
    )

    expect(result.current.toAsset).toBeNull()

    // Simulate toAssets loading
    const seekAsset = makeAsset("8453:erc20:0xseek", "SEEK")
    mockToAssets = [seekAsset]
    rerender()

    expect(result.current.toAsset).toBe(seekAsset)
  })

  it("handles toTokenId not found in toAssets gracefully", () => {
    mockToAssets = [makeAsset("1:native:eth", "ETH")]

    const { result } = renderHook(() =>
      useSwapContextProvider({ stateInit: { toTokenId: "nonexistent:token" } })
    )

    expect(result.current.toAsset).toBeNull()
  })
})

describe("useSwapContextProvider isInitializing", () => {
  beforeEach(() => {
    mockFromAssets = undefined
    mockToAssets = undefined
  })

  it("is true when stateInit.toTokenId is set but toAssets has not loaded", () => {
    const { result } = renderHook(() =>
      useSwapContextProvider({ stateInit: { toTokenId: "8453:erc20:0xseek" } })
    )

    expect(result.current.isInitializing).toBe(true)
  })

  it("is true when stateInit.fromTokenId is set but fromAssets has not loaded", () => {
    const { result } = renderHook(() =>
      useSwapContextProvider({ stateInit: { fromTokenId: "1:native:eth" } })
    )

    expect(result.current.isInitializing).toBe(true)
  })

  it("becomes false once toAssets loads and toAsset is set", () => {
    const { result, rerender } = renderHook(() =>
      useSwapContextProvider({ stateInit: { toTokenId: "8453:erc20:0xseek" } })
    )

    expect(result.current.isInitializing).toBe(true)

    const seekAsset = makeAsset("8453:erc20:0xseek", "SEEK")
    mockToAssets = [seekAsset]
    rerender()

    expect(result.current.isInitializing).toBe(false)
    expect(result.current.toAsset).toBe(seekAsset)
  })

  it("becomes false when assets load even if token not found", () => {
    const { result, rerender } = renderHook(() =>
      useSwapContextProvider({ stateInit: { toTokenId: "nonexistent:token" } })
    )

    expect(result.current.isInitializing).toBe(true)

    mockToAssets = [makeAsset("1:native:eth", "ETH")]
    rerender()

    // toAssets loaded (not undefined), so isInitializing becomes false
    expect(result.current.isInitializing).toBe(false)
    expect(result.current.toAsset).toBeNull()
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
