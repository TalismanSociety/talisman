import type { TokenDto, YieldDto } from "@core/domains/earn/exports"
import { render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

vi.mock("@talismn/icons", () => ({
  InfoIcon: () => <span data-testid="reward-info-icon" />,
}))

vi.mock("@ui/components/Tooltip", () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode; asChild?: boolean }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => (
    <div data-testid="reward-breakdown">{children}</div>
  ),
}))

vi.mock("@ui/domains/Asset/AssetLogo", () => ({
  AssetLogo: ({ url }: { url?: string }) => <span data-testid="asset-logo">{url}</span>,
}))

vi.mock("@ui/domains/Asset/TokenDisplaySymbol", () => ({
  TokenDisplaySymbol: ({ tokenId }: { tokenId: string }) => <span>{tokenId}</span>,
}))

vi.mock("@ui/domains/Asset/TokenLogo", () => ({
  TokenLogo: ({ tokenId }: { tokenId: string }) => <span data-testid="token-logo">{tokenId}</span>,
}))

vi.mock("../hooks/useGetYieldxyzToken", () => ({
  useGetYieldxyzToken: () => ({
    getYieldxyzToken: () => null,
  }),
}))

import { YieldxyzProductYieldDisplay } from "./YieldxyzProductYieldDisplay"

const makeToken = (overrides: Partial<TokenDto>): TokenDto =>
  ({
    symbol: "TKN",
    name: "Token",
    decimals: 18,
    network: "ethereum",
    logoURI: "https://example.com/token.png",
    ...overrides,
  }) as TokenDto

const makeProduct = (components: YieldDto["rewardRate"]["components"]): YieldDto =>
  ({
    rewardRate: {
      total: components.reduce((total, component) => total + component.rate, 0),
      rateType: "APY",
      components,
    },
  }) as YieldDto

describe("YieldxyzProductYieldDisplay", () => {
  it("renders plain yield text for a single reward token", () => {
    render(
      <YieldxyzProductYieldDisplay
        product={makeProduct([
          {
            rate: 0.05,
            rateType: "APY",
            token: makeToken({ symbol: "TKN" }),
            yieldSource: "staking",
          },
        ])}
      />
    )

    expect(screen.getByText("5% APY")).toBeTruthy()
    expect(screen.queryByTestId("reward-info-icon")).toBeNull()
    expect(screen.queryByTestId("reward-breakdown")).toBeNull()
  })

  it("shows a reward breakdown tooltip for multiple reward tokens", () => {
    render(
      <YieldxyzProductYieldDisplay
        product={makeProduct([
          {
            rate: 0.05,
            rateType: "APY",
            token: makeToken({ symbol: "TKN", address: "0x1111" }),
            yieldSource: "staking",
          },
          {
            rate: 0.03,
            rateType: "APY",
            token: makeToken({ symbol: "BONUS", address: "0x2222" }),
            yieldSource: "protocol_incentive",
          },
        ])}
      />
    )

    expect(screen.getByTestId("reward-info-icon")).toBeTruthy()
    expect(screen.getByTestId("reward-breakdown")).toBeTruthy()
    expect(screen.getByText("TKN")).toBeTruthy()
    expect(screen.getByText("BONUS")).toBeTruthy()
    expect(screen.getByText("5% APY")).toBeTruthy()
    expect(screen.getByText("3% APY")).toBeTruthy()
  })

  it("does not show a tooltip for multiple components of the same reward token", () => {
    render(
      <YieldxyzProductYieldDisplay
        product={makeProduct([
          {
            rate: 0.05,
            rateType: "APY",
            token: makeToken({ symbol: "TKN", address: "0x1111" }),
            yieldSource: "staking",
          },
          {
            rate: 0.03,
            rateType: "APY",
            token: makeToken({ symbol: "TKN", address: "0x1111" }),
            yieldSource: "protocol_incentive",
          },
        ])}
      />
    )

    expect(screen.getByText("8% APY")).toBeTruthy()
    expect(screen.queryByTestId("reward-info-icon")).toBeNull()
    expect(screen.queryByTestId("reward-breakdown")).toBeNull()
  })
})
