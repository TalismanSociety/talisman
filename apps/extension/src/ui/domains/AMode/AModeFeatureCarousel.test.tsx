import { act, render, screen } from "@testing-library/react"
import type { FC } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { AModeFeatureCarousel } from "./AModeFeatureCarousel"
import type { AModeFeatureCard } from "./useAModeFeatureCards"

const Icon: FC = () => null
const CARDS: AModeFeatureCard[] = ["earn", "swap", "buy-sell"].map((id) => ({
  shortcut: { id, label: id, icon: Icon, onClick: vi.fn() },
  copy: `${id} copy`,
}))

const stubReducedMotion = (reduce: boolean) =>
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: reduce && query.includes("prefers-reduced-motion"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }))
  )

const currentCard = () => screen.getByTestId("a-mode-carousel-card").getAttribute("data-card")

describe("AModeFeatureCarousel", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it("advances to the next card on its own", () => {
    stubReducedMotion(false)
    render(<AModeFeatureCarousel cards={CARDS} />)
    expect(currentCard()).toBe("earn")

    act(() => vi.advanceTimersByTime(10_000))

    expect(currentCard()).toBe("swap")
  })

  it("stays put when the user prefers reduced motion", () => {
    stubReducedMotion(true)
    render(<AModeFeatureCarousel cards={CARDS} />)

    act(() => vi.advanceTimersByTime(30_000))

    expect(currentCard()).toBe("earn")
  })

  it("runs the card's shortcut from its button", () => {
    stubReducedMotion(true)
    render(<AModeFeatureCarousel cards={CARDS} />)

    act(() => screen.getByTestId("a-mode-carousel-action").click())

    expect(CARDS[0].shortcut.onClick).toHaveBeenCalled()
  })
})
