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
    setFromAddressManuallySet: vi.fn(),
  }),
}))

vi.mock("../hooks/useSwapQuoteManager", () => ({
  useSwapQuoteManager: () => ({
    isLoadingQuotes: false,
    isQuoteDataCurrent: true,
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

vi.mock("../hooks/useSwapSlippage", () => ({
  useSwapSlippage: () => [0.5],
}))

vi.mock("@ui/api", () => ({
  api: {
    registerAdditionalTokenRates: vi.fn(),
  },
}))

vi.mock("@ui/hooks/useBalancesByParams", () => ({
  useBalanceByParams: () => null,
}))

vi.mock("@ui/state/chaindata", () => {
  const { EMPTY } = require("rxjs")
  return {
    useToken: vi.fn(() => null),
    getNetworksMapById$: vi.fn(() => EMPTY),
    getTokensMap$: vi.fn(() => EMPTY),
  }
})

// ── Import after mocks ────────────────────────────────────────────

import { useSwapContextProvider } from "../SwapProvider.internal"
import type { BaseQuote } from "../swap-modules/common.swap-module"

// ── Tests ─────────────────────────────────────────────────────────

describe("useSwapContextProvider stateInit initialization", () => {
  beforeEach(() => {
    mockFromAssetIds = []
    mockToAssetIds = []
  })

  it("initializes fromTokenId from stateInit.fromTokenId when fromAssetIds loads", () => {
    mockFromAssetIds = ["1:native:eth", "137:native:matic"]

    const { result } = renderHook(() =>
      useSwapContextProvider({ stateInit: { entry: "dashboard", fromTokenId: "1:native:eth" } })
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

  it("waits for toAssetIds to load before initializing", () => {
    // Start with empty toAssetIds
    mockToAssetIds = []

    const { result, rerender } = renderHook(() =>
      useSwapContextProvider({ stateInit: { entry: "dashboard", toTokenId: "8453:erc20:0xseek" } })
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
      useSwapContextProvider({ stateInit: { entry: "dashboard", toTokenId: "nonexistent:token" } })
    )

    expect(result.current.toTokenId).toBeNull()
  })
})

describe("useSwapContextProvider isInitializing", () => {
  beforeEach(() => {
    mockFromAssetIds = undefined
    mockToAssetIds = undefined
  })

  it("is true when stateInit.fromTokenId is set but fromAssetIds has not loaded", () => {
    const { result } = renderHook(() =>
      useSwapContextProvider({ stateInit: { entry: "dashboard", fromTokenId: "1:native:eth" } })
    )

    expect(result.current.isInitializing).toBe(true)
  })

  it("becomes false once toAssetIds loads and toTokenId is set", () => {
    const { result, rerender } = renderHook(() =>
      useSwapContextProvider({ stateInit: { entry: "dashboard", toTokenId: "8453:erc20:0xseek" } })
    )

    expect(result.current.isInitializing).toBe(true)

    mockToAssetIds = ["8453:erc20:0xseek"]
    rerender()

    expect(result.current.isInitializing).toBe(false)
    expect(result.current.toTokenId).toBe("8453:erc20:0xseek")
  })

  it("becomes false when assets load even if token not found", () => {
    const { result, rerender } = renderHook(() =>
      useSwapContextProvider({ stateInit: { entry: "dashboard", toTokenId: "nonexistent:token" } })
    )

    expect(result.current.isInitializing).toBe(true)

    mockToAssetIds = ["1:native:eth"]
    rerender()

    // toAssetIds loaded (not undefined), so isInitializing becomes false
    expect(result.current.isInitializing).toBe(false)
    expect(result.current.toTokenId).toBeNull()
  })

  it("is false when stateInit has no token IDs", () => {
    const { result } = renderHook(() =>
      useSwapContextProvider({ stateInit: { entry: "dashboard", fromAddress: "0x1234" } })
    )

    expect(result.current.isInitializing).toBe(false)
  })
})

describe("useSwapContextProvider isQuotePicked", () => {
  const lifi = { protocol: "lifi", subProtocol: "uniswap" } as BaseQuote

  it("holds while the quote the user picked stays selected", () => {
    const { result } = renderHook(() => useSwapContextProvider({ stateInit: null }))

    act(() => result.current.pickQuote(lifi))

    expect(result.current.isQuotePicked).toBe(true)
  })

  it("drops once the wallet selects a quote, even the one the user picked before", () => {
    const { result } = renderHook(() => useSwapContextProvider({ stateInit: null }))

    act(() => result.current.pickQuote(lifi))
    act(() => result.current.autoSelectQuote(null))
    act(() => result.current.autoSelectQuote(lifi))

    expect(result.current.selectedProtocol).toBe("lifi")
    expect(result.current.isQuotePicked).toBe(false)
  })
})
