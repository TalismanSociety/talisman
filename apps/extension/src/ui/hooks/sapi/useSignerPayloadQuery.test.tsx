import type { SignerPayloadJSON } from "@core/types/pjsInterop"
import type { ScaleApi } from "@talismn/sapi"
import { keepPreviousData, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  getPayloadRefreshIntervalMs,
  isPayloadExpired,
  useSignerPayloadQuery,
} from "./useSignerPayloadQuery"

const sapiWithBlockTime = (blockTimeMs: number) =>
  ({ id: `sapi-${blockTimeMs}`, getConstant: () => BigInt(blockTimeMs / 2) }) as unknown as ScaleApi

const buildPayload = (method: string) => ({ payload: { method } as SignerPayloadJSON })
type BuiltPayload = ReturnType<typeof buildPayload>

describe("getPayloadRefreshIntervalMs", () => {
  it("rebuilds every quarter of the 64-block era", () => {
    expect(getPayloadRefreshIntervalMs(12_000)).toBe(16 * 12_000)
    expect(getPayloadRefreshIntervalMs(250)).toBe(4_000)
  })
})

describe("isPayloadExpired", () => {
  it("expires a payload older than half of the 64-block era", () => {
    expect(isPayloadExpired(0, 6_000, 32 * 6_000)).toBe(false)
    expect(isPayloadExpired(0, 6_000, 32 * 6_000 + 1)).toBe(true)
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
