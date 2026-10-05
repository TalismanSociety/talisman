import { Subscribe } from "@react-rxjs/core"
import { act, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useSetting } from "./settings"

vi.mock("@core/domains/app/store.settings", async () => {
  const { BehaviorSubject } = await import("rxjs")
  const subject = new BehaviorSubject({ hideBalances: false })
  return {
    settingsStore: {
      observable: subject,
      set: async (values: object) => subject.next({ ...subject.value, ...values }),
    },
  }
})

const tracked = vi.hoisted(() => ({ calls: [] as unknown[][] }))
vi.mock("@ui/api/track", () => ({
  track: (...call: unknown[]) => {
    tracked.calls.push(call)
  },
}))

const wrapper = ({ children }: { children: ReactNode }) => <Subscribe>{children}</Subscribe>

describe("useSetting", () => {
  beforeEach(() => {
    tracked.calls = []
  })

  it("reports what the user changed, under the allow-listed key, once per change", async () => {
    const { result } = renderHook(() => useSetting("hideBalances"), { wrapper })

    await act(() => result.current[1](true))
    await act(() => result.current[1]((hidden) => hidden))

    expect(result.current[0]).toBe(true)
    expect(tracked.calls).toEqual([["setting_changed", { key: "blurBalances", value: true }]])
  })
})
