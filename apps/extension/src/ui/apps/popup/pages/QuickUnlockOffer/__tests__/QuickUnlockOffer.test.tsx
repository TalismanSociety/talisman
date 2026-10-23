import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, test, vi } from "vitest"

const mockEnable = vi.fn()
const mockSetHideOffer = vi.fn()
const mockNotify = vi.fn()

vi.mock("@ui/hooks/useEnableQuickUnlock", () => ({ useEnableQuickUnlock: () => mockEnable }))
vi.mock("@ui/state/app", () => ({ useAppState: () => [undefined, mockSetHideOffer] }))
vi.mock("@ui/components/Notifications", () => ({
  notify: (...args: unknown[]) => mockNotify(...args),
}))
const track = vi.hoisted(() => vi.fn())
vi.mock("@ui/api/track", () => ({ track, trackFlowEvent: vi.fn() }))
vi.mock("@ui/theme/logos", () => ({ HandMonoLogo: () => null }))
vi.mock("../../../Layout/PopupLayout", () => ({
  PopupLayout: ({ children }: { children: ReactNode }) => <main id="main">{children}</main>,
  PopupContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))
vi.mock("../../Login", () => ({ LoginScreenBackground: () => null }))

import { QuickUnlockOffer } from "../QuickUnlockOffer"

const renderOffer = async () => {
  const onAnswer = vi.fn()
  render(<QuickUnlockOffer onAnswer={onAnswer} />)
  await screen.findByText("Unlock Talisman faster")
  return onAnswer
}

describe("QuickUnlockOffer", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test("never asks again once the user says no thanks", async () => {
    const onAnswer = await renderOffer()

    fireEvent.click(screen.getByRole("button", { name: "No thanks" }))

    expect(mockSetHideOffer).toHaveBeenCalledWith(true)
    expect(onAnswer).toHaveBeenCalledOnce()
  })

  test("asks again next time when the user dismisses it", async () => {
    const onAnswer = await renderOffer()

    fireEvent.keyDown(window, { key: "Escape" })

    expect(onAnswer).toHaveBeenCalledOnce()
    expect(mockSetHideOffer).not.toHaveBeenCalled()
  })

  test("asks again next time when the user closes it", async () => {
    const onAnswer = await renderOffer()

    fireEvent.click(screen.getByRole("button", { name: "Close" }))

    expect(onAnswer).toHaveBeenCalledOnce()
    expect(mockSetHideOffer).not.toHaveBeenCalled()
  })

  test("cannot be closed while the passkey prompt runs", async () => {
    mockEnable.mockReturnValue(new Promise(() => {}))
    const onAnswer = await renderOffer()

    fireEvent.click(screen.getByRole("button", { name: "Enable" }))
    fireEvent.click(screen.getByRole("button", { name: "Close" }))

    expect(onAnswer).not.toHaveBeenCalled()
  })

  test("continues to the portfolio once quick unlock is on", async () => {
    mockEnable.mockResolvedValue({ status: "enabled" })
    const onAnswer = await renderOffer()

    fireEvent.click(screen.getByRole("button", { name: "Enable" }))

    await waitFor(() => expect(onAnswer).toHaveBeenCalledOnce())
    expect(mockNotify).toHaveBeenCalledWith({ type: "success", title: "Quick unlock is on" })
    expect(mockSetHideOffer).not.toHaveBeenCalled()
  })

  test("stays and explains a failure", async () => {
    mockEnable.mockResolvedValue({
      status: "failed",
      message: "Your device doesn't support it.",
      category: "unsupported",
    })
    const onAnswer = await renderOffer()

    fireEvent.click(screen.getByRole("button", { name: "Enable" }))

    expect(await screen.findByText("Your device doesn't support it.")).toBeDefined()
    expect(onAnswer).not.toHaveBeenCalled()
    await waitFor(() =>
      expect(track).toHaveBeenCalledWith("error_shown", {
        surface: "field",
        error_category: "unsupported",
      })
    )
  })

  test("stays silently when the user cancels the prompt", async () => {
    mockEnable.mockResolvedValue({ status: "cancelled" })
    const onAnswer = await renderOffer()

    fireEvent.click(screen.getByRole("button", { name: "Enable" }))
    await act(async () => {})

    expect(mockEnable).toHaveBeenCalledOnce()
    expect(onAnswer).not.toHaveBeenCalled()
    expect(mockNotify).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Enable" })).toBeDefined()
  })

  test("abandons the passkey prompt when the popup goes away", async () => {
    mockEnable.mockReturnValue(new Promise(() => {}))
    await renderOffer()

    fireEvent.click(screen.getByRole("button", { name: "Enable" }))
    const signal: AbortSignal = mockEnable.mock.calls[0][0]
    expect(signal.aborted).toBe(false)

    window.dispatchEvent(new Event("pagehide"))

    expect(signal.aborted).toBe(true)
  })
})
