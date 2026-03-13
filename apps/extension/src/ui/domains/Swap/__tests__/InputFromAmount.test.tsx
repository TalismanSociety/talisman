import { tokensToPlanck } from "@talismn/util"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const setFromAmount = vi.fn()
const useSwapMock = vi.fn()

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (value: string) => value }),
}))

vi.mock("../SwapProvider", () => ({
  useSwap: () => useSwapMock(),
}))

vi.mock("@ui/state/chaindata", () => ({
  useToken: vi.fn(() => ({ decimals: 18, symbol: "ETH" })),
}))

vi.mock("@ui/state/settings", () => ({
  useSelectedCurrency: () => "USD",
}))

vi.mock("@ui/state/tokenRates", () => ({
  useTokenRates: () => ({ USD: { price: 2_000 } }),
}))

// eslint-disable-next-line import/first
import { InputFromAmount } from "../components/InputFromAmount"

describe("InputFromAmount", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setFromAmount.mockReset()
    useSwapMock.mockReturnValue({
      fromBalance: null,
      fromTokenId: "1:native:eth",
      fromAmount: null,
      setFromAmount,
    })
  })

  afterEach(async () => {
    await vi.runOnlyPendingTimersAsync()
    vi.useRealTimers()
  })

  it("debounces swap amount updates while the user is typing", async () => {
    render(<InputFromAmount />)
    setFromAmount.mockClear()

    const input = screen.getByLabelText("Amount to swap")

    fireEvent.change(input, { target: { value: "1" } })
    fireEvent.change(input, { target: { value: "1.2" } })
    fireEvent.change(input, { target: { value: "1.23" } })

    expect(setFromAmount).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(299)
    })

    expect(setFromAmount).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })

    expect(setFromAmount).toHaveBeenCalledTimes(1)
    expect(setFromAmount).toHaveBeenCalledWith(BigInt(tokensToPlanck("1.23", 18) ?? "0"))
  })

  it("clears the swap amount immediately when the input is emptied", async () => {
    render(<InputFromAmount />)
    setFromAmount.mockClear()

    const input = screen.getByLabelText("Amount to swap")

    fireEvent.change(input, { target: { value: "1" } })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })

    setFromAmount.mockClear()

    fireEvent.change(input, { target: { value: "" } })

    expect(setFromAmount).toHaveBeenCalledTimes(1)
    expect(setFromAmount).toHaveBeenCalledWith(null)
  })

  it("still shows insufficient balance immediately for the typed amount", () => {
    useSwapMock.mockReturnValue({
      fromBalance: {
        transferable: { planck: BigInt(tokensToPlanck("1", 18) ?? "0") },
      },
      fromTokenId: "1:native:eth",
      fromAmount: null,
      setFromAmount,
    })

    render(<InputFromAmount />)
    setFromAmount.mockClear()

    const input = screen.getByLabelText("Amount to swap")

    fireEvent.change(input, { target: { value: "2" } })

    expect(screen.getByRole("alert").textContent).toContain("Insufficient balance")
    expect(setFromAmount).not.toHaveBeenCalled()
  })

  it("reflects provider-driven amount updates in token mode", async () => {
    const swapState = {
      fromBalance: null,
      fromTokenId: "1:native:eth",
      fromAmount: null as bigint | null,
      setFromAmount,
    }
    useSwapMock.mockImplementation(() => swapState)

    const { rerender } = render(<InputFromAmount />)
    const input = screen.getByLabelText("Amount to swap") as HTMLInputElement

    expect(input.value).toBe("")

    setFromAmount.mockClear()
    swapState.fromAmount = BigInt(tokensToPlanck("2.5", 18) ?? "0")
    rerender(<InputFromAmount />)

    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })

    expect((screen.getByLabelText("Amount to swap") as HTMLInputElement).value).toBe("2.5")
    expect(setFromAmount).not.toHaveBeenCalled()
  })

  it("keeps fiat mode and shows equivalent value for provider-driven amount updates", async () => {
    const swapState = {
      fromBalance: null,
      fromTokenId: "1:native:eth",
      fromAmount: null as bigint | null,
      setFromAmount,
    }
    useSwapMock.mockImplementation(() => swapState)

    const { rerender } = render(<InputFromAmount />)
    const input = screen.getByLabelText("Amount to swap") as HTMLInputElement

    fireEvent.click(screen.getByRole("button"))
    expect(input.value).toBe("")

    setFromAmount.mockClear()
    swapState.fromAmount = BigInt(tokensToPlanck("1", 18) ?? "0")
    rerender(<InputFromAmount />)

    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })

    expect((screen.getByLabelText("Amount to swap") as HTMLInputElement).value).toBe("2000.00")
    expect(setFromAmount).not.toHaveBeenCalled()
  })
})
