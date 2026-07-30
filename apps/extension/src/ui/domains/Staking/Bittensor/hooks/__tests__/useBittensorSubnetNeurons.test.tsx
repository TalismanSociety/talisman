import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { FC, ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { Metagraph } from "../../utils/subnetNeurons"

// ── Module mocks ──────────────────────────────────────────────────

const metagraphResolvers = new Map<number, (mg: Metagraph) => void>()

const mockGetRuntimeCallValue = vi.fn(
  (_api: string, _method: string, [netuid]: [number]) =>
    new Promise<Metagraph>((resolve) => metagraphResolvers.set(netuid, resolve))
)

vi.mock("@ui/hooks/sapi/useScaleApi", () => ({
  useScaleApi: () => ({
    data: {
      id: "bittensor::v100",
      isApiAvailable: () => true,
      getRuntimeCallValue: mockGetRuntimeCallValue,
    },
    isLoading: false,
    isError: false,
    error: null,
  }),
}))

vi.mock("@ui/state/bittensor", () => ({
  useBittensorValidatorsMap: () => ({ data: {} }),
}))

// eslint-disable-next-line import/first
import { useBittensorSubnetNeurons } from "../useBittensorSubnetNeurons"

// ── Test fixtures ─────────────────────────────────────────────────

const ALICE = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
const BOB = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty"
const CHARLIE = "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y"

const makeMetagraph = (hotkeys: string[]): Metagraph => ({
  num_uids: hotkeys.length,
  owner_hotkey: hotkeys[0],
  hotkeys,
  coldkeys: hotkeys,
  validator_permit: hotkeys.map(() => true),
  alpha_stake: hotkeys.map(() => 100n),
  identities: hotkeys.map(() => undefined),
})

const SUBNET_1_METAGRAPH = makeMetagraph([ALICE, BOB])
const SUBNET_2_METAGRAPH = makeMetagraph([CHARLIE])

const createWrapper = (): FC<{ children: ReactNode }> => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe("useBittensorSubnetNeurons", () => {
  beforeEach(() => {
    metagraphResolvers.clear()
    mockGetRuntimeCallValue.mockClear()
  })

  it("loads the metagraph for a subnet", async () => {
    const { result } = renderHook(({ netuid }) => useBittensorSubnetNeurons("bittensor", netuid), {
      wrapper: createWrapper(),
      initialProps: { netuid: 1 },
    })

    expect(result.current.isLoading).toBe(true)
    expect(result.current.neurons).toEqual([])

    await waitFor(() => expect(metagraphResolvers.has(1)).toBe(true))
    act(() => metagraphResolvers.get(1)?.(SUBNET_1_METAGRAPH))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.neurons.map((n) => n.hotkey)).toEqual([ALICE, BOB])
  })

  it("does not expose the previous subnet's neurons while the next subnet loads", async () => {
    const { result, rerender } = renderHook(
      ({ netuid }) => useBittensorSubnetNeurons("bittensor", netuid),
      { wrapper: createWrapper(), initialProps: { netuid: 1 } }
    )

    await waitFor(() => expect(metagraphResolvers.has(1)).toBe(true))
    act(() => metagraphResolvers.get(1)?.(SUBNET_1_METAGRAPH))
    await waitFor(() => expect(result.current.neurons.length).toBe(2))

    rerender({ netuid: 2 })

    // regression: keepPreviousData used to keep subnet 1's rows selectable here
    expect(result.current.neurons).toEqual([])
    await waitFor(() => expect(result.current.isLoading).toBe(true))

    act(() => metagraphResolvers.get(2)?.(SUBNET_2_METAGRAPH))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.neurons.map((n) => n.hotkey)).toEqual([CHARLIE])
  })
})
