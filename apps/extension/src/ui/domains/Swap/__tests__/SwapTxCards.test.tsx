import type { QuoteLeg } from "@core/domains/swaps/types"
import { render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { SwapTxCards } from "../components/SwapTxCard"
import type { SwapTxCardModel, SwapTxStatus } from "../components/swapTxCards"

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (value: string) => value }) }))
vi.mock("@ui/state/chaindata", () => ({ useToken: () => ({ symbol: "ETH" }) }))
vi.mock("@ui/state/accounts", () => ({ useAccountsMap: () => ({}) }))
vi.mock("@ui/domains/Asset/TokenLogo", () => ({ TokenLogo: () => null }))
vi.mock("@ui/domains/Networks/NetworkLogo", () => ({ NetworkLogo: () => null }))

const legs = [{ fromTokenId: "1:evm-native", toTokenId: "10:evm-native" }] as unknown as QuoteLeg[]

const cards = (approval: SwapTxStatus, swap: SwapTxStatus): SwapTxCardModel[] => [
  { key: "approval-0", kind: "approval", leg: 0, status: approval },
  { key: "leg-0", kind: "leg", leg: 0, status: swap },
]

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

  it("stays put while the same transaction moves through its states", () => {
    const { rerender } = render(renderCards(cards("ready", "upcoming")))
    rerender(renderCards(cards("signing", "upcoming")))
    rerender(renderCards(cards("pending", "upcoming")))

    expect(scrolled).not.toHaveBeenCalled()
  })
})
