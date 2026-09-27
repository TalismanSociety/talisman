import { Subscribe } from "@react-rxjs/core"
import { act, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"

import { createGlobalOpenClose } from "./createGlobalOpenClose"

const wrapper = ({ children }: { children: ReactNode }) => <Subscribe>{children}</Subscribe>

describe("createGlobalOpenClose", () => {
  it("shares state, keeps args while closing and keeps open/close stable", () => {
    const [useModal] = createGlobalOpenClose<{ id: string }>()
    const a = renderHook(() => useModal(), { wrapper })
    const b = renderHook(() => useModal(), { wrapper })
    const { open, close } = a.result.current

    act(() => open({ id: "1" }))
    expect(b.result.current).toMatchObject({ isOpen: true, args: { id: "1" } })

    act(() => close())
    expect(b.result.current).toMatchObject({ isOpen: false, args: { id: "1" } })
    expect(a.result.current.open).toBe(open)
    expect(a.result.current.close).toBe(close)
  })

  it("does not re-render when closing a closed modal", () => {
    const [useModal] = createGlobalOpenClose()
    let renders = 0
    const { result } = renderHook(
      () => {
        renders++
        return useModal()
      },
      { wrapper }
    )
    const before = renders

    act(() => result.current.close())
    expect(renders).toBe(before)
  })
})
