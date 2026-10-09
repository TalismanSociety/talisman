import { log } from "@common/log"
import type { ActiveNetworks } from "@core/domains/chaindata/store.activeNetworks"
import type { ActiveTokens } from "@core/domains/chaindata/store.activeTokens"
import type { Network, Token } from "@talismn/chaindata-provider"
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useTokenActivationToggle } from "../useTokenActivationToggle"

const NETWORK = {
  id: "8453",
  platform: "ethereum",
  name: "Base",
  isDefault: false,
  isTestnet: false,
} as Network

const TOKEN = {
  id: "8453:evm-erc20:0x1111111111111111111111111111111111111111",
  type: "evm-erc20",
  networkId: NETWORK.id,
  symbol: "ABC",
  decimals: 18,
  isDefault: false,
} as Token

const state = vi.hoisted(() => ({
  activeNetworks: {} as ActiveNetworks,
  activeTokens: {} as ActiveTokens,
}))
const stored = vi.hoisted(() => ({
  activeNetworks: {} as Record<string, boolean>,
  activeTokens: {} as Record<string, boolean>,
}))
const fakeStore = vi.hoisted(() => (key: "activeNetworks" | "activeTokens") => ({
  setActive: vi.fn(async (id: string, active: boolean) => {
    stored[key] = { ...stored[key], [id]: active }
  }),
  resetActive: vi.fn(async (id: string) => {
    const { [id]: _, ...rest } = stored[key]
    stored[key] = rest
  }),
}))
const networksStore = vi.hoisted(() => fakeStore("activeNetworks"))
const tokensStore = vi.hoisted(() => fakeStore("activeTokens"))
const mockTrack = vi.hoisted(() => vi.fn())
const mockReportError = vi.hoisted(() => vi.fn())

vi.mock("@ui/state/chaindata", () => ({
  useNetworkById: () => NETWORK,
  useActiveNetworksState: () => state.activeNetworks,
  useActiveTokensState: () => state.activeTokens,
}))

vi.mock("@core/domains/chaindata/store.activeNetworks", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@core/domains/chaindata/store.activeNetworks")>()),
  activeNetworksStore: networksStore,
}))

vi.mock("@core/domains/chaindata/store.activeTokens", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@core/domains/chaindata/store.activeTokens")>()),
  activeTokensStore: tokensStore,
}))

vi.mock("@ui/api/track", () => ({ track: mockTrack }))
vi.mock("@ui/api/errorReporting", () => ({ reportError: mockReportError }))

const seed = (overrides: { activeNetworks?: ActiveNetworks; activeTokens?: ActiveTokens }) => {
  stored.activeNetworks = { ...overrides.activeNetworks }
  stored.activeTokens = { ...overrides.activeTokens }
  state.activeNetworks = { ...stored.activeNetworks }
  state.activeTokens = { ...stored.activeTokens }
}

const renderToggle = () => {
  const view = renderHook(() => useTokenActivationToggle(TOKEN))
  return {
    toggle: () => view.result.current,
    click: (checked: boolean) => act(async () => view.result.current.onChange(checked)),
    applyStoreWrites: () => {
      state.activeNetworks = { ...stored.activeNetworks }
      state.activeTokens = { ...stored.activeTokens }
      view.rerender()
    },
  }
}

const trackedToggles = () =>
  mockTrack.mock.calls.map(([event, props]) => [event, props.enabled, props.source])

