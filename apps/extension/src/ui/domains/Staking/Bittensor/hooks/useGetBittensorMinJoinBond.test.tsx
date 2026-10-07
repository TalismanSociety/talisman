import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const getStorageMock = vi.fn()
const getConstantMock = vi.fn()
const useScaleApiMock = vi.fn()

vi.mock("@ui/hooks/sapi/useScaleApi", () => ({
  useScaleApi: (...args: unknown[]) => useScaleApiMock(...args),
}))

import { useGetBittensorMinJoinBond } from "./useGetBittensorMinJoinBond"

describe("useGetBittensorMinJoinBond", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    getStorageMock.mockReset()
    getConstantMock.mockReset()
    useScaleApiMock.mockReset()
    useScaleApiMock.mockReturnValue({
      data: { id: "sapi", getStorage: getStorageMock, getConstant: getConstantMock },
    })
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  })

  afterEach(() => {
    queryClient.clear()
  })

  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  const render = () =>
    renderHook(() => useGetBittensorMinJoinBond({ networkId: "bittensor" }), { wrapper })

  it("is the chain's nominator minimum, not the raw factor (finney spec 473: 0.02 TAO)", async () => {
    getStorageMock.mockResolvedValue(10_000_000n)
    getConstantMock.mockReturnValue(2_000_000n)

    const { result } = render()

    await waitFor(() => expect(result.current.data).toBe(20_000_000n))
    expect(getStorageMock).toHaveBeenCalledWith("SubtensorModule", "NominatorMinRequiredStake", [])
    expect(getConstantMock).toHaveBeenCalledWith("SubtensorModule", "InitialMinStake")
  })

  it("scales with the chain's default min stake", async () => {
    getStorageMock.mockResolvedValue(100_000_000n)
    getConstantMock.mockReturnValue(500_000n)

    const { result } = render()

    await waitFor(() => expect(result.current.data).toBe(50_000_000n))
  })

  it("is null while the storage is unset", async () => {
    getStorageMock.mockResolvedValue(null)
    getConstantMock.mockReturnValue(2_000_000n)

    const { result } = render()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
  })
})
