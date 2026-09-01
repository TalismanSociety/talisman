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
import { useBittensorRootWeights } from "../useBittensorRootWeights"

// ── Test fixtures ─────────────────────────────────────────────────

const HOTKEY = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"

// storage keys are faked as "<entry>:<keyArgs>" strings so prefix matching
// and key decoding mirror the real getKeysPaged/queryStorageAt flow
const makeSapi = (storage: Record<string, unknown>) => ({
  id: "bittensor::v100",
  chain: {
    builder: {
      buildStorage: (_pallet: string, entry: string) => ({
        keys: {
          enc: (...args: number[]) => [entry, ...args, ""].join(":"),
          dec: (key: string) => key.split(":").slice(1).map(Number),
        },
        value: { dec: (value: unknown) => value },
      }),
    },
    connector: {
      send: async (method: string, params: unknown[]) => {
        if (method === "state_getKeysPaged") {
          const [prefix] = params as [string]
          return Object.keys(storage).filter((key) => key.startsWith(prefix))
        }
        if (method === "state_queryStorageAt") {
          const [keys] = params as [string[]]
          return [{ changes: keys.map((key) => [key, storage[key]]) }]
        }
        throw new Error(`Unexpected RPC method: ${method}`)
      },
    },
  },
})

const STORAGE = {
  "Keys:0:1": HOTKEY,
  "Weights:0:1": [
    [0, 5000],
    [3, 3000],
    [99, 2000],
  ],
  "NetworksAdded:0": true,
  "NetworksAdded:3": true,
}

const createWrapper = (): FC<{ children: ReactNode }> => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

const renderRootWeights = (hotkey = HOTKEY) =>
  renderHook(() => useBittensorRootWeights("bittensor", hotkey), { wrapper: createWrapper() })

describe("useBittensorRootWeights", () => {
  beforeEach(() => {
    mockUseScaleApi.mockReset()
  })

  it("returns weights filtered to root and existing subnets", async () => {
    mockUseScaleApi.mockReturnValue({ data: makeSapi(STORAGE), isPending: false, isError: false })

    const { result } = renderRootWeights()

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.isError).toBe(false)
    expect(result.current.data).toEqual([
      [0, 5000],
      [3, 3000],
    ])
  })

  it("returns an empty vector for a hotkey without weights", async () => {
    mockUseScaleApi.mockReturnValue({ data: makeSapi(STORAGE), isPending: false, isError: false })

    const { result } = renderRootWeights("some-other-hotkey")

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.isError).toBe(false)
    expect(result.current.data).toEqual([])
  })

  it("stays loading while the scale api is pending", () => {
    mockUseScaleApi.mockReturnValue({ data: undefined, isPending: true, isError: false })

    const { result } = renderRootWeights()

    expect(result.current.isLoading).toBe(true)
    expect(result.current.isError).toBe(false)
  })

  it("reports an error when the scale api query fails", () => {
    mockUseScaleApi.mockReturnValue({ data: undefined, isPending: false, isError: true })

    const { result } = renderRootWeights()

    expect(result.current.isError).toBe(true)
    expect(result.current.isLoading).toBe(false)
  })

  it("reports an error when the scale api resolves without metadata", () => {
    mockUseScaleApi.mockReturnValue({ data: null, isPending: false, isError: false })

    const { result } = renderRootWeights()

    expect(result.current.isError).toBe(true)
    expect(result.current.isLoading).toBe(false)
  })

  it("reports an error when the storage sweep fails", async () => {
    const sapi = makeSapi(STORAGE)
    sapi.chain.connector.send = async () => {
      throw new Error("RPC unavailable")
    }
    mockUseScaleApi.mockReturnValue({ data: sapi, isPending: false, isError: false })

    const { result } = renderRootWeights()

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.isLoading).toBe(false)
  })
})
