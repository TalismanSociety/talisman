import { render } from "@testing-library/react"
import BigNumber from "bignumber.js"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"
import { getAdditionalFeePlanck, SwapOtherFees } from "../components/SwapOtherFees"
import { type QuoteFee, TALISMAN_FEE_NAME } from "../swap-modules/common.swap-module"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (value: string, options?: Record<string, string>) =>
      value.replace(/{{(\w+)}}/g, (_, key: string) => options?.[key] ?? ""),
  }),
}))

vi.mock("@ui/state/chaindata", () => ({
  useToken: (tokenId?: string) =>
    tokenId === "8453:evm-native" || tokenId === "8453:erc20:0xwtao"
      ? { id: tokenId, decimals: 18 }
      : undefined,
}))

vi.mock("@ui/domains/Asset/TokensAndFiat", () => ({
  TokensAndFiat: ({ tokenId, planck }: { tokenId: string; planck: string }) => (
    <span data-testid="amount">
      {planck} {tokenId}
    </span>
  ),
}))

vi.mock("@ui/domains/Asset/Fiat", () => ({
  Fiat: ({ amount }: { amount: number }) => <span data-testid="amount">{amount}</span>,
}))

vi.mock("@ui/state/settings", () => ({
  useSelectedCurrency: () => "usd",
}))

vi.mock("@ui/state/tokenRates", () => ({
  useTokenRatesMap: () => ({
    "8453:evm-native": { usd: { price: 2000 } },
    "8453:erc20:0xwtao": { usd: { price: 300 } },
  }),
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

const ccipFee: QuoteFee = {
  name: "Chainlink CCIP Fee",
  tokenId: "8453:evm-native",
  amount: BigNumber("0.00102"),
  additional: true,
}
const gasFee: QuoteFee = {
  name: "Est. Gas Fees",
  tokenId: "8453:evm-native",
  amount: BigNumber("0.000001"),
}
const talismanFee: QuoteFee = {
  name: TALISMAN_FEE_NAME,
  tokenId: "8453:evm-native",
  amount: BigNumber("0.003"),
}

const getTotal = (container: HTMLElement) =>
  [...container.querySelectorAll('[data-testid="amount"]')].find(
    (amount) => !amount.closest('[data-testid="tooltip"]')
  )?.textContent

const getBreakdown = (container: HTMLElement) =>
  [...container.querySelectorAll('[data-testid="tooltip"] > div > div')].map(
    (row) => row.textContent
  )

describe("SwapOtherFees", () => {
  it("renders nothing without additional or talisman fees", () => {
    const { container } = render(<SwapOtherFees fees={[gasFee]} isLoading={false} />)

    expect(container.innerHTML).toBe("")
  })

  it("renders nothing for a zero talisman fee", () => {
    const { container } = render(
      <SwapOtherFees fees={[{ ...talismanFee, amount: BigNumber(0) }]} isLoading={false} />
    )

    expect(container.innerHTML).toBe("")
  })

  it("totals the additional and talisman fees in one row, gas excluded", () => {
    const { container, getAllByText } = render(
      <SwapOtherFees fees={[talismanFee, ccipFee, gasFee]} isLoading={false} />
    )

    expect(getAllByText("Other Fees")).toHaveLength(1)
    expect(getTotal(container)).toBe("4020000000000000 8453:evm-native")
  })

  it("breaks the fees down in the tooltip, gas excluded", () => {
    const { container } = render(
      <SwapOtherFees fees={[ccipFee, talismanFee, gasFee]} isLoading={false} />
    )

    expect(getBreakdown(container)).toEqual([
      "Chainlink CCIP Fee:1020000000000000 8453:evm-native",
      "Talisman Fee:3000000000000000 8453:evm-native",
    ])
  })

  it("totals in fiat and breaks down per token when the fees are in different tokens", () => {
    const { container } = render(
      <SwapOtherFees
        fees={[{ ...talismanFee, tokenId: "8453:erc20:0xwtao", amount: BigNumber("2") }, ccipFee]}
        isLoading={false}
      />
    )

    expect(getTotal(container)).toBe("602.04")
    expect(getBreakdown(container)).toEqual([
      "Talisman Fee:2000000000000000000 8453:erc20:0xwtao",
      "Chainlink CCIP Fee:1020000000000000 8453:evm-native",
    ])
  })

  it("shows a skeleton while the exchange is loading", () => {
    const { container, getByTestId } = render(<SwapOtherFees fees={[ccipFee]} isLoading={true} />)

    expect(getByTestId("skeleton")).toBeTruthy()
    expect(getTotal(container)).toBeUndefined()
  })

  it("keeps the row when the fee token is unknown", () => {
    const { getAllByText, getByText } = render(
      <SwapOtherFees fees={[{ ...ccipFee, tokenId: "1:erc20:0xunknown" }]} isLoading={false} />
    )

    expect(getByText("Other Fees")).toBeTruthy()
    expect(getAllByText("Unknown token")).toHaveLength(2)
  })
})

describe("getAdditionalFeePlanck", () => {
  it("sums the additional fees charged in the given token", () => {
    const otherToken: QuoteFee = { ...ccipFee, tokenId: "1:evm-native", amount: BigNumber("1") }
    const relayerFee: QuoteFee = { ...ccipFee, name: "Relayer Fee", amount: BigNumber("0.00001") }

    expect(
      getAdditionalFeePlanck([ccipFee, gasFee, otherToken, relayerFee], "8453:evm-native", 18)
    ).toBe(1_030_000_000_000_000n)
  })

  it("is zero without additional fees", () => {
    expect(getAdditionalFeePlanck([gasFee], "8453:evm-native", 18)).toBe(0n)
  })

  it("rounds a fee below one planck up", () => {
    expect(
      getAdditionalFeePlanck([{ ...ccipFee, amount: BigNumber("0.0000001") }], "8453:evm-native", 6)
    ).toBe(1n)
  })
})
