import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { SEARCH_SETTLE_MS, useReportSearch } from "./search"

const tracked = vi.hoisted(() => ({ calls: [] as unknown[][] }))
vi.mock("@ui/api/track", () => ({
  track: (...call: unknown[]) => {
    tracked.calls.push(call)
  },
}))

type Props = { query: string; resultCount: number }

const render = (initialProps: Props) =>
  renderHook(
    ({ query, resultCount }: Props) => useReportSearch("portfolio_tokens", query, resultCount),
    {
      initialProps,
    }
  )

describe("useReportSearch", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    tracked.calls = []
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("sends the search the user settled on, its length and result count, never its text", () => {
    const { rerender } = render({ query: "d", resultCount: 9 })
    act(() => vi.advanceTimersByTime(SEARCH_SETTLE_MS / 2))
    rerender({ query: " DOT ", resultCount: 2 })
    act(() => vi.advanceTimersByTime(SEARCH_SETTLE_MS))

    expect(tracked.calls).toEqual([
      ["search_performed", { surface: "portfolio_tokens", query_length: 3, result_count: 2 }],
    ])
  })

  it("sends a search once per mount, and nothing for an empty one", () => {
    const { rerender } = render({ query: "dot", resultCount: 2 })
    act(() => vi.advanceTimersByTime(SEARCH_SETTLE_MS))
    rerender({ query: "", resultCount: 40 })
    act(() => vi.advanceTimersByTime(SEARCH_SETTLE_MS))
    rerender({ query: "dot", resultCount: 2 })
    act(() => vi.advanceTimersByTime(SEARCH_SETTLE_MS))

    expect(tracked.calls).toHaveLength(1)
  })

  it("sends a search the user left before it settled", () => {
    const { unmount } = render({ query: "ksm", resultCount: 1 })
    unmount()

    expect(tracked.calls).toEqual([
      ["search_performed", { surface: "portfolio_tokens", query_length: 3, result_count: 1 }],
    ])
  })
})
