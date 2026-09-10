import { render } from "@testing-library/react"
import BigNumber from "bignumber.js"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"
import { SwapAdditionalFees } from "../components/SwapAdditionalFees"
import type { QuoteFee } from "../swap-modules/common.swap-module"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (value: string) => value }),
}))

vi.mock("@ui/state/chaindata", () => ({
  useToken: (tokenId?: string) =>
    tokenId === "8453:evm-native" ? { id: tokenId, decimals: 18, symbol: "ETH" } : undefined,
}))

vi.mock("@ui/domains/Asset/TokensAndFiat", () => ({
  TokensAndFiat: ({ tokenId, planck }: { tokenId: string; planck: string }) => (
    <span data-testid="amount">
      {planck} {tokenId}
    </span>
  ),
}))

vi.mock("@ui/components/Tooltip", () => ({
  Tooltip: ({ children }: { children: ReactNode }) => children,
  TooltipTrigger: ({ children }: { children: ReactNode }) => children,
  TooltipContent: ({ children }: { children: ReactNode }) => (
    <span data-testid="tooltip">{children}</span>
  ),
}))

vi.mock("@ui/components/Skeleton", () => ({
  Skeleton: () => <span data-testid="skeleton" />,
}))

const bridgeFee: QuoteFee = {
  name: "Bridge Fee",
  tokenId: "8453:evm-native",
  amount: BigNumber("0.00102"),
  additional: true,
}
const gasFee: QuoteFee = {
  name: "Est. Gas Fees",
  tokenId: "8453:evm-native",
  amount: BigNumber("0.000001"),
}

describe("SwapAdditionalFees", () => {
  it("renders nothing without additional fees", () => {
    const { container } = render(<SwapAdditionalFees fees={[gasFee]} isLoading={false} />)

    expect(container.innerHTML).toBe("")
  })

  it("renders one row per additional fee with the provider name in the tooltip", () => {
    const { getAllByText, getByTestId } = render(
      <SwapAdditionalFees fees={[bridgeFee, gasFee]} isLoading={false} />
    )

    expect(getAllByText("Additional Fee")).toHaveLength(1)
    expect(getByTestId("tooltip").textContent).toBe("Bridge Fee")
    expect(getByTestId("amount").textContent).toBe("1020000000000000 8453:evm-native")
  })

  it("shows a skeleton while the exchange is loading", () => {
    const { getByTestId, queryByTestId } = render(
      <SwapAdditionalFees fees={[bridgeFee]} isLoading={true} />
    )

    expect(getByTestId("skeleton")).toBeTruthy()
    expect(queryByTestId("amount")).toBeNull()
  })

  it("keeps the row when the fee token is unknown", () => {
    const { getByText } = render(
      <SwapAdditionalFees
        fees={[{ ...bridgeFee, tokenId: "1:erc20:0xunknown" }]}
        isLoading={false}
      />
    )

    expect(getByText("Additional Fee")).toBeTruthy()
    expect(getByText("Unknown token")).toBeTruthy()
  })
})
