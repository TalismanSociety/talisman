import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const getStorageMock = vi.fn()
const useScaleApiMock = vi.fn()

vi.mock("@ui/hooks/sapi/useScaleApi", () => ({
  useScaleApi: (...args: unknown[]) => useScaleApiMock(...args),
}))

import { useGetBittensorTransferableBalance } from "./useGetBittensorTransferableBalance"

const ADDRESS = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"

describe("useGetBittensorTransferableBalance", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    getStorageMock.mockReset()
    useScaleApiMock.mockReset()
    useScaleApiMock.mockReturnValue({
      data: { id: "sapi", getStorage: getStorageMock },
    })
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
  })

  afterEach(() => {
    queryClient.clear()
  })

  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it("returns free minus frozen", async () => {
    getStorageMock.mockResolvedValue({ data: { free: 1000n, frozen: 300n } })

    const { result } = renderHook(
      () => useGetBittensorTransferableBalance({ networkId: "bittensor", address: ADDRESS }),
      { wrapper }
    )

    await waitFor(() => expect(result.current.data).toBe(700n))
    expect(getStorageMock).toHaveBeenCalledWith("System", "Account", [ADDRESS])
  })

  it("returns 0n for an account with no storage entry", async () => {
    getStorageMock.mockResolvedValue(null)

    const { result } = renderHook(
      () => useGetBittensorTransferableBalance({ networkId: "bittensor", address: ADDRESS }),
      { wrapper }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe(0n)
  })

  it("floors at 0n when frozen exceeds free", async () => {
    getStorageMock.mockResolvedValue({ data: { free: 100n, frozen: 300n } })

    const { result } = renderHook(
      () => useGetBittensorTransferableBalance({ networkId: "bittensor", address: ADDRESS }),
      { wrapper }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe(0n)
  })

  it("does not query without an address", async () => {
    const { result } = renderHook(
      () => useGetBittensorTransferableBalance({ networkId: "bittensor", address: null }),
      { wrapper }
    )

    expect(result.current.data).toBeUndefined()
    expect(getStorageMock).not.toHaveBeenCalled()
  })
})
