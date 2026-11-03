import { Subscribe } from "@react-rxjs/core"
import { act, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"

import { useCollapsedEarnGroups } from "./useCollapsedEarnGroups"

const wrapper = ({ children }: { children: ReactNode }) => <Subscribe>{children}</Subscribe>

describe("useCollapsedEarnGroups", () => {
  it("keeps collapsed groups after the list unmounts and mounts again", () => {
    const list = renderHook(() => useCollapsedEarnGroups(), { wrapper })
    act(() => list.result.current.toggleGroup("polkadot"))
    act(() => list.result.current.toggleGroup("kusama"))
    act(() => list.result.current.toggleGroup("kusama"))
    list.unmount()

    const remountedList = renderHook(() => useCollapsedEarnGroups(), { wrapper })

    expect([...remountedList.result.current.collapsedGroups]).toEqual(["polkadot"])

    act(() => remountedList.result.current.setCollapsedGroups([]))
    remountedList.unmount()
  })
})
