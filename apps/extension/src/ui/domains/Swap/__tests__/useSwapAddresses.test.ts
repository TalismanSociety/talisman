import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { SwappableAssetWithDecimals } from "../swap-modules/common.swap-module"

// ── Module mocks ──────────────────────────────────────────────────

const mockUseAccounts = vi.fn()
vi.mock("@ui/state/accounts", () => ({
  useAccounts: (...args: unknown[]) => mockUseAccounts(...args),
}))

const mockUseBalances = vi.fn()
vi.mock("@ui/state/balances", () => ({
  useBalances: () => mockUseBalances(),
}))

vi.mock("@ui/state/chaindata", () => ({
  useNetworkById: vi.fn(() => null),
}))

vi.mock("@core/domains/accounts/helpers", () => ({
  isAccountCompatibleWithNetwork: vi.fn(() => true),
  isAddressCompatibleWithNetwork: vi.fn(() => true),
}))

vi.mock("@core/domains/keyring/exports", () => ({
  isAccountAddressEthereum: vi.fn((a: { address: string }) => a?.address?.startsWith("0x")),
  isAccountAddressSs58: vi.fn(
    (a: { address: string }) => a != null && !a.address?.startsWith("0x")
  ),
  isAccountPlatformEthereum: vi.fn((a: { address: string } | null) => a?.address?.startsWith("0x")),
  isAccountPlatformPolkadot: vi.fn(
    (a: { address: string } | null) => a != null && !a.address?.startsWith("0x")
  ),
}))

vi.mock("@talismn/crypto", () => ({
  isAddressEqual: vi.fn(
    (a: string | undefined, b: string | undefined) => a?.toLowerCase() === b?.toLowerCase()
  ),
}))

// ── Import after mocks ────────────────────────────────────────────

// eslint-disable-next-line import/first
import { useSwapAddresses } from "../hooks/useSwapAddresses"

// ── Test fixtures ─────────────────────────────────────────────────

const ETH_ACCOUNT_A = {
  type: "keypair" as const,
  address: "0xAAA",
  name: "Eth A",
  createdAt: 0,
  isPortfolio: false,
}
const ETH_ACCOUNT_B = {
  type: "keypair" as const,
  address: "0xBBB",
  name: "Eth B",
  createdAt: 0,
  isPortfolio: false,
}
const SUB_ACCOUNT_A = {
  type: "keypair" as const,
  address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  name: "Sub A",
  createdAt: 0,
  isPortfolio: false,
}
const SUB_ACCOUNT_B = {
  type: "keypair" as const,
  address: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
  name: "Sub B",
  createdAt: 0,
  isPortfolio: false,
}

const ALL_ACCOUNTS = [ETH_ACCOUNT_A, ETH_ACCOUNT_B, SUB_ACCOUNT_A, SUB_ACCOUNT_B]

function makeEvmAsset(id = "evm-token"): SwappableAssetWithDecimals {
  return {
    id,
    name: "ETH",
    networkType: "evm",
    chainId: 1,
    symbol: "ETH",
    decimals: 18,
    context: {},
  } as SwappableAssetWithDecimals
}

function makeSubstrateAsset(id = "sub-token"): SwappableAssetWithDecimals {
  return {
    id,
    name: "DOT",
    networkType: "substrate",
    chainId: "polkadot",
    symbol: "DOT",
    decimals: 10,
    context: {},
  } as SwappableAssetWithDecimals
}

function makeBtcAsset(): SwappableAssetWithDecimals {
  return {
    id: "btc-native",
    name: "BTC",
    networkType: "btc",
    chainId: "btc",
    symbol: "BTC",
    decimals: 8,
    context: {},
  } as SwappableAssetWithDecimals
}

/**
 * Creates a mock Balances object.
 * @param balanceMap Maps address → tokenId → transferable planck value
 */
function createMockBalances(balanceMap: Record<string, Record<string, bigint>>) {
  return {
    find: ({ address, tokenId }: { address?: string; tokenId?: string }) => {
      const planck = address && tokenId ? (balanceMap[address]?.[tokenId] ?? undefined) : undefined
      const entry = planck !== undefined ? [{ transferable: { planck } }] : []
      return { each: entry, sorted: entry }
    },
  }
}

// ── Helpers ────────────────────────────────────────────────────────

type HookProps = Parameters<typeof useSwapAddresses>[0]

function defaultProps(
  overrides: Partial<HookProps> & {
    setFromAddress?: ReturnType<typeof vi.fn>
    setToAddress?: ReturnType<typeof vi.fn>
  } = {}
): HookProps {
  return {
    fromAddress: null,
    setFromAddress: overrides.setFromAddress ?? vi.fn(),
    toAddress: null,
    setToAddress: overrides.setToAddress ?? vi.fn(),
    fromAsset: null,
    toAsset: null,
    ...overrides,
  }
}

