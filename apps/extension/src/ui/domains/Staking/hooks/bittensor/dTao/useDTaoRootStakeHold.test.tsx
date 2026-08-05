import type { Balance } from "@talismn/balances"
import type { ScaleApi } from "@talismn/sapi"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useDTaoRootStakeHoldGate } from "./useDTaoRootStakeHold"

const { getStorageMock } = vi.hoisted(() => ({ getStorageMock: vi.fn() }))

const mockSapi = {
  chainId: "bittensor",
  getStorage: getStorageMock,
  getConstant: () => 6000n,
  chain: {
    metadata: {
      pallets: [
        {
          name: "SubtensorModule",
          storage: { items: [{ name: "RootStakeUnlockInterval" }] },
        },
      ],
    },
  },
} as unknown as ScaleApi

vi.mock("@ui/hooks/sapi/useScaleApi", () => ({
  useScaleApi: () => ({ data: mockSapi }),
}))

const rootBalance = {
  tokenId: "bittensor:substrate-dtao:0:5FValidator",
  networkId: "bittensor",
  address: "5FColdkey",
  toJSON: () => ({ values: [] }),
} as unknown as Balance

const mockNoHoldReads = () =>
  getStorageMock.mockImplementation(async (_pallet: string, entry: string) => {
    if (entry === "Number") return 1000
    if (entry === "RootStakeUnlockInterval") return 100n
    if (entry === "LastColdkeyHotkeyStakeBlock") return null
    throw new Error(`Unexpected storage read: ${entry}`)
  })

describe("useDTaoRootStakeHoldGate", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    getStorageMock.mockReset()
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

  it("blocks until the fresh read succeeds, then opens when there is no hold", async () => {
    mockNoHoldReads()

    const { result } = renderHook(() => useDTaoRootStakeHoldGate(rootBalance), { wrapper })

    expect(result.current.isBlocked).toBe(true)

    await waitFor(() => expect(result.current.isBlocked).toBe(false))
    expect(result.current.message).toBeNull()
  })

  it("blocks when a hold is active", async () => {
    getStorageMock.mockImplementation(async (_pallet: string, entry: string) => {
      if (entry === "Number") return 1000
      if (entry === "RootStakeUnlockInterval") return 100n
      if (entry === "LastColdkeyHotkeyStakeBlock") return 950n
      throw new Error(`Unexpected storage read: ${entry}`)
    })

    const { result } = renderHook(() => useDTaoRootStakeHoldGate(rootBalance), { wrapper })

    await waitFor(() => expect(result.current.message).not.toBeNull())
    expect(result.current.isBlocked).toBe(true)
  })

  it("blocks again when a refetch fails, even though the last no-hold data is retained", async () => {
    mockNoHoldReads()

    const { result } = renderHook(() => useDTaoRootStakeHoldGate(rootBalance), { wrapper })
    await waitFor(() => expect(result.current.isBlocked).toBe(false))

    getStorageMock.mockImplementation(async () => {
      throw new Error("rpc down")
    })
    await queryClient.refetchQueries()

    await waitFor(() => expect(result.current.isBlocked).toBe(true))
    expect(result.current.message).toBeNull()
  })
})