beforeEach(() => {
  vi.useFakeTimers()
  seed({})
  for (const store of [networksStore, tokensStore]) {
    store.setActive.mockClear()
    store.resetActive.mockClear()
  }
  mockTrack.mockReset()
  mockReportError.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("useTokenActivationToggle", () => {
  it("shows a toggle, off, for an inactive token", () => {
    const { toggle } = renderToggle()

    expect(toggle()).toMatchObject({ showToggle: true, checked: false })
  })

  it("enables the network and the token when both are off", async () => {
    const { click } = renderToggle()

    await click(true)

    expect(networksStore.setActive.mock.calls).toEqual([[NETWORK.id, true]])
    expect(tokensStore.setActive.mock.calls).toEqual([[TOKEN.id, true]])
    expect(trackedToggles()).toEqual([
      ["network_toggled", true, "token_picker"],
      ["token_toggled", true, "token_picker"],
    ])
  })

  it("leaves the token flag untouched when only the network is off", async () => {
    seed({ activeTokens: { [TOKEN.id]: true } })
    const { click } = renderToggle()

    await click(true)

    expect(networksStore.setActive.mock.calls).toEqual([[NETWORK.id, true]])
    expect(tokensStore.setActive).not.toHaveBeenCalled()
    expect(trackedToggles()).toEqual([["network_toggled", true, "token_picker"]])
  })

  it("clears the token override it added when switched off within the hold window", async () => {
    seed({ activeNetworks: { [NETWORK.id]: true } })
    const { toggle, click, applyStoreWrites } = renderToggle()

    await click(true)
    applyStoreWrites()
    expect(toggle()).toMatchObject({ showToggle: true, checked: true })

    act(() => vi.advanceTimersByTime(500))
    await click(false)

    expect(tokensStore.setActive.mock.calls).toEqual([[TOKEN.id, true]])
    expect(tokensStore.resetActive.mock.calls).toEqual([[TOKEN.id]])
    expect(networksStore.setActive).not.toHaveBeenCalled()
    expect(networksStore.resetActive).not.toHaveBeenCalled()
    expect(stored).toEqual({ activeNetworks: { [NETWORK.id]: true }, activeTokens: {} })
    expect(trackedToggles()).toEqual([
      ["token_toggled", true, "token_picker"],
      ["token_toggled", false, "token_picker"],
    ])

    applyStoreWrites()
    act(() => vi.advanceTimersByTime(5000))
    expect(toggle()).toMatchObject({ showToggle: true, checked: false })
  })

  it("restores a token the user had turned off when switched off within the hold window", async () => {
    seed({ activeNetworks: { [NETWORK.id]: true }, activeTokens: { [TOKEN.id]: false } })
    const { click, applyStoreWrites } = renderToggle()

    await click(true)
    applyStoreWrites()
    await click(false)

    expect(tokensStore.setActive.mock.calls).toEqual([
      [TOKEN.id, true],
      [TOKEN.id, false],
    ])
    expect(tokensStore.resetActive).not.toHaveBeenCalled()
    expect(stored.activeTokens).toEqual({ [TOKEN.id]: false })
  })

  it("clears the network override it added when switched off within the hold window", async () => {
    seed({ activeTokens: { [TOKEN.id]: true } })
    const { click, applyStoreWrites } = renderToggle()

    await click(true)
    applyStoreWrites()
    await click(false)

    expect(networksStore.setActive.mock.calls).toEqual([[NETWORK.id, true]])
    expect(networksStore.resetActive.mock.calls).toEqual([[NETWORK.id]])
    expect(tokensStore.setActive).not.toHaveBeenCalled()
    expect(tokensStore.resetActive).not.toHaveBeenCalled()
    expect(stored).toEqual({ activeNetworks: {}, activeTokens: { [TOKEN.id]: true } })
    expect(trackedToggles()).toEqual([
      ["network_toggled", true, "token_picker"],
      ["network_toggled", false, "token_picker"],
    ])
  })

  it("re-enables from the first click's baseline when the stores lag the switch off", async () => {
    const { toggle, click, applyStoreWrites } = renderToggle()

    await click(true)
    applyStoreWrites()
    await click(false)
    await click(true)

    expect(stored).toEqual({
      activeNetworks: { [NETWORK.id]: true },
      activeTokens: { [TOKEN.id]: true },
    })
    expect(toggle()).toMatchObject({ showToggle: true, checked: true })

    applyStoreWrites()
    act(() => vi.advanceTimersByTime(999))
    expect(toggle()).toMatchObject({ showToggle: true, checked: true })

    act(() => vi.advanceTimersByTime(1))
    expect(toggle().showToggle).toBe(false)
  })

  it("reads checked from the click, before the stores emit", async () => {
    const { toggle, click, applyStoreWrites } = renderToggle()

    await click(true)
    expect(toggle()).toMatchObject({ showToggle: true, checked: true })

    applyStoreWrites()
    await click(false)
    expect(toggle()).toMatchObject({ showToggle: true, checked: false })
  })

  it("hides the toggle 1000ms after the token is enabled", async () => {
    const { toggle, click, applyStoreWrites } = renderToggle()

    await click(true)
    applyStoreWrites()

    act(() => vi.advanceTimersByTime(999))
    expect(toggle().showToggle).toBe(true)

    act(() => vi.advanceTimersByTime(1))
    expect(toggle().showToggle).toBe(false)
  })

  it("holds the toggle on until the stores catch up, then hides it 1000ms later", async () => {
    const { toggle, click, applyStoreWrites } = renderToggle()

    await click(true)
    act(() => vi.advanceTimersByTime(1500))
    expect(toggle()).toMatchObject({ showToggle: true, checked: true })

    applyStoreWrites()
    act(() => vi.advanceTimersByTime(999))
    expect(toggle()).toMatchObject({ showToggle: true, checked: true })

    act(() => vi.advanceTimersByTime(1))
    expect(toggle().showToggle).toBe(false)
  })

  it("releases the hold 5000ms after the click when the stores never catch up", async () => {
    const { toggle, click } = renderToggle()

    await click(true)
    act(() => vi.advanceTimersByTime(4999))
    expect(toggle()).toMatchObject({ showToggle: true, checked: true })

    act(() => vi.advanceTimersByTime(1))
    expect(toggle()).toMatchObject({ showToggle: true, checked: false })
  })

  it("restarts the hold window on each change", async () => {
    const { toggle, click, applyStoreWrites } = renderToggle()

    await click(true)
    applyStoreWrites()
    act(() => vi.advanceTimersByTime(600))
    await click(false)
    applyStoreWrites()
    await click(true)
    applyStoreWrites()

    act(() => vi.advanceTimersByTime(999))
    expect(toggle().showToggle).toBe(true)

    act(() => vi.advanceTimersByTime(1))
    expect(toggle().showToggle).toBe(false)
  })

  it("logs a failed write, tracks only the writes that landed, and shows the stored state", async () => {
    const error = new Error("storage write failed")
    tokensStore.setActive.mockRejectedValueOnce(error)
    const logError = vi.spyOn(log, "error")
    const { toggle, click } = renderToggle()

    await click(true)

    expect(logError).toHaveBeenCalledOnce()
    expect(mockReportError).toHaveBeenCalledWith(error)
    expect(trackedToggles()).toEqual([["network_toggled", true, "token_picker"]])
    expect(toggle()).toMatchObject({ showToggle: true, checked: false })
  })
})
