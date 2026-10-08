import { act, renderHook } from "@testing-library/react"
import { useState } from "react"
import { describe, expect, it } from "vitest"

import { useAmountField } from "./useAmountField"

const parseAt = (price: number | null) => (text: string) =>
  price && text.trim() ? BigInt(Math.round(Number(text) * price)) : null

const renderField = (initialPrice: number | null) =>
  renderHook(
    ({ price, formattedAmount }) => {
      const [amount, setAmount] = useState<bigint | null>(null)
      const parse = useState(() => parseAt(price))[0]
      const field = useAmountField(amount, formattedAmount, parse, setAmount)
      return { amount, setAmount, text: field[0], onTextChange: field[1] }
    },
    { initialProps: { price: initialPrice, formattedAmount: "" } }
  )

describe("useAmountField", () => {
  it("converts typing again after the field was cleared", () => {
    const { result } = renderField(10)
    act(() => result.current.onTextChange("1"))
    act(() => result.current.onTextChange(""))
    act(() => result.current.onTextChange("5"))
    expect(result.current.amount).toBe(50n)
  })

  it("keeps the typed text when the formatted amount changes", () => {
    const { result, rerender } = renderField(10)
    act(() => result.current.onTextChange("5"))
    rerender({ price: 10, formattedAmount: "4.98" })
    expect(result.current.text).toBe("5")
  })

  it("shows an amount set from outside, even after typing the same amount twice", () => {
    const { result, rerender } = renderField(10)
    act(() => result.current.onTextChange("1.5"))
    act(() => result.current.onTextChange("1.50"))
    act(() => result.current.setAmount(990n))
    rerender({ price: 10, formattedAmount: "99" })
    expect(result.current.text).toBe("99")
  })

  it("gives back the outside amount when its text is typed again", () => {
    const { result, rerender } = renderField(10)
    act(() => result.current.setAmount(1_001n))
    rerender({ price: 10, formattedAmount: "100" })
    act(() => result.current.onTextChange("10"))
    act(() => result.current.onTextChange("100"))
    expect(result.current.amount).toBe(1_001n)
  })
})

describe("useAmountField with a price that loads late", () => {
  it("converts the typed text once the price arrives", () => {
    const { result, rerender } = renderHook(
      ({ price }) => {
        const [amount, setAmount] = useState<bigint | null>(null)
        const field = useAmountField(amount, "", parseAt(price), setAmount)
        return { amount, onTextChange: field[1] }
      },
      { initialProps: { price: null as number | null } }
    )
    act(() => result.current.onTextChange("5"))
    expect(result.current.amount).toBeNull()
    rerender({ price: 10 })
    expect(result.current.amount).toBe(50n)
  })
})
