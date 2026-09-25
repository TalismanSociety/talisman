import type { ScaleApi } from "@talismn/sapi"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { getRuntimeBlockTimeMs, measureBlockTimeMs, useBlockTimeMs } from "./useBlockTimeMs"

const HEAD = 1_000
const RECENT_HASH = "0xrecent"
const PAST_HASH = "0xpast"

const fakeSapi = ({
  minimumPeriod,
  head = HEAD,
  blockTimeMs = 2_000,
}: {
  minimumPeriod: bigint | Error
  head?: number
  blockTimeMs?: number
}) => {
  const getStorage = vi.fn(async (pallet: string, entry: string, keys: unknown[], at?: string) => {
    if (entry === "Number") return head
    if (entry === "BlockHash") return keys[0] === head - 1 ? RECENT_HASH : PAST_HASH
    if (pallet === "Timestamp" && at === RECENT_HASH) return 1_700_000_000_000n
    if (pallet === "Timestamp" && at === PAST_HASH)
      return 1_700_000_000_000n - BigInt(blockTimeMs * 100)
    throw new Error(`unexpected storage read ${pallet}.${entry}`)
  })
  const sapi = {
    id: "sapi",
    chainId: "chain",
    getConstant: () => {
      if (minimumPeriod instanceof Error) throw minimumPeriod
      return minimumPeriod
    },
    getStorage,
  } as unknown as ScaleApi
  return { sapi, getStorage }
}

describe("getRuntimeBlockTimeMs", () => {
  it("doubles Timestamp.MinimumPeriod", () => {
    expect(getRuntimeBlockTimeMs(fakeSapi({ minimumPeriod: 6_000n }).sapi)).toBe(12_000)
  })

  it("is null when MinimumPeriod is 0", () => {
    expect(getRuntimeBlockTimeMs(fakeSapi({ minimumPeriod: 0n }).sapi)).toBeNull()
  })

  it("is null when the constant is missing", () => {
    expect(getRuntimeBlockTimeMs(fakeSapi({ minimumPeriod: new Error("missing") }).sapi)).toBeNull()
  })
})

describe("measureBlockTimeMs", () => {
  it("averages the timestamps of the last 100 blocks", async () => {
    const { sapi, getStorage } = fakeSapi({ minimumPeriod: 0n, blockTimeMs: 2_300 })

    await expect(measureBlockTimeMs(sapi)).resolves.toBe(2_300)
    expect(getStorage).toHaveBeenCalledWith("System", "BlockHash", [HEAD - 1])
    expect(getStorage).toHaveBeenCalledWith("System", "BlockHash", [HEAD - 101])
  })

  it("throws on a chain younger than the sample", async () => {
    const { sapi } = fakeSapi({ minimumPeriod: 0n, head: 50 })

    await expect(measureBlockTimeMs(sapi)).rejects.toThrow()
  })
})

describe("useBlockTimeMs", () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  afterEach(() => queryClient.clear())

  it("uses the runtime constant without reading storage", () => {
    const { sapi, getStorage } = fakeSapi({ minimumPeriod: 6_000n })

    const { result } = renderHook(() => useBlockTimeMs(sapi), { wrapper })

    expect(result.current).toBe(12_000)
    expect(getStorage).not.toHaveBeenCalled()
  })

  it("measures the block time when the runtime declares none", async () => {
    const { sapi } = fakeSapi({ minimumPeriod: 0n, blockTimeMs: 2_300 })

    const { result } = renderHook(() => useBlockTimeMs(sapi), { wrapper })

    await waitFor(() => expect(result.current).toBe(2_300))
  })

  it("falls back to a short block time when the measurement fails", async () => {
    const { sapi } = fakeSapi({ minimumPeriod: 0n, head: 50 })

    const { result } = renderHook(() => useBlockTimeMs(sapi), { wrapper })

    await waitFor(() => expect(result.current).toBe(1_000))
  })
})
