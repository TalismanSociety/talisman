import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { FC, ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

// ── Module mocks ──────────────────────────────────────────────────

const mockUseScaleApi = vi.fn()

vi.mock("@ui/hooks/sapi/useScaleApi", () => ({
  useScaleApi: () => mockUseScaleApi(),
}))

// eslint-disable-next-line import/first
import { useBittensorBasketHoldings } from "../useBittensorBasketHoldings"

// ── Test fixtures ─────────────────────────────────────────────────

const HOTKEY = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"

const HOLDINGS = [
  [0, 5000n, 5000n],
  [3, 1n, 3000n],
]

const makeSapi = (
  getRuntimeCallValue: (...args: unknown[]) => Promise<unknown>,
  isApiAvailable: (api: string, method: string) => boolean = () => true
) => ({
  id: "bittensor::v100",
  getRuntimeCallValue,
  isApiAvailable,
})

const createWrapper = (): FC<{ children: ReactNode }> => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

const renderBasketHoldings = (hotkey = HOTKEY) =>
  renderHook(() => useBittensorBasketHoldings("bittensor", hotkey), { wrapper: createWrapper() })

describe("useBittensorBasketHoldings", () => {
  beforeEach(() => {
    mockUseScaleApi.mockReset()
  })

  it("returns the fund holdings from get_validator_basket", async () => {
    const getRuntimeCallValue = vi.fn().mockResolvedValue(HOLDINGS)
    mockUseScaleApi.mockReturnValue({
      data: makeSapi(getRuntimeCallValue),
      isPending: false,
      isError: false,
    })

    const { result } = renderBasketHoldings()

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.isError).toBe(false)
    expect(result.current.data).toEqual(HOLDINGS)
    expect(getRuntimeCallValue).toHaveBeenCalledWith(
      "BetaBasketRuntimeApi",
      "get_validator_basket",
      [HOTKEY]
    )
  })

  it("stays loading while the scale api is pending", () => {
    mockUseScaleApi.mockReturnValue({ data: undefined, isPending: true, isError: false })

    const { result } = renderBasketHoldings()

    expect(result.current.isLoading).toBe(true)
    expect(result.current.isError).toBe(false)
  })

  it("reports an error when the scale api query fails", () => {
    mockUseScaleApi.mockReturnValue({ data: undefined, isPending: false, isError: true })

    const { result } = renderBasketHoldings()

    expect(result.current.isError).toBe(true)
    expect(result.current.isLoading).toBe(false)
  })

  it("reports an error when the scale api resolves without metadata", () => {
    mockUseScaleApi.mockReturnValue({ data: null, isPending: false, isError: false })

    const { result } = renderBasketHoldings()

    expect(result.current.isError).toBe(true)
    expect(result.current.isLoading).toBe(false)
  })

  it("reports an error without calling a runtime that lacks the api", () => {
    const getRuntimeCallValue = vi.fn().mockResolvedValue(HOLDINGS)
    const isApiAvailable = vi.fn().mockReturnValue(false)
    mockUseScaleApi.mockReturnValue({
      data: makeSapi(getRuntimeCallValue, isApiAvailable),
      isPending: false,
      isError: false,
    })

    const { result } = renderBasketHoldings()

    expect(isApiAvailable).toHaveBeenCalledWith("BetaBasketRuntimeApi", "get_validator_basket")
    expect(result.current.isError).toBe(true)
    expect(result.current.isLoading).toBe(false)
    expect(getRuntimeCallValue).not.toHaveBeenCalled()
  })

  it("reports an error when the runtime call fails", async () => {
    mockUseScaleApi.mockReturnValue({
      data: makeSapi(async () => {
        throw new Error("RPC unavailable")
      }),
      isPending: false,
      isError: false,
    })

    const { result } = renderBasketHoldings()

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.isLoading).toBe(false)
  })
})
