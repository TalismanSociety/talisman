import type { SignerPayloadJSON } from "@core/types/pjsInterop"
import type { ScaleApi } from "@talismn/sapi"
import { keepPreviousData, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  getPayloadExpiresAt,
  getPayloadRefreshIntervalMs,
  useSignerPayloadQuery,
} from "./useSignerPayloadQuery"

const BIRTH_BLOCK = 1_000

const sapiWithBlockTime = (blockTimeMs: number, head = BIRTH_BLOCK) =>
  ({
    id: `sapi-${blockTimeMs}-${head}`,
    getConstant: () => BigInt(blockTimeMs / 2),
    getStorage: async () => head,
  }) as unknown as ScaleApi

const buildPayload = (method: string) => ({
  payload: { method, blockNumber: `0x${BIRTH_BLOCK.toString(16)}` } as SignerPayloadJSON,
})
type BuiltPayload = ReturnType<typeof buildPayload>

describe("getPayloadRefreshIntervalMs", () => {
  it("rebuilds after a quarter of the era left at build time", () => {
    expect(getPayloadRefreshIntervalMs(12_000, 64)).toBe(16 * 12_000)
    expect(getPayloadRefreshIntervalMs(250, 64)).toBe(4_000)
    expect(getPayloadRefreshIntervalMs(6_000, 32)).toBe(8 * 6_000)
  })
})

describe("getPayloadExpiresAt", () => {
  it("expires after half of the era left at build time", () => {
    expect(getPayloadExpiresAt({ builtAt: 0, eraBlocksLeft: 64 }, 6_000)).toBe(32 * 6_000)
    expect(getPayloadExpiresAt({ builtAt: 0, eraBlocksLeft: 32 }, 6_000)).toBe(16 * 6_000)
  })
})

describe("useSignerPayloadQuery", () => {
  let queryClient: QueryClient

  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  })

  afterEach(() => {
    queryClient.clear()
    vi.restoreAllMocks()
  })

  it("withholds a stale payload and reports it as loading until a fresh one lands", async () => {
    const sapi = sapiWithBlockTime(12_000)
    const queryFn = vi.fn(async () => buildPayload("0x01"))
    const { result, rerender } = renderHook(
      () => useSignerPayloadQuery({ sapi, queryKey: ["stale"], queryFn }),
      { wrapper }
    )
    await waitFor(() => expect(result.current.data?.payload.method).toBe("0x01"))
    expect(result.current.isLoading).toBe(false)

    const builtAt = Date.now()
    vi.spyOn(Date, "now").mockReturnValue(builtAt + 33 * 12_000)
    rerender()

    expect(result.current.data).toBeUndefined()
    expect(result.current.isLoading).toBe(true)

    vi.restoreAllMocks()
    rerender()

    expect(result.current.data?.payload.method).toBe("0x01")
  })

  it("shortens the budget by the blocks between the era birth and the head", async () => {
    const sapi = sapiWithBlockTime(12_000, BIRTH_BLOCK + 32)
    const queryFn = vi.fn(async () => buildPayload("0x01"))
    const { result, rerender } = renderHook(
      () => useSignerPayloadQuery({ sapi, queryKey: ["lag"], queryFn }),
      { wrapper }
    )
    await waitFor(() => expect(result.current.data?.payload.method).toBe("0x01"))

    const builtAt = Date.now()
    vi.spyOn(Date, "now").mockReturnValue(builtAt + 17 * 12_000)
    rerender()

    expect(result.current.data).toBeUndefined()
  })

  it("withholds the payload on time when its rebuild stalls", async () => {
    const sapi = sapiWithBlockTime(20)
    const queryFn = vi
      .fn<() => Promise<BuiltPayload>>()
      .mockResolvedValueOnce(buildPayload("0x01"))
      .mockReturnValue(new Promise<BuiltPayload>(() => {}))
    const { result } = renderHook(
      () => useSignerPayloadQuery({ sapi, queryKey: ["stalled"], queryFn }),
      { wrapper }
    )
    await waitFor(() => expect(result.current.data?.payload.method).toBe("0x01"))

    await waitFor(() => expect(result.current.data).toBeUndefined(), { timeout: 2_000 })
    expect(result.current.isLoading).toBe(true)
  })

  it("rebuilds the payload on the block-time interval without a loading state", async () => {
    const sapi = sapiWithBlockTime(20)
    let build = 0
    const queryFn = vi.fn(async () => buildPayload(`0x0${++build}`))
    const { result } = renderHook(
      () => useSignerPayloadQuery({ sapi, queryKey: ["refresh"], queryFn }),
      { wrapper }
    )
    await waitFor(() => expect(result.current.data?.payload.method).toBe("0x01"))

    await waitFor(() => expect(result.current.data?.payload.method).toBe("0x02"))
    expect(result.current.isLoading).toBe(false)
  })

  it("does not poll while there is no payload to keep fresh", async () => {
    const sapi = sapiWithBlockTime(20)
    const queryFn = vi.fn(async () => null)
    renderHook(() => useSignerPayloadQuery({ sapi, queryKey: ["empty"], queryFn }), { wrapper })
    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(1))

    await new Promise((resolve) => setTimeout(resolve, 1_000))

    expect(queryFn).toHaveBeenCalledTimes(1)
  })

  it("ages a placeholder by its own build time", async () => {
    const sapi = sapiWithBlockTime(12_000)
    let resolveNext: (value: BuiltPayload) => void = () => {}
    const { result, rerender } = renderHook(
      ({ method }) =>
        useSignerPayloadQuery({
          sapi,
          queryKey: ["placeholder", method],
          queryFn: () =>
            method === "0x01"
              ? buildPayload(method)
              : new Promise<BuiltPayload>((resolve) => {
                  resolveNext = resolve
                }),
          placeholderData: keepPreviousData,
        }),
      { wrapper, initialProps: { method: "0x01" } }
    )
    await waitFor(() => expect(result.current.data?.payload.method).toBe("0x01"))

    rerender({ method: "0x02" })
    expect(result.current.isPlaceholderData).toBe(true)
    expect(result.current.data?.payload.method).toBe("0x01")

    const builtAt = Date.now()
    vi.spyOn(Date, "now").mockReturnValue(builtAt + 33 * 12_000)
    rerender({ method: "0x02" })
    expect(result.current.data).toBeUndefined()

    vi.restoreAllMocks()
    resolveNext(buildPayload("0x02"))
    await waitFor(() => expect(result.current.data?.payload.method).toBe("0x02"))
    expect(result.current.isPlaceholderData).toBe(false)
  })
})