// ── Tests ──────────────────────────────────────────────────────────

describe("useSwapAddresses — auto-select from address", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAccounts.mockImplementation(() => ALL_ACCOUNTS)
    mockUseBalances.mockReturnValue(createMockBalances({}))
  })

  it("does nothing when fromAsset is null", () => {
    const setFromAddress = vi.fn()
    renderHook(() => useSwapAddresses(defaultProps({ setFromAddress })))
    expect(setFromAddress).not.toHaveBeenCalled()
  })

  it("selects the EVM account with the largest balance", () => {
    mockUseBalances.mockReturnValue(
      createMockBalances({
        "0xAAA": { "evm-token": 100n },
        "0xBBB": { "evm-token": 500n },
      })
    )

    const setFromAddress = vi.fn()
    renderHook(() => useSwapAddresses(defaultProps({ fromAsset: makeEvmAsset(), setFromAddress })))

    expect(setFromAddress).toHaveBeenCalledWith("0xBBB")
  })

  it("selects the Substrate account with the largest balance", () => {
    mockUseBalances.mockReturnValue(
      createMockBalances({
        [SUB_ACCOUNT_A.address]: { "sub-token": 200n },
        [SUB_ACCOUNT_B.address]: { "sub-token": 800n },
      })
    )

    const setFromAddress = vi.fn()
    renderHook(() =>
      useSwapAddresses(defaultProps({ fromAsset: makeSubstrateAsset(), setFromAddress }))
    )

    expect(setFromAddress).toHaveBeenCalledWith(SUB_ACCOUNT_B.address)
  })

  it("falls back to first account when all balances are zero", () => {
    mockUseBalances.mockReturnValue(createMockBalances({}))

    const setFromAddress = vi.fn()
    renderHook(() => useSwapAddresses(defaultProps({ fromAsset: makeEvmAsset(), setFromAddress })))

    // First EVM account is selected (all tied at 0n)
    expect(setFromAddress).toHaveBeenCalledWith("0xAAA")
  })

  it("sets null for BTC assets (no compatible accounts)", () => {
    const setFromAddress = vi.fn()
    renderHook(() => useSwapAddresses(defaultProps({ fromAsset: makeBtcAsset(), setFromAddress })))

    expect(setFromAddress).toHaveBeenCalledWith(null)
  })

  it("does not auto-select after user manually picks an account", () => {
    mockUseBalances.mockReturnValue(
      createMockBalances({
        "0xAAA": { "evm-token": 100n },
        "0xBBB": { "evm-token": 500n },
      })
    )

    const setFromAddress = vi.fn()
    const setToAddress = vi.fn()
    const { result, rerender } = renderHook((props: HookProps) => useSwapAddresses(props), {
      initialProps: defaultProps({
        fromAsset: makeEvmAsset(),
        fromAddress: "0xBBB",
        setFromAddress,
        setToAddress,
      }),
    })

    // User manually selects account A via the returned callback
    act(() => {
      result.current.setFromAddress("0xAAA")
    })

    setFromAddress.mockClear()

    // Change to a different token — auto-select should be suppressed
    rerender(
      defaultProps({
        fromAsset: makeEvmAsset("evm-token-2"),
        fromAddress: "0xAAA",
        setFromAddress,
        setToAddress,
      })
    )

    // Only the raw setFromAddress calls matter (not the ones from setFromAddressWithReset)
    expect(setFromAddress).not.toHaveBeenCalled()
  })

  it("re-enables auto-select after resetFromAddressManuallySet()", () => {
    mockUseBalances.mockReturnValue(
      createMockBalances({
        "0xAAA": { "evm-token": 100n, "evm-token-2": 100n },
        "0xBBB": { "evm-token": 500n, "evm-token-2": 900n },
      })
    )

    const setFromAddress = vi.fn()
    const setToAddress = vi.fn()
    const { result, rerender } = renderHook((props: HookProps) => useSwapAddresses(props), {
      initialProps: defaultProps({
        fromAsset: makeEvmAsset(),
        fromAddress: "0xBBB",
        setFromAddress,
        setToAddress,
      }),
    })

    // User manually selects account A
    act(() => {
      result.current.setFromAddress("0xAAA")
    })

    // Reset the manual flag
    act(() => {
      result.current.resetFromAddressManuallySet()
    })

    setFromAddress.mockClear()

    // Change token — auto-select should now fire again
    rerender(
      defaultProps({
        fromAsset: makeEvmAsset("evm-token-2"),
        fromAddress: "0xAAA",
        setFromAddress,
        setToAddress,
      })
    )

    // Should auto-select 0xBBB (highest balance for evm-token-2)
    expect(setFromAddress).toHaveBeenCalledWith("0xBBB")
  })
})
