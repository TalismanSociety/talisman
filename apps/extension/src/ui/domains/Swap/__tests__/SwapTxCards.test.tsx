import { render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { SwapTxCards } from "../components/SwapTxCard"
import type { SwapTxCardModel, SwapTxStatus } from "../components/swapTxCards"
import type { QuoteLeg } from "../swap-modules/common.swap-module"

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (value: string) => value }) }))
vi.mock("@ui/state/chaindata", () => ({ useToken: () => ({ symbol: "ETH" }) }))
vi.mock("@ui/state/accounts", () => ({ useAccountsMap: () => ({}) }))
vi.mock("@ui/domains/Asset/TokenLogo", () => ({ TokenLogo: () => null }))
vi.mock("@ui/domains/Networks/NetworkLogo", () => ({ NetworkLogo: () => null }))

const leg = { fromTokenId: "1:evm-native", toTokenId: "10:evm-native" }
const legs = [leg, leg] as unknown as QuoteLeg[]

const cards = (approval: SwapTxStatus, swap: SwapTxStatus): SwapTxCardModel[] => [
  { key: "approval-0", kind: "approval", leg: 0, status: approval },
  { key: "leg-0", kind: "leg", leg: 0, status: swap },
]

const swapOnly: SwapTxCardModel[] = [{ key: "leg-0", kind: "leg", leg: 0, status: "ready" }]

const renderCards = (models: SwapTxCardModel[]) => (
  <SwapTxCards cards={models} legs={legs} renderBody={(card) => <p>{`body ${card.key}`}</p>} />
)

const scrolled = vi.fn()

describe("SwapTxCards", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = function (this: Element) {
      scrolled(this.textContent)
    }
  })
  afterEach(() => scrolled.mockReset())

  it("scrolls to the next transaction when the one before it completes", () => {
    const { rerender } = render(renderCards(cards("ready", "upcoming")))
    expect(scrolled).not.toHaveBeenCalled()

    rerender(renderCards(cards("done", "ready")))

    expect(screen.getByText("body leg-0")).toBeTruthy()
    expect(screen.queryByText("body approval-0")).toBeNull()
    expect(scrolled).toHaveBeenCalledOnce()
    expect(scrolled.mock.calls[0][0]).toContain("body leg-0")
  })

  it("scrolls to the next transaction when it is queued for a moment before it opens", () => {
    const twoLegs = (first: SwapTxStatus, approval: SwapTxStatus): SwapTxCardModel[] => [
      { key: "leg-0", kind: "leg", leg: 0, status: first },
      { key: "approval-1", kind: "approval", leg: 1, status: approval },
      { key: "leg-1", kind: "leg", leg: 1, status: "upcoming" },
    ]
    const { rerender } = render(renderCards(twoLegs("pending", "upcoming")))
    rerender(renderCards(twoLegs("done", "upcoming")))
    rerender(renderCards(twoLegs("done", "ready")))

    expect(scrolled).toHaveBeenCalledOnce()
    expect(scrolled.mock.calls[0][0]).toContain("body approval-1")
  })

  it("stays put when a late allowance read puts an approval before the open transaction", () => {
    const { rerender } = render(renderCards(swapOnly))
    rerender(renderCards(cards("ready", "upcoming")))

    expect(screen.getByText("body approval-0")).toBeTruthy()
    expect(scrolled).not.toHaveBeenCalled()
  })

  it("stays put while the same transaction moves through its states", () => {
    const { rerender } = render(renderCards(cards("ready", "upcoming")))
    rerender(renderCards(cards("signing", "upcoming")))
    rerender(renderCards(cards("pending", "upcoming")))

    expect(scrolled).not.toHaveBeenCalled()
  })

  it("hides the step number when the plan has a single transaction", () => {
    render(renderCards(swapOnly))

    expect(screen.getByText("body leg-0")).toBeTruthy()
    expect(screen.queryByText("1")).toBeNull()
  })

  it("numbers each transaction when one leg needs an approval and a swap", () => {
    render(renderCards(cards("ready", "upcoming")))

    expect(screen.getByText("1")).toBeTruthy()
    expect(screen.getByText("2")).toBeTruthy()
  })

  it("shows the step numbers once a late allowance read grows the plan to two transactions", () => {
    const { rerender } = render(renderCards(swapOnly))
    expect(screen.queryByText("1")).toBeNull()

    rerender(renderCards(cards("ready", "upcoming")))

    expect(screen.getByText("1")).toBeTruthy()
    expect(screen.getByText("2")).toBeTruthy()
  })
})
