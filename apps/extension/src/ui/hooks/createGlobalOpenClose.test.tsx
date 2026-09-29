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

  it("changes openKey on each open, even with the same args, and keeps it on close", () => {
    const [useModal] = createGlobalOpenClose<{ id: string }>()
    const { result } = renderHook(() => useModal(), { wrapper })
    const args = { id: "1" }

    act(() => result.current.open(args))
    const firstKey = result.current.openKey

    act(() => result.current.close())
    expect(result.current.openKey).toBe(firstKey)

    act(() => result.current.open(args))
    expect(result.current).toMatchObject({ isOpen: true, args })
    expect(result.current.openKey).not.toBe(firstKey)
  })

  it("changes openKey when reopened while still open", () => {
    const [useModal] = createGlobalOpenClose()
    const { result } = renderHook(() => useModal(), { wrapper })

    act(() => result.current.open())
    const firstKey = result.current.openKey

    act(() => result.current.open())
    expect(result.current.openKey).not.toBe(firstKey)
  })
})
